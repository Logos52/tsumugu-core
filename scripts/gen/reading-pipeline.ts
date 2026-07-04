import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { LessonTarget } from "../accc/lib/lesson-target.js";
import { resolveLessonTarget } from "../accc/lib/lesson-target.js";
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
import { populateDualRail } from "./lib/dualRail.js";
import type { DefLevelIndex } from "@tsumugu/gen-qa";
import {
  claimNextSpec,
  loadQueue,
  markSpecComplete,
  markSpecSkipped,
  type ReadingQueueSpec,
} from "./lib/queue.js";

export const MAX_REPAIRS = 2;
export const OPUS_MODEL = "claude-opus-4-20250514";
export const SONNET_MODEL = "claude-sonnet-4-20250514";

export interface ReadingPipelineOptions {
  queuePath: string;
  skipLogPath: string;
  outputDir: string;
  lanes?: number;
  batchClient: BatchClient;
  apiKey?: string;
  workerId?: string;
  resolveTarget?: (lesson: string) => LessonTarget;
  /** Optional preloaded band index for gate in-band checks (falls back to load inside). */
  defLevelIndex?: DefLevelIndex;
  /** Inject gate failures for tests (attempt → fail?). May return prepared on ok for reuse. */
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

function appendSkip(path: string, entry: SkipLogEntry): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
}

export function resolveLanes(lanes?: number): number {
  const n = lanes ?? DEFAULT_LANE_COUNT;
  if (n < 1) return 1;
  if (n > MAX_LANE_COUNT) return MAX_LANE_COUNT;
  return n;
}

function pickGenerateModel(band: string): string {
  return band === "A1" || band === "A2" ? SONNET_MODEL : OPUS_MODEL;
}

