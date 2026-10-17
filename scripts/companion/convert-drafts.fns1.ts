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
export function mainTail1(ctx: any): any {
const bandOrder: Record<string, number> = { A1: 0, A2: 1, B1: 2 };
  ctx.manifest.sort((a, b) => {
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

  ctx.writeFileSync(ctx.join(ctx.OUT_DIR, "manifest.json"), `${JSON.stringify(ctx.manifest, null, 2)}\n`, "utf8");
  ctx.touchedFiles.add(ctx.join(ctx.OUT_DIR, "manifest.json"));

  
  const gateJson = {
    generatedAt: new Date().toISOString(),
    totals: {
      units: ctx.unitFiles.length,
      readings: ctx.records.length,
      converted: ctx.converted,
      conversionErrors: ctx.errors,
      gatePass: ctx.records.filter((r) => r.gate.pass).length,
      inbandCouldRun: ctx.records.filter((r) => r.inbandCouldRun).length,
    },
    readings: ctx.records,
  };
  ctx.writeFileSync(ctx.join(ctx.OUT_DIR, "gate-report.json"), `${JSON.stringify(gateJson, null, 2)}\n`, "utf8");
  ctx.touchedFiles.add(ctx.join(ctx.OUT_DIR, "gate-report.json"));

  
  const books = [...new Set(ctx.records.map((r) => r.book))].sort((a, b) => a - b);
  const bookReadings = (bk: number) => ctx.records.filter((r) => r.book === bk);

  
  const matrixRows: string[] = [];
  matrixRows.push(`| book | readings | ${ctx.CHECK_BUCKETS.join(" | ")} |`);
  matrixRows.push(`| --- | --- | ${ctx.CHECK_BUCKETS.map(() => "---").join(" | ")} |`);
  for (const bk of books) {
    const rs = bookReadings(bk);
    const cells = ctx.CHECK_BUCKETS.map((bucket) => {
      const n = rs.filter((r) => r.gate.reasons.some((x) => ctx.bucketOf(x) === bucket)).length;
      return String(n);
    });
    matrixRows.push(`| B${bk} | ${rs.length} | ${cells.join(" | ")} |`);
  }
  const allCells = ctx.CHECK_BUCKETS.map(
    (bucket) => ctx.records.filter((r) => r.gate.reasons.some((x) => ctx.bucketOf(x) === bucket)).length,
  );
  matrixRows.push(`| **all** | ${ctx.records.length} | ${allCells.map((c) => `**${c}**`).join(" | ")} |`);

  const worst = [...ctx.records]
    .sort((a, b) => b.gate.reasons.length - a.gate.reasons.length)
    .slice(0, 20);

  
  let polyRows = 0;
  const polyChars = new Set<string>();
  try {
    const lines = ctx.readFileSync(ctx.POLYPHONE_LOG, "utf8").trim().split("\n").filter(Boolean);
    polyRows = lines.length;
    for (const ln of lines) {
      try {
        const o = JSON.parse(ln) as { char?: string };
        if (o.char) polyChars.add(o.char);
      } catch {
        
      }
    }
    ctx.touchedFiles.add(ctx.POLYPHONE_LOG);
  } catch {
    
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
    `- in-band check could run (defLevelIndex present): ${gateJson.totals.inbandCouldRun} / ${ctx.records.length}`,
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
    `- in-band coverage (check A): could NOT run on ${ctx.records.length - gateJson.totals.inbandCouldRun}/${ctx.records.length} readings — private pack \`packs/private/zh-hant/data/\` is ABSENT, so \`defLevelIndex\` cannot load and the gate fails closed with "prose: defLevelIndex not provided".`,
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
  md.push(`- ${ctx.READINGS_OUT}/${"*"}prepared.json (${gateJson.totals.converted} files)`);
  md.push(`- ${ctx.join(ctx.OUT_DIR, "manifest.json")}`);
  md.push(`- ${ctx.join(ctx.OUT_DIR, "gate-report.json")}`);
  md.push(`- ${ctx.join(ctx.OUT_DIR, "GATE-REPORT.md")}`);
  md.push(`- ${ctx.POLYPHONE_LOG}${polyRows ? "" : " (not created — no polyphones)"}`);
  md.push("");
  md.push("### Manifest origin flag");
  md.push("");
  md.push('Manifest rows carry `origin: "companion"`. `CatalogEntry.origin` is typed');
  md.push('`"generated"` only; the app blind-casts `__readings.json`, so this passes at');
  md.push("runtime but is off the published type union.");
  md.push("");

  ctx.writeFileSync(ctx.join(ctx.OUT_DIR, "GATE-REPORT.md"), `${md.join("\n")}\n`, "utf8");
  ctx.touchedFiles.add(ctx.join(ctx.OUT_DIR, "GATE-REPORT.md"));

  console.log(
    `companion:convert — ${ctx.converted}/${ctx.records.length} readings converted, ` +
      `${ctx.errors} errors, ${gateJson.totals.gatePass} gate-pass, ` +
      `${ctx.records.length - gateJson.totals.inbandCouldRun} in-band-could-not-run, ` +
      `${polyRows} polyphone rows (${polyChars.size} chars).`,
  );
}
