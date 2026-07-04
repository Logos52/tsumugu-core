#!/usr/bin/env tsx
/**
 * convert-drafts — drafts → prepared-content@2 companion converter.
 *
 *   pnpm companion:convert
 *
 * For every lesson JSON in `mockups/drafts/` (46 files; `_STATUS.json` / any
 * `_*.json` skipped) this:
 *   1. Segments each reading with the pipeline's Node-side segmenter and bakes
 *      the EN + Hán-Việt rails via `populateDualRail`, emitting a valid
 *      `tsumugu/prepared-content@2` document (accepted by `parsePreparedContent`).
 *   2. Resolves the authoritative LessonTarget from the unit id (dangdai CSV +
 *      merged grammar index) and runs the A–H gate (`verifyReading`, invoked
 *      inside `populateDualRail`) on every reading — recording EVERY outcome
 *      (hard failures, could-not-run checks, advisory notes) without relaxing,
 *      skipping, or reinterpreting any threshold, and never crashing the batch.
 *   3. Writes per-reading prepared JSON, a full CatalogEntry[] manifest, a
 *      machine-readable gate report, and a human GATE-REPORT.md summary.
 *
 * Outputs land under `out/companion/`.
 *
 * ── Title rule (deterministic) ────────────────────────────────────────────
 *   `<lesson title from lesson-highlights.json> · <format><CJK ordinal>`
 *   e.g. "Welcome to Taiwan! · 對話一" (R1), "… · 自述二" (R2), "… · 短文三" (R3).
 *   The ordinal is the 1-indexed reading position rendered as 一/二/三…；the
 *   format is the draft reading's `format` field verbatim.
 *
 * ── Kind map (draft `format` → CatalogEntry.kind) ─────────────────────────
 *   對話 → dialogue   問答 → dialogue
 *   自述 → story      短文 → story    日記 → story    比較 → story
 *   報導 → explainer  廣播 → explainer
 *   (fallback → story). ReadingKind has no companion-specific value, so the
 *   eight corpus formats collapse onto story/dialogue/explainer.
 *
 * ── Band / TOCFL clamp (DELIBERATE — flagged in the report) ───────────────
 *   book 1 → A1 / TOCFL 1;  book 2 → A2 / TOCFL 2;  books 3+ → B1 / TOCFL 3.
 *   The app exposes exactly three rungs (A1/A2/B1), so books 3, 4, 5, 6 all
 *   clamp to B1/TOCFL-3. This is lossy above book 3.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CatalogEntry, LessonBinding, ReadingKind } from "../../app/src/catalog/types.js";
import { enrichCatalogEntry } from "../../pipeline/lib/catalogEnrich.js";
import {
  parseCsvRow,
  parseLessonRef,
  resolveLessonTarget,
} from "../accc/lib/lesson-target.js";
import { populateDualRail, type PreparedReading } from "../gen/lib/dualRail.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const DRAFTS_DIR = join(REPO_ROOT, "mockups", "drafts");
const HIGHLIGHTS_PATH = join(REPO_ROOT, "mockups", "lesson-highlights.json");
const VOCAB_CSV = join(REPO_ROOT, "private", "dangdai-vocab", "dangdai.csv");
const OUT_DIR = join(REPO_ROOT, "out", "companion");
const READINGS_OUT = join(OUT_DIR, "readings");
const POLYPHONE_LOG = join(OUT_DIR, "polyphone-candidates.jsonl");

/** Companion manifest row — identical to CatalogEntry but origin is "companion"
 *  (as instructed by the task). NOTE: CatalogEntry.origin is typed "generated"
 *  only; the app's manifest fetch blind-casts JSON so this flows through at
 *  runtime, but it is off the published union — flagged in the report. */
type CompanionEntry = Omit<CatalogEntry, "origin"> & { origin: "companion" };

/** App CorePreparedMeta shape (app/src/catalog/preparedMeta.ts) — distinct from
 *  the dualRail string-shaped `core`; we overwrite the latter with this so the
 *  file is consumable by enrichCatalogEntry / publish:readings. */
interface AppCore {
  band: "A1" | "A2" | "B1";
  tocfl: 1 | 2 | 3;
  kind: ReadingKind;
  newWords: number;
  binding: LessonBinding;
  topic?: string;
}
type AppPrepared = Omit<PreparedReading, "core"> & { core: AppCore };