function buildUserPrompt(spec: ReadingQueueSpec, target: LessonTarget): string {
  const newWords = target.newVocab.slice(0, 30).join("、");
  const newGrammar = target.newGrammar.map((g) => g.name_zh).join("、");

  // Reverse-regression lower bounds only. The per-prior-lesson "chosen" review subsets
  // are NOT injected here (that needs resolving L-1/L-2… — `chooseLowFreqReviewItems`
  // is the selector for when that lands); the model satisfies the proportions from the
  // frozen cumulative vocabulary in the cached system block.
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

/**
 * Stub for future: given a previous lesson's newVocab list + freqRank lookup,
 * return the rarest-first chosen subset sized for the review bucket volume.
 * (Full impl lives near resolveLessonTarget or in a shared target builder.)
 * Used to prepare the "chosen" lists passed for L-1/L-2... regression in the prompt.
 *
 * freqRank: word -> rank (lower rank = more frequent; absent or high = rarer)
 * needed: how many distinct to front-load for this bucket's lower-bound.
 */
export function chooseLowFreqReviewItems(
  prevNew: string[],
  freqRank: Record<string, number>,
  needed: number
): string[] {
  if (!prevNew.length) return [];
  const sorted = [...prevNew].sort((a, b) => {
    const ra = freqRank[a] ?? Number.MAX_SAFE_INTEGER;
    const rb = freqRank[b] ?? Number.MAX_SAFE_INTEGER;
    // Rarest first: higher rank (or absent) first → larger rank wins
    if (rb !== ra) return rb - ra;
    return a.localeCompare(b);
  });
  return sorted.slice(0, Math.max(1, needed));
}

async function defaultGate(
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

/** Process one claimed spec through generate → gate → critique → repair (max 2). */
export async function processReadingSpec(
  spec: ReadingQueueSpec,
  target: LessonTarget,
  deps: Pick<ReadingPipelineOptions, "batchClient" | "outputDir" | "skipLogPath" | "gateStub" | "defLevelIndex">,
): Promise<PipelineOutcome> {
  const generateModel = pickGenerateModel(spec.band);
  const userPrompt = buildUserPrompt(spec, target);
  const generateReq = buildGenerateRequest({
    customId: `${spec.id}:generate`,
    model: generateModel,
    cumulativeVocab: target.cumulativeVocab,
    userPrompt,
  });

  let batchId = await deps.batchClient.submit([generateReq]);
  let results = await deps.batchClient.poll(batchId);
  const byId = new Map(results.map((r) => [r.custom_id, r]));
  let draft = extractResultText(byId.get(`${spec.id}:generate`)!);

  let repairAttempts = 0;

  while (true) {
    const gate = deps.gateStub
      ? await deps.gateStub(spec, repairAttempts)
      : await defaultGate(spec, draft, target, deps.defLevelIndex, deps.skipLogPath);

    if (gate.ok) {
      // Reuse prepared from gate pass if available (enhances dualRail pop: no redundant segment/bridge/verify)
      let prepared = gate.prepared;
      if (!prepared) {
        const full = await populateDualRail({
          draft,
          lessonTarget: target,
          band: spec.band,
          kind: spec.format,
          ...(spec.topic ? { topic: spec.topic } : {}),
          ...(deps.defLevelIndex ? { defLevelIndex: deps.defLevelIndex } : {}),
          polyphoneLogPath: join(dirname(deps.skipLogPath), "polyphone-candidates.jsonl"),
        });
        prepared = full.prepared;
      }
      const outPath = join(deps.outputDir, `${spec.id}.prepared.json`);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, `${JSON.stringify(prepared, null, 2)}\n`, "utf8");
      return { specId: spec.id, status: "shipped", preparedPath: outPath };
    }

    if (repairAttempts >= MAX_REPAIRS) {
      appendSkip(deps.skipLogPath, {
        ts: new Date().toISOString(),
        specId: spec.id,
        lesson: spec.lesson,
        violations: gate.violations,
        repairAttempts,
      });
      return { specId: spec.id, status: "skipped", violations: gate.violations };
    }

    const critiqueReq = buildCritiqueRequest({
      customId: `${spec.id}:critique:${repairAttempts}`,
      model: OPUS_MODEL,
      draft,
      newGrammar: target.newGrammar.map((g) => g.name_zh),
      format: spec.format,
    });
    batchId = await deps.batchClient.submit([critiqueReq]);
    results = await deps.batchClient.poll(batchId);
    const critiqueMap = new Map(results.map((r) => [r.custom_id, r]));
    const critique = extractResultText(
      critiqueMap.get(`${spec.id}:critique:${repairAttempts}`)!,
    );

    const repairReq = buildRepairRequest({
      customId: `${spec.id}:repair:${repairAttempts}`,
      model: generateModel,
      cumulativeVocab: target.cumulativeVocab,
      draft,
      critique,
    });
    batchId = await deps.batchClient.submit([repairReq]);
    results = await deps.batchClient.poll(batchId);
    const repairMap = new Map(results.map((r) => [r.custom_id, r]));
    draft = extractResultText(repairMap.get(`${spec.id}:repair:${repairAttempts}`)!);
    repairAttempts++;
  }
}

/** Drive the claim queue up to `lanes` concurrent specs with error handling. */
export async function runReadingPipeline(opts: ReadingPipelineOptions): Promise<PipelineOutcome[]> {
  if (opts.apiKey !== undefined && !opts.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for live Batches runs");
  }

  const lanes = resolveLanes(opts.lanes);
  const workerId = opts.workerId ?? `worker-${process.pid}`;
  const resolveTarget = opts.resolveTarget ?? ((lesson: string) => resolveLessonTarget(lesson));
  const outcomes: PipelineOutcome[] = [];

  // Improved claim-based: drain queue with lane concurrency limit + per-spec error handling.
  // Never injects full wordlist (only new in user turn; cumulative frozen in cached prefix).
  const queue = loadQueue(opts.queuePath);
  const pending = queue.specs.filter((s) => s.status === "pending");

  const active: Promise<PipelineOutcome | null>[] = [];
  let idx = 0;

  const launch = async (specId: string) => {
    const claimed = claimNextSpec(opts.queuePath, `${workerId}:${specId}`);
    if (!claimed) return null;
    try {
      const target = resolveTarget(claimed.lesson);
      const outcome = await processReadingSpec(claimed, target, opts);
      if (outcome.status === "shipped") {
        markSpecComplete(opts.queuePath, claimed.id);
      } else {
        markSpecSkipped(opts.queuePath, claimed.id);
      }
      return outcome;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const skipEntry: SkipLogEntry = {
        ts: new Date().toISOString(),
        specId: claimed.id,
        lesson: claimed.lesson,
        violations: [`pipeline-error: ${msg}`],
        repairAttempts: 0,
      };
      appendSkip(opts.skipLogPath, skipEntry);
      try {
        markSpecSkipped(opts.queuePath, claimed.id);
      } catch {}
      return { specId: claimed.id, status: "skipped", violations: skipEntry.violations } as PipelineOutcome;
    }
  };

  while (idx < pending.length || active.length > 0) {
    while (active.length < lanes && idx < pending.length) {
      const slot = pending[idx]!;
      idx++;
      const p = launch(slot.id).then((o) => {
        const ii = active.indexOf(p as any);
        if (ii >= 0) active.splice(ii, 1);
        return o;
      });
      active.push(p);
    }
    if (active.length > 0) {
      const res = await Promise.race(active);
      if (res) outcomes.push(res);
    }
  }

  return outcomes.filter(Boolean) as PipelineOutcome[];
}

/** Expose last submitted batch requests for shape assertions in tests. */
export function submittedGenerateShape(requests: BatchRequest[]): {
  hasCacheControl: boolean;
  vocabInUserTurn: boolean;
} {
  const req = requests[0];
  const system = req?.params.system ?? [];
  const user = req?.params.messages.map((m) => m.content).join("\n") ?? "";
  const hasCacheControl = system.some((b) => b.cache_control?.type === "ephemeral");
  const vocabInUserTurn = user.includes("FROZEN CONTROLLED VOCABULARY");
  return { hasCacheControl, vocabInUserTurn };
}