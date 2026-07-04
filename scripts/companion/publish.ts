#!/usr/bin/env tsx
/**
 * Companion publish step (PRD-Companion-Articles §3).
 *
 * Publishes the eligible companion readings into the app vault:
 *   1. GUARD (no writes on failure): every candidate on the eligible list is
 *      re-checked against `gate-report.json` under the SIGNED companion binding
 *      profile (companion-v1). Script / glossary / paragraph / vi-rail reasons
 *      bind; sentence-rule reasons bind after the two signed calibrations
 *      (dialogue-interjection carve-out ≤3 Han with terminal 。！？; band-scaled
 *      length cap 60 Han for Books 1–2, 80 for Books 3+). Advisory families
 *      (in-band A, grammar-marker B, polyphone H, per-reading recycle, CI)
 *      never block. Unknown reason strings FAIL CLOSED (treated as binding).
 *   2. Copies each eligible `out/companion/readings/<id>.prepared.json` →
 *      `app/public/vault/readings/zh-Hant/<id>.prepared.json`.
 *   3. Merges each reading's CatalogEntry (from `out/companion/manifest.json`)
 *      into `app/public/vault/__readings.json` idempotently — keyed by `path`,
 *      re-runs replace, never duplicate — stamped `origin: "companion"`. The
 *      `clean.prepared.json` smoke fixture is removed once real content lands.
 *   4. Emits `app/public/vault/companion-lessons.json` from the 46 units of
 *      `mockups/lesson-highlights.json` (READ-ONLY source): the signed decision
 *      publishes {unit, title, theme, grammar:[{name}]} per lesson.
 *
 * Deterministic output: re-running twice yields a byte-identical vault.
 *
 *   pnpm companion:publish
 *   tsx scripts/companion/publish.ts [--eligible out/companion/eligible-YYYY-MM-DD.json]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");

export interface PublishPaths {
  /** Converter manifest: full CatalogEntry[] for all converted drafts. */
  manifest: string;
  /** Gate report with per-reading `gate.reasons` (post-segmentation-fix run). */
  gateReport: string;
  /** Eligible list ({ eligible_today: string[] }). */
  eligible: string;
  /** Directory holding `<id>.prepared.json` conversion outputs. */
  readingsDir: string;
  /** Vault root (`app/public/vault`). */
  vaultDir: string;
  /** Curated lesson-highlights JSON (READ-ONLY source, 46 units). */
  highlights: string;
}

export function defaultPaths(root: string = REPO_ROOT): PublishPaths {
  return {
    manifest: join(root, "out/companion/manifest.json"),
    gateReport: join(root, "out/companion/gate-report.json"),
    eligible: join(root, "out/companion/eligible-2026-07-02.json"),
    readingsDir: join(root, "out/companion/readings"),
    vaultDir: join(root, "app/public/vault"),
    highlights: join(root, "mockups/lesson-highlights.json"),
  };
}

interface GateRecord {
  unit: string;
  readingId: string;
  file: string;
  book: number;
  lesson: number;
  gate: { pass: boolean; reasons: string[] };
}

interface CatalogRow {
  path: string;
  origin?: string;
  [k: string]: unknown;
}

/** Band-scaled sentence-length cap (signed calibration 2): 60 for B1–2, 80 for B3+. */
export function bandCapFor(book: number): number {
  return book >= 3 ? 80 : 60;
}

const RE_TOO_SHORT = /^prose: sentences\[\d+\] Han count (\d+) < min \d+: (.+)$/;
const RE_TOO_LONG = /^prose: sentences\[\d+\] Han count (\d+) > max \d+/;

/**
 * Classify one gate-report reason under the signed companion binding profile.
 * Returns "advisory" (logged, never blocks) or "binding" (blocks publish).
 * Unknown reason shapes fail closed as binding.
 */
export function classifyReason(reason: string, book: number): "advisory" | "binding" {
  // Advisory families (named flip conditions in the PRD §2).
  if (reason.startsWith("newVocab:")) return "advisory"; // per-reading recycle
  if (reason.startsWith("newGrammar:")) return "advisory"; // marker check (B)
  if (reason.startsWith("polyphone:")) return "advisory"; // HV whitelist pending (H)
  if (reason.startsWith("ci:")) return "advisory"; // CI advisory by config
  if (reason.startsWith("prose:")) {
    if (reason.includes("defLevelIndex not provided")) return "advisory"; // in-band (A) cannot run
    const short = RE_TOO_SHORT.exec(reason);
    if (short) {
      // Calibration 1: dialogue-interjection carve-out — ≤3 Han complete
      // utterances (。！？-terminated) are natural beats, not defects.
      const count = Number(short[1]);
      const text = short[2].trim();
      const terminal = text.slice(-1);
      if (count <= 3 && (terminal === "。" || terminal === "！" || terminal === "？")) return "advisory";
      return "binding";
    }
    const long = RE_TOO_LONG.exec(reason);
    if (long) {
      // Calibration 2: band-scaled cap. Within cap → calibrated out; above → run-on.
      return Number(long[1]) <= bandCapFor(book) ? "advisory" : "binding";
    }
    return "binding"; // unknown prose reason → fail closed
  }
  // script / glossary / paragraph / vi-rail and anything unrecognized bind.
  return "binding";
}

/** All binding failures for one gate record under the signed profile. */
export function bindingFailures(rec: GateRecord): string[] {
  return rec.gate.reasons.filter((r) => classifyReason(r, rec.book) === "binding");
}

interface HighlightGrammar {
  title?: string;
  [k: string]: unknown;
}

interface HighlightUnit {
  title?: string;
  theme?: string;
  grammar?: HighlightGrammar[];
}

export interface CompanionLessonRow {
  unit: string;
  title: string;
  theme: string;
  grammar: { name: string }[];
}