interface DraftReading {
  id: string;
  format: string;
  text: string;
}
interface HighlightEntry {
  title?: string;
  theme?: string;
}

const KIND_MAP: Record<string, ReadingKind> = {
  對話: "dialogue",
  問答: "dialogue",
  自述: "story",
  短文: "story",
  日記: "story",
  比較: "story",
  報導: "explainer",
  廣播: "explainer",
};
function kindForFormat(format: string): ReadingKind {
  return KIND_MAP[format] ?? "story";
}

/** Expand `X（＝Y）` alternate-form vocab entries (2 in the CSV: 臺灣（＝台灣）,
 *  教部（＝教育部）) into their surface forms — the raw compound never matches
 *  running text, so segmentation needs the split forms. */
function vocabSurfaceForms(entry: string): string[] {
  const m = /^(.+?)（＝(.+?)）$/.exec(entry);
  return m ? [m[1]!, m[2]!] : [entry];
}

const CJK_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
function cjkOrdinal(n: number): string {
  if (n >= 0 && n < CJK_DIGITS.length) return CJK_DIGITS[n]!;
  return String(n);
}

function bandForBook(book: number): { band: "A1" | "A2" | "B1"; tocfl: 1 | 2 | 3 } {
  if (book <= 1) return { band: "A1", tocfl: 1 };
  if (book === 2) return { band: "A2", tocfl: 2 };
  return { band: "B1", tocfl: 3 }; // books 3+ clamp to the top rung
}

/** Load pinyin/meaning lookup + the set of Character-Name proper nouns.
 *  Contract-1: CSV loaders do NOT drop Character-Name rows — the caller must. */
function loadVocab(): { lookup: Map<string, { pinyin?: string; meaning?: string }>; names: Set<string> } {
  const raw = readFileSync(VOCAB_CSV, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const lookup = new Map<string, { pinyin?: string; meaning?: string }>();
  const names = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvRow(lines[i]!);
    if (f.length < 2) continue;
    const trad = (f[1] ?? "").trim();
    if (!trad) continue;
    const pinyin = (f[3] ?? "").trim() || undefined;
    const meaning = (f[5] ?? "").trim() || undefined;
    const tags = (f[8] ?? "").trim();
    for (const form of vocabSurfaceForms(trad)) {
      if (!lookup.has(form)) lookup.set(form, { pinyin, meaning });
    }
    if (/Character Name/i.test(tags)) names.add(trad);
  }
  return { lookup, names };
}

interface ReadingRecord {
  unit: string;
  readingId: string;
  format: string;
  file: string; // catalog path (vault-relative)
  title: string;
  book: number;
  lesson: number;
  gate: {
    pass: boolean;
    reasons: string[];
    achievedLevel: string;
    ciMeasured: number;
    aboveBandTokens: { word: string; band: string }[];
    newTargetRecycle: { word: string; count: number; ok: boolean }[];
    scriptLeaks: { before: string; after: string }[];
    bridgeFailures: { word: string; etymon?: string; reason: string }[];
    polyphoneRisks: { word: string; char: string; reason: string }[];
  };
  polyphoneCount: number;
  inbandCouldRun: boolean;
  error?: string;
}

// Reason-prefix → check bucket for the matrix.
const CHECK_BUCKETS = [
  "prose",
  "newVocab",
  "newGrammar",
  "ci",
  "glossary",
  "script",
  "vi-rail",
  "bridge",
  "polyphone",
  "paragraph",
] as const;
type CheckBucket = (typeof CHECK_BUCKETS)[number];

function bucketOf(reason: string): CheckBucket {
  const colon = reason.indexOf(":");
  const head = colon >= 0 ? reason.slice(0, colon) : reason;
  if (head.startsWith("paragraph[")) return "paragraph";
  return (CHECK_BUCKETS as readonly string[]).includes(head)
    ? (head as CheckBucket)
    : "prose";
}

