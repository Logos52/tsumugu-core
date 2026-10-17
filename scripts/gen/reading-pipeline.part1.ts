import {
  claimNextSpec,
  loadQueue,
  markSpecComplete,
  markSpecSkipped,
  type ReadingQueueSpec,
} from "./lib/queue.js";

import type { LessonTarget } from "../accc/lib/lesson-target.js";

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

import { dirname, join } from "node:path";

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";

import { resolveLessonTarget } from "../accc/lib/lesson-target.js";

import { MAX_REPAIRS, OPUS_MODEL, appendSkip, buildUserPrompt, defaultGate, pickGenerateModel, resolveLanes } from "./reading-pipeline.part2.js";

import type { PipelineOutcome, ReadingPipelineOptions, SkipLogEntry } from "./reading-pipeline.part2.js";

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

export async function runReadingPipeline(opts: ReadingPipelineOptions): Promise<PipelineOutcome[]> {
  if (opts.apiKey !== undefined && !opts.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for live Batches runs");
  }

  const lanes = resolveLanes(opts.lanes);
  const workerId = opts.workerId ?? `worker-${process.pid}`;
  const resolveTarget = opts.resolveTarget ?? ((lesson: string) => resolveLessonTarget(lesson));
  const outcomes: PipelineOutcome[] = [];

  
  
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
