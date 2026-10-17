import { mainTail1 } from "./convert-drafts.fns1.js";
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
export async function mainTail2(ctx: any): Promise<any> {
ctx.rmSync(ctx.OUT_DIR, { recursive: true, force: true });
  ctx.mkdirSync(ctx.READINGS_OUT, { recursive: true });

  const highlights = JSON.parse(ctx.readFileSync(ctx.HIGHLIGHTS_PATH, "utf8")) as Record<
    string,
    HighlightEntry
  >;
  const { lookup: vocabLookup, names: characterNames } = ctx.loadVocab();

  const unitFiles = ctx.readdirSync(ctx.DRAFTS_DIR)
    .filter((f) => /^B\d+L\d+\.json$/.test(f))
    .sort();

  const manifest: CompanionEntry[] = [];
  const records: ReadingRecord[] = [];
  const touchedFiles = new Set<string>();

  let converted = 0;
  let errors = 0;

  for (const file of unitFiles) {
    const unit = file.replace(/\.json$/, "");
    const { book, lesson, canonical } = ctx.parseLessonRef(unit);
    const draftDoc = JSON.parse(ctx.readFileSync(ctx.join(ctx.DRAFTS_DIR, file), "utf8")) as
      | { readings: DraftReading[] }
      | DraftReading[];
    const readings: DraftReading[] = Array.isArray(draftDoc) ? draftDoc : draftDoc.readings;

    const target = ctx.resolveLessonTarget(unit);



    const filteredTarget = {
      ...target,
      newVocab: target.newVocab.filter((w) => !characterNames.has(w)),
    };


    const segmentLexicon = new Set(
      [...filteredTarget.cumulativeVocab, ...filteredTarget.newVocab].flatMap(ctx.vocabSurfaceForms),
    );

    const hi = highlights[unit] ?? {};
    const lessonTitle = hi.title ?? unit;
    const topic = hi.theme?.trim() || undefined;
    const { band, tocfl } = ctx.bandForBook(book);
    const binding: LessonBinding = { textbook: "accc", book, lesson };

    for (let i = 0; i < readings.length; i++) {
      const r = readings[i]!;
      const readingId = (r.id ?? `R${i + 1}`).toLowerCase();
      const format = r.format ?? "";
      const title = `${lessonTitle} · ${format}${ctx.cjkOrdinal(i + 1)}`;
      const slug = `${canonical}-${readingId}`;
      const catalogPath = `readings/zh-Hant/${slug}.prepared.json`;
      const outPath = ctx.join(ctx.READINGS_OUT, `${slug}.prepared.json`);

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
        const { prepared, polyphones, gateReport } = await ctx.populateDualRail({
          draft: r.text,
          lessonTarget: filteredTarget,
          band,
          kind: ctx.kindForFormat(format),
          title,
          vocabLookup,
          polyphoneLogPath: ctx.POLYPHONE_LOG,
          knownWords: segmentLexicon,



          segmenter: "greedy",
        });



        const wordSet = new Set(prepared.tokens.filter((t) => t.isWord).map((t) => t.text));
        const newWordsHere = filteredTarget.newVocab.filter((w) => wordSet.has(w)).length;





        const appPrepared: AppPrepared = {
          ...prepared,
          core: {
            band,
            tocfl,
            kind: ctx.kindForFormat(format),
            newWords: newWordsHere,
            binding,
            ...(topic ? { topic } : {}),
          },
        };

        ctx.writeFileSync(outPath, `${JSON.stringify(appPrepared, null, 2)}\n`, "utf8");
        touchedFiles.add(outPath);

        const base = await ctx.enrichCatalogEntry(outPath, catalogPath);
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


  ctx.manifest = manifest; ctx.touchedFiles = touchedFiles; ctx.unitFiles = unitFiles; ctx.records = records; ctx.converted = converted; ctx.errors = errors;
return mainTail1(ctx);
}
