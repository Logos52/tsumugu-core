#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXTRACTION_SOURCES,
  type ExtractionSource,
  type GrammarIndexFile,
} from "./lib/grammar-index-types.js";
import {
  reconcileGrammarIndexes,
  renderReconcileReport,
} from "./lib/reconcile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const PRIVATE_DIR = join(REPO_ROOT, "private");

const INPUT_FILES: Record<ExtractionSource, string> = {
  json: "dangdai-grammar-index.json",
  grok: "dangdai-grammar-index.grok.json",
  composer: "dangdai-grammar-index.composer.json",
  v2: "dangdai-grammar-index.v2.json",
  qwen: "dangdai-grammar-index.qwen.json",
};

function loadIndex(source: ExtractionSource): GrammarIndexFile {
  const filePath = join(PRIVATE_DIR, INPUT_FILES[source]);
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as GrammarIndexFile;
}

function main(): void {
  const indexes = {} as Record<ExtractionSource, GrammarIndexFile>;
  for (const source of EXTRACTION_SOURCES) {
    indexes[source] = loadIndex(source);
  }

  const { merged, conflicts, summary } = reconcileGrammarIndexes(indexes);
  const report = renderReconcileReport(summary, conflicts, merged.points);

  const mergedPath = join(PRIVATE_DIR, "dangdai-grammar-index.merged.json");
  const reportPath = join(PRIVATE_DIR, "dangdai-grammar-reconcile-report.md");

  writeFileSync(mergedPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  writeFileSync(reportPath, report, "utf8");

  console.log("ACCC grammar index reconciliation complete");
  console.log(`  merged points: ${summary.totalPoints}`);
  console.log(`  confirmed: ${summary.confirmed}`);
  console.log(`  review: ${summary.review}`);
  console.log(`  orphans: ${summary.orphans}`);
  console.log(`  lesson conflicts: ${summary.lessonConflicts}`);
  console.log(`  wrote ${mergedPath}`);
  console.log(`  wrote ${reportPath}`);

  if (summary.totalPoints < 434) {
    console.error(`ERROR: merged point count ${summary.totalPoints} < 434`);
    process.exitCode = 1;
  }
}

main();