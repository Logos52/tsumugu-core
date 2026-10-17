import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { dirname, join, resolve } from "node:path";

import { fileURLToPath, pathToFileURL } from "node:url";

import { classifyReason, defaultPaths } from "./publish.part2.js";

import type { CatalogRow, GateRecord, PublishPaths } from "./publish.part2.js";

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

  
  const destDir = join(paths.vaultDir, "readings/zh-Hant");
  mkdirSync(destDir, { recursive: true });

  for (const p of plan) copyFileSync(p.src, join(destDir, p.destName));

  
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

  
  const fixtureFile = join(paths.vaultDir, FIXTURE_PATH);
  const removedFixture = existsSync(fixtureFile);
  if (removedFixture) rmSync(fixtureFile);

  
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