async function main(): Promise<void> {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(READINGS_OUT, { recursive: true });

  const highlights = JSON.parse(readFileSync(HIGHLIGHTS_PATH, "utf8")) as Record<
    string,
    HighlightEntry
  >;
  const { lookup: vocabLookup, names: characterNames } = loadVocab();

  const unitFiles = readdirSync(DRAFTS_DIR)
    .filter((f) => /^B\d+L\d+\.json$/.test(f))
    .sort();

  const manifest: CompanionEntry[] = [];
  const records: ReadingRecord[] = [];
  const touchedFiles = new Set<string>();

  let converted = 0;
  let errors = 0;

  for (const file of unitFiles) {
    const unit = file.replace(/\.json$/, "");
    const { book, lesson, canonical } = parseLessonRef(unit);
    const draftDoc = JSON.parse(readFileSync(join(DRAFTS_DIR, file), "utf8")) as
      | { readings: DraftReading[] }
      | DraftReading[];
    const readings: DraftReading[] = Array.isArray(draftDoc) ? draftDoc : draftDoc.readings;

    const target = resolveLessonTarget(unit);
    // Contract-1 caller-filter: drop textbook Character-Name proper nouns from the
    // gate's new-vocab target (the companion deliberately never uses the textbook
    // cast — copyright rule). Cumulative is left intact (aids segmentation, harmless).
    const filteredTarget = {
      ...target,
      newVocab: target.newVocab.filter((w) => !characterNames.has(w)),
    };
    // Segmentation lexicon = cumulative + new vocab with alternate-form entries
    // (臺灣（＝台灣）…) expanded to their surface forms.
    const segmentLexicon = new Set(
      [...filteredTarget.cumulativeVocab, ...filteredTarget.newVocab].flatMap(vocabSurfaceForms),
    );

    const hi = highlights[unit] ?? {};
    const lessonTitle = hi.title ?? unit;
    const topic = hi.theme?.trim() || undefined;
    const { band, tocfl } = bandForBook(book);
    const binding: LessonBinding = { textbook: "accc", book, lesson };

    for (let i = 0; i < readings.length; i++) {
      const r = readings[i]!;
      const readingId = (r.id ?? `R${i + 1}`).toLowerCase();
      const format = r.format ?? "";
      const title = `${lessonTitle} · ${format}${cjkOrdinal(i + 1)}`;
      const slug = `${canonical}-${readingId}`;
      const catalogPath = `readings/zh-Hant/${slug}.prepared.json`;
      const outPath = join(READINGS_OUT, `${slug}.prepared.json`);

      const rec: ReadingRecord = {
        unit: canonical,
        readingId,
        format,
        file: catalogPath,
        title,
        book,
        lesson,
        gate: {
          pass: false,
          reasons: [],
          achievedLevel: "",
          ciMeasured: 0,
          aboveBandTokens: [],
          newTargetRecycle: [],
          scriptLeaks: [],
          bridgeFailures: [],
          polyphoneRisks: [],
        },
        polyphoneCount: 0,
        inbandCouldRun: false,
      };

      try {
        const { prepared, polyphones, gateReport } = await populateDualRail({
          draft: r.text,
          lessonTarget: filteredTarget,
          band,
          kind: kindForFormat(format),
          title,
          vocabLookup,
          polyphoneLogPath: POLYPHONE_LOG,
          knownWords: segmentLexicon,
          // Greedy longest-match against the lesson lexicon — jieba's
          // Simplified-oriented dict over-fragments this Traditional corpus
          // (歡迎→歡|迎, 臺灣→臺|灣), distorting wordCounts/totalWords/ciMeasured.
          segmenter: "greedy",
        });

        // newWords for the app catalog = distinct filtered new-vocab terms that
        // actually surface in THIS reading (per-reading granularity).
        const wordSet = new Set(prepared.tokens.filter((t) => t.isWord).map((t) => t.text));
        const newWordsHere = filteredTarget.newVocab.filter((w) => wordSet.has(w)).length;

        // Overwrite the dualRail string-shaped `core` with the app's
        // CorePreparedMeta shape so the file is consumable by enrichCatalogEntry
        // / publish:readings. fingerprint + acccBinding are kept (extra fields
        // are tolerated by parsePreparedContent).
        const appPrepared: AppPrepared = {
          ...prepared,
          core: {
            band,
            tocfl,
            kind: kindForFormat(format),
            newWords: newWordsHere,
            binding,
            ...(topic ? { topic } : {}),
          },
        };

        writeFileSync(outPath, `${JSON.stringify(appPrepared, null, 2)}\n`, "utf8");
        touchedFiles.add(outPath);

        const base = await enrichCatalogEntry(outPath, catalogPath);
        manifest.push({ ...base, origin: "companion" });

        rec.gate = {
          pass: gateReport.pass,
          reasons: gateReport.reasons,
          achievedLevel: gateReport.achievedLevel,
          ciMeasured: gateReport.ciMeasured,
          aboveBandTokens: gateReport.aboveBandTokens,
          newTargetRecycle: gateReport.newTargetRecycle,
          scriptLeaks: gateReport.scriptLeaks,
          bridgeFailures: gateReport.bridgeFailures,
          polyphoneRisks: gateReport.polyphoneRisks,
        };
        rec.polyphoneCount = polyphones.length;
        rec.inbandCouldRun = !gateReport.reasons.some((x) =>
          x.includes("defLevelIndex not provided"),
        );
        converted++;
      } catch (err) {
        rec.error = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
        rec.gate.reasons = [`conversion-error: ${rec.error.split("\n")[0]}`];
        errors++;
      }

      records.push(rec);
    }
  }

  // Manifest sort: band order → book → lesson → reading id.
  const bandOrder: Record<string, number> = { A1: 0, A2: 1, B1: 2 };
  manifest.sort((a, b) => {
    const ba = bandOrder[a.band] ?? 9;
    const bb = bandOrder[b.band] ?? 9;
    if (ba !== bb) return ba - bb;
    const bkA = a.binding?.book ?? 0;
    const bkB = b.binding?.book ?? 0;
    if (bkA !== bkB) return bkA - bkB;
    const lA = a.binding?.lesson ?? 0;
    const lB = b.binding?.lesson ?? 0;
    if (lA !== lB) return lA - lB;
    return a.path.localeCompare(b.path);
  });

  writeFileSync(join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  touchedFiles.add(join(OUT_DIR, "manifest.json"));

  // ── gate-report.json (per-reading, per-check) ───────────────────────────
  const gateJson = {
    generatedAt: new Date().toISOString(),
    totals: {
      units: unitFiles.length,
      readings: records.length,
      converted,
      conversionErrors: errors,
      gatePass: records.filter((r) => r.gate.pass).length,
      inbandCouldRun: records.filter((r) => r.inbandCouldRun).length,
    },
    readings: records,
  };
  writeFileSync(join(OUT_DIR, "gate-report.json"), `${JSON.stringify(gateJson, null, 2)}\n`, "utf8");
  touchedFiles.add(join(OUT_DIR, "gate-report.json"));

  // ── GATE-REPORT.md summary matrix ───────────────────────────────────────
  const books = [...new Set(records.map((r) => r.book))].sort((a, b) => a - b);
  const bookReadings = (bk: number) => records.filter((r) => r.book === bk);

  // Per book × per check: count readings that emitted ≥1 hard reason in bucket.
  const matrixRows: string[] = [];
  matrixRows.push(`| book | readings | ${CHECK_BUCKETS.join(" | ")} |`);
  matrixRows.push(`| --- | --- | ${CHECK_BUCKETS.map(() => "---").join(" | ")} |`);
  for (const bk of books) {
    const rs = bookReadings(bk);
    const cells = CHECK_BUCKETS.map((bucket) => {
      const n = rs.filter((r) => r.gate.reasons.some((x) => bucketOf(x) === bucket)).length;
      return String(n);
    });
    matrixRows.push(`| B${bk} | ${rs.length} | ${cells.join(" | ")} |`);
  }
  const allCells = CHECK_BUCKETS.map(
    (bucket) => records.filter((r) => r.gate.reasons.some((x) => bucketOf(x) === bucket)).length,
  );
  matrixRows.push(`| **all** | ${records.length} | ${allCells.map((c) => `**${c}**`).join(" | ")} |`);

  const worst = [...records]
    .sort((a, b) => b.gate.reasons.length - a.gate.reasons.length)
    .slice(0, 20);

  // Polyphone log stats.
  let polyRows = 0;
  const polyChars = new Set<string>();
  try {
    const lines = readFileSync(POLYPHONE_LOG, "utf8").trim().split("\n").filter(Boolean);
    polyRows = lines.length;
    for (const ln of lines) {
      try {
        const o = JSON.parse(ln) as { char?: string };
        if (o.char) polyChars.add(o.char);
      } catch {
        /* skip malformed */
      }
    }
    touchedFiles.add(POLYPHONE_LOG);
  } catch {
    /* no polyphone log emitted */
  }

  const md: string[] = [];
  md.push("# Companion conversion — gate report");
  md.push("");
  md.push(`Generated ${gateJson.generatedAt}`);
  md.push("");
  md.push("## Totals");
  md.push("");
  md.push(`- units: ${gateJson.totals.units}`);
  md.push(`- readings: ${gateJson.totals.readings}`);
  md.push(`- converted (prepared@2 emitted): ${gateJson.totals.converted}`);
  md.push(`- conversion errors: ${gateJson.totals.conversionErrors}`);
  md.push(`- gate PASS (0 hard reasons): ${gateJson.totals.gatePass}`);
  md.push(
    `- in-band check could run (defLevelIndex present): ${gateJson.totals.inbandCouldRun} / ${records.length}`,
  );
  md.push("");
  md.push("## Band / TOCFL clamp (DELIBERATE — lossy above book 3)");
  md.push("");
  md.push("book 1 → A1/1 · book 2 → A2/2 · books 3+ → B1/3. The app has exactly");
  md.push("three rungs (A1/A2/B1); books 3, 4, 5, 6 all collapse to B1/TOCFL-3.");
  md.push("");
  md.push("## Per-book × per-check (readings with ≥1 HARD reason in bucket)");
  md.push("");
  md.push(...matrixRows);
  md.push("");
  md.push("All reasons above are HARD (verifyReading: pass = reasons.length === 0).");
  md.push("CI band is advisory-by-config (CI_FAIL_CLOSED=false) so it never appears as a");
  md.push("reason; ciMeasured is recorded per reading in gate-report.json.");
  md.push("");
  md.push("### Could-not-run check");
  md.push("");
  md.push(
    `- in-band coverage (check A): could NOT run on ${records.length - gateJson.totals.inbandCouldRun}/${records.length} readings — private pack \`packs/private/zh-hant/data/\` is ABSENT, so \`defLevelIndex\` cannot load and the gate fails closed with "prose: defLevelIndex not provided".`,
  );
  md.push("");
  md.push("## 20 worst readings by hard-failure count");
  md.push("");
  md.push("| # | reading | title | hard reasons |");
  md.push("| --- | --- | --- | --- |");
  worst.forEach((r, idx) => {
    md.push(`| ${idx + 1} | ${r.unit}-${r.readingId} | ${r.title.replace(/\|/g, "/")} | ${r.gate.reasons.length} |`);
  });
  md.push("");
  md.push("## Polyphone log stats");
  md.push("");
  md.push(`- rows appended to polyphone-candidates.jsonl: ${polyRows}`);
  md.push(`- distinct HV-ambiguous chars: ${polyChars.size}`);
  if (polyChars.size > 0) md.push(`- chars: ${[...polyChars].join(" ")}`);
  md.push("");
  md.push("## Touched / created files");
  md.push("");
  md.push(`- ${READINGS_OUT}/*.prepared.json (${gateJson.totals.converted} files)`);
  md.push(`- ${join(OUT_DIR, "manifest.json")}`);
  md.push(`- ${join(OUT_DIR, "gate-report.json")}`);
  md.push(`- ${join(OUT_DIR, "GATE-REPORT.md")}`);
  md.push(`- ${POLYPHONE_LOG}${polyRows ? "" : " (not created — no polyphones)"}`);
  md.push("");
  md.push("### Manifest origin flag");
  md.push("");
  md.push('Manifest rows carry `origin: "companion"`. `CatalogEntry.origin` is typed');
  md.push('`"generated"` only; the app blind-casts `__readings.json`, so this passes at');
  md.push("runtime but is off the published type union.");
  md.push("");

  writeFileSync(join(OUT_DIR, "GATE-REPORT.md"), `${md.join("\n")}\n`, "utf8");
  touchedFiles.add(join(OUT_DIR, "GATE-REPORT.md"));

  console.log(
    `companion:convert — ${converted}/${records.length} readings converted, ` +
      `${errors} errors, ${gateJson.totals.gatePass} gate-pass, ` +
      `${records.length - gateJson.totals.inbandCouldRun} in-band-could-not-run, ` +
      `${polyRows} polyphone rows (${polyChars.size} chars).`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
