import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ReadingCheckReport } from "./readingChecks.js";

export interface SkipLogEntry {
  ts: string;
  path: string;
  reasons: string[];
}

/** Append one JSONL skip-queue record (idempotent append; creates parent dirs). */
export function appendSkipLog(
  report: ReadingCheckReport,
  sourcePath: string,
  queuePath: string,
): void {
  const entry: SkipLogEntry = {
    ts: new Date().toISOString(),
    path: sourcePath,
    reasons: report.reasons,
  };
  mkdirSync(dirname(queuePath), { recursive: true });
  appendFileSync(queuePath, `${JSON.stringify(entry)}\n`, "utf8");
}