/** Project lesson-highlights (46 units) into the published lesson list. */
export function buildCompanionLessons(highlights: Record<string, unknown>): CompanionLessonRow[] {
  return Object.keys(highlights)
    .filter((k) => k !== "_meta")
    .sort()
    .map((unit) => {
      const u = highlights[unit] as HighlightUnit;
      return {
        unit,
        title: u.title ?? "",
        theme: u.theme ?? "",
        grammar: (u.grammar ?? [])
          .map((g) => ({ name: String(g.title ?? "") }))
          .filter((g) => g.name.length > 0),
      };
    });
}

export interface PublishResult {
  published: number;
  manifestEntries: number;
  lessons: number;
  removedFixture: boolean;
}

/**
 * Run the publish step. THROWS (before any write) when a candidate's gate
 * record shows a binding failure under the signed profile, is missing from the
 * gate report / manifest, or its prepared reading file is absent.
 */
export function publishCompanion(paths: PublishPaths = defaultPaths()): PublishResult {
  const manifest = JSON.parse(readFileSync(paths.manifest, "utf8")) as CatalogRow[];
  const gateReport = JSON.parse(readFileSync(paths.gateReport, "utf8")) as { readings: GateRecord[] };
  const eligibleDoc = JSON.parse(readFileSync(paths.eligible, "utf8")) as { eligible_today: string[] };
  const highlights = JSON.parse(readFileSync(paths.highlights, "utf8")) as Record<string, unknown>;

  const ids = eligibleDoc.eligible_today;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("eligible_today is empty or missing — nothing to publish");
  }

  const gateById = new Map<string, GateRecord>();
  for (const r of gateReport.readings) gateById.set(`${r.unit}-${r.readingId}`, r);
  const manifestByPath = new Map<string, CatalogRow>();
  for (const row of manifest) manifestByPath.set(row.path, row);

  // ── GUARD: validate every candidate before ANY write (stale-list defense) ──
  const problems: string[] = [];
  const plan: { id: string; src: string; destName: string; entry: CatalogRow }[] = [];
  for (const id of ids) {
    const rec = gateById.get(id);
    if (!rec) {
      problems.push(`${id}: no gate record in ${paths.gateReport}`);
      continue;
    }
    const failures = bindingFailures(rec);
    if (failures.length > 0) {
      problems.push(`${id}: BINDING failure under signed profile:\n    ${failures.join("\n    ")}`);
      continue;
    }
    const entryPath = `readings/zh-Hant/${id}.prepared.json`;
    const entry = manifestByPath.get(entryPath);
    if (!entry) {
      problems.push(`${id}: no CatalogEntry for ${entryPath} in ${paths.manifest}`);
      continue;
    }
    const src = join(paths.readingsDir, `${id}.prepared.json`);
    if (!existsSync(src)) {
      problems.push(`${id}: prepared reading missing at ${src}`);
      continue;
    }
    plan.push({ id, src, destName: `${id}.prepared.json`, entry });
  }
  if (problems.length > 0) {
    throw new Error(
      `REFUSING to publish — ${problems.length} candidate(s) fail the runtime guard (no files written):\n  ` +
        problems.join("\n  "),
    );
  }

  // ── Writes (guard passed) ──
  const destDir = join(paths.vaultDir, "readings/zh-Hant");
  mkdirSync(destDir, { recursive: true });

  for (const p of plan) copyFileSync(p.src, join(destDir, p.destName));

  // Merge into __readings.json idempotently (keyed by path; replace, never duplicate).
  const vaultManifestPath = join(paths.vaultDir, "__readings.json");
  let existing: CatalogRow[] = [];
  if (existsSync(vaultManifestPath)) {
    try {
      const parsed = JSON.parse(readFileSync(vaultManifestPath, "utf8"));
      if (Array.isArray(parsed)) existing = parsed as CatalogRow[];
    } catch {
      existing = [];
    }
  }
  const FIXTURE_PATH = "readings/zh-Hant/clean.prepared.json";
  const merged = new Map<string, CatalogRow>();
  for (const row of existing) {
    if (row && typeof row.path === "string" && row.path !== FIXTURE_PATH) merged.set(row.path, row);
  }
  for (const p of plan) merged.set(p.entry.path, { ...p.entry, origin: "companion" });
  const rows = [...merged.values()].sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(vaultManifestPath, JSON.stringify(rows, null, 2) + "\n");

  // The smoke-sample fixture file leaves with its manifest entry.
  const fixtureFile = join(paths.vaultDir, FIXTURE_PATH);
  const removedFixture = existsSync(fixtureFile);
  if (removedFixture) rmSync(fixtureFile);

  // companion-lessons.json — the signed decision publishes the 46-unit lesson list.
  const lessons = buildCompanionLessons(highlights);
  writeFileSync(join(paths.vaultDir, "companion-lessons.json"), JSON.stringify(lessons, null, 2) + "\n");

  return { published: plan.length, manifestEntries: rows.length, lessons: lessons.length, removedFixture };
}

function main(): void {
  const paths = defaultPaths();
  const flagIdx = process.argv.indexOf("--eligible");
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) {
    paths.eligible = resolve(process.argv[flagIdx + 1]);
  }
  const res = publishCompanion(paths);
  console.log(
    `published ${res.published} companion readings → ${paths.vaultDir}/readings/zh-Hant; ` +
      `__readings.json now ${res.manifestEntries} entries; ` +
      `companion-lessons.json ${res.lessons} units` +
      (res.removedFixture ? "; removed clean.prepared.json smoke fixture" : ""),
  );
}

// Run only as a CLI entry (never on import, so tests can pull the pure pieces).
const isCliEntry =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntry) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
