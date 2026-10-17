import {
  buildCritiqueRequest,
  buildGenerateRequest,
  buildRepairRequest,
  DEFAULT_LANE_COUNT,
  extractResultText,
  MAX_LANE_COUNT,
  type BatchClient,
  type BatchRequest,
} from "./lib/batchClient.js";

import type { LessonTarget } from "../accc/lib/lesson-target.js";

import type { DefLevelIndex } from "@tsumugu/gen-qa";

import {
  claimNextSpec,
  loadQueue,
  markSpecComplete,
  markSpecSkipped,
  type ReadingQueueSpec,
} from "./lib/queue.js";

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";

import { dirname, join } from "node:path";

import { populateDualRail } from "./lib/dualRail.js";

export const MAX_REPAIRS = 2;

export const OPUS_MODEL = "claude-opus-4-20250514";

const SONNET_MODEL = "claude-sonnet-4-20250514";

export interface ReadingPipelineOptions {
  queuePath: string;
  skipLogPath: string;
  outputDir: string;
  lanes?: number;
  batchClient: BatchClient;
  apiKey?: string;
  workerId?: string;
  resolveTarget?: (lesson: string) => LessonTarget;
  
  defLevelIndex?: DefLevelIndex;
  
  gateStub?: (spec: ReadingQueueSpec, attempt: number) => Promise<{ ok: boolean; violations: string[]; prepared?: any }>;
}

export interface PipelineOutcome {
  specId: string;
  status: "shipped" | "skipped";
  preparedPath?: string;
  violations?: string[];
}

export interface SkipLogEntry {
  ts: string;
  specId: string;
  lesson: string;
  violations: string[];
  repairAttempts: number;
}

export function appendSkip(path: string, entry: SkipLogEntry): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
}

export function resolveLanes(lanes?: number): number {
  const n = lanes ?? DEFAULT_LANE_COUNT;
  if (n < 1) return 1;
  if (n > MAX_LANE_COUNT) return MAX_LANE_COUNT;
  return n;
}

export function pickGenerateModel(band: string): string {
  return band === "A1" || band === "A2" ? SONNET_MODEL : OPUS_MODEL;
}

export function buildUserPrompt(spec: ReadingQueueSpec, target: LessonTarget): string {
  const newWords = target.newVocab.slice(0, 30).join("、");
  const newGrammar = target.newGrammar.map((g) => g.name_zh).join("、");

  
  
  
  
  const regressionNote = [
    `REVERSE REGRESSION / SPACED REVIEW (lower bounds on token proportion from each bucket; see COMPANION-SET-LAYOUT.md and prompt for formula + self-QA):`,
    `current (${spec.lesson}): >=40% from this lesson's newVocab + newGrammar`,
    `immediate previous: >=20% from its new`,
    `two back: >=10%`,
    `three back: >=5%`,
    `four back: >=2.5% (stop at ~1% or d=5)`,
    `5 core must cover 100% of *this* lesson's new across them (use partition for current).`,
  ].join("\n");

  return [
    `lesson: ${spec.lesson}`,
    `format: ${spec.format}`,
    `band: ${spec.band}`,
    `topic: ${spec.topic}`,
    `lengthTarget: ${spec.lengthTarget}`,
    `newVocab (must feature): ${newWords}`,
    `newGrammar (must demonstrate): ${newGrammar}`,
    regressionNote,
  ].join("\n");
}

export function chooseLowFreqReviewItems(
  prevNew: string[],
  freqRank: Record<string, number>,
  needed: number
): string[] {
  if (!prevNew.length) return [];
  const sorted = [...prevNew].sort((a, b) => {
    const ra = freqRank[a] ?? Number.MAX_SAFE_INTEGER;
    const rb = freqRank[b] ?? Number.MAX_SAFE_INTEGER;
    
    if (rb !== ra) return rb - ra;
    return a.localeCompare(b);
  });
  return sorted.slice(0, Math.max(1, needed));
}

export async function defaultGate(
  spec: ReadingQueueSpec,
  draft: string,
  target: LessonTarget,
  defLevelIndex?: DefLevelIndex,
  skipLogPath?: string,
): Promise<{ ok: boolean; violations: string[]; prepared?: any }> {
  const polyphoneLogPath = skipLogPath
    ? join(dirname(skipLogPath), "polyphone-candidates.jsonl")
    : undefined;
  const res = await populateDualRail({
    draft,
    lessonTarget: target,
    band: spec.band,
    kind: spec.format,
    ...(spec.topic ? { topic: spec.topic } : {}),
    ...(defLevelIndex ? { defLevelIndex } : {}),
    ...(polyphoneLogPath ? { polyphoneLogPath } : {}),
  });
  return {
    ok: res.gateReport.pass,
    violations: res.gateReport.reasons,
    prepared: res.prepared,
  };
}
