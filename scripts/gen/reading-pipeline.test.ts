import { readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import type { LessonTarget } from "../accc/lib/lesson-target.js";
import {
  buildGenerateRequest,
  createMockBatchClient,
  DEFAULT_LANE_COUNT,
  MAX_LANE_COUNT,
} from "./lib/batchClient.js";
import {
  chooseLowFreqReviewItems,
  MAX_REPAIRS,
  processReadingSpec,
  resolveLanes,
  runReadingPipeline,
  submittedGenerateShape,
} from "./reading-pipeline.js";
import type { ReadingQueueSpec } from "./lib/queue.js";

const SPEC: ReadingQueueSpec = {
  id: "pc-001",
  lesson: "b4l03",
  format: "story",
  band: "A2",
  topic: "雲端科技",
  lengthTarget: 400,
  status: "pending",
};

const TARGET: LessonTarget = {
  lesson: "b4l03",
  cumulativeVocab: ["我", "你", "網購"],
  cumulativeGrammar: [],
  newVocab: ["何必", "划算"],
  newGrammar: [
    {
      pattern_id: "accc-b4l03-test",
      name_zh: "何必",
      name_pinyin: "hébì",
      structure_template: "何必 …",
      function_tag: "rhetorical",
      book: 4,
      lesson: 3,
      cumulative_through: "b4l03",
      source_ref: { pdf: "test", page: 1 },
      taxonomy_id: null,
      tocfl_band: "B",
      confidence: "high",
      extraction_method: "test",
      later_appearances: [],
    },
  ],
  cumulativeHanzi: ["我", "你", "網", "購"],
};

const DRAFT =
  "我習慣網購，何必出門？這樣很划算。" +
  "後來朋友也開始網購，我們聊了很久。" +
  "我覺得網購讓生活更方便了。";

let workDir: string;

beforeEach(() => {
  workDir = join(tmpdir(), `reading-pipeline-${Date.now()}-${Math.random()}`);
  mkdirSync(workDir, { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("reading pipeline", () => {
  it("defaults lanes to 5 and caps at 9", async () => {
    expect(resolveLanes()).toBe(DEFAULT_LANE_COUNT);
    expect(resolveLanes(9)).toBe(9);
    expect(resolveLanes(12)).toBe(MAX_LANE_COUNT);

    const queuePath = join(workDir, "queue.json");
    writeFileSync(
      queuePath,
      JSON.stringify({ version: 1, specs: [] }, null, 2),
      "utf8",
    );

    const outcomes = await runReadingPipeline({
      queuePath,
      skipLogPath: join(workDir, "skips.jsonl"),
      outputDir: join(workDir, "out"),
      batchClient: createMockBatchClient({}),
    });
    expect(outcomes).toHaveLength(0);
  });

  it("sends cumulative vocab in cached system block, not user turn", () => {
    const sample = buildGenerateRequest({
      customId: "x",
      model: "claude-opus-4-20250514",
      cumulativeVocab: ["網購", "何必"],
      userPrompt: "topic: test",
    });
    const shape = submittedGenerateShape([sample]);
    expect(shape.hasCacheControl).toBe(true);
    expect(shape.vocabInUserTurn).toBe(false);
    expect(sample.params.system[0]?.text).toContain("網購");
    expect(sample.params.messages[0]?.content).not.toContain("網購");
  });

  it("reassembles batch results by custom_id when returned out of order", async () => {
    const responses: Record<string, string> = {
      "pc-001:generate": DRAFT,
      "pc-001:critique:0": "FAIL: grammar",
      "pc-001:repair:0": DRAFT,
      "pc-001:critique:1": "FAIL: still bad",
      "pc-001:repair:1": DRAFT,
    };
    const client = createMockBatchClient(responses);

    let gateCalls = 0;
    const outcome = await processReadingSpec(SPEC, TARGET, {
      batchClient: client,
      outputDir: join(workDir, "out"),
      skipLogPath: join(workDir, "skips.jsonl"),
      gateStub: async () => {
        gateCalls++;
        return { ok: false, violations: [`gate-fail-${gateCalls}`] };
      },
    });

    expect(outcome.status).toBe("skipped");
    expect(gateCalls).toBe(MAX_REPAIRS + 1);
    const skipLog = readFileSync(join(workDir, "skips.jsonl"), "utf8").trim().split("\n");
    expect(skipLog).toHaveLength(1);
    const entry = JSON.parse(skipLog[0]!) as { violations: string[]; repairAttempts: number };
    expect(entry.repairAttempts).toBe(MAX_REPAIRS);
    expect(entry.violations[0]).toBe(`gate-fail-${MAX_REPAIRS + 1}`);
  });

  it("ships when gate passes without skip log", async () => {
    const client = createMockBatchClient({ "pc-001:generate": DRAFT });
    const outcome = await processReadingSpec(SPEC, TARGET, {
      batchClient: client,
      outputDir: join(workDir, "out"),
      skipLogPath: join(workDir, "skips.jsonl"),
      gateStub: async () => ({ ok: true, violations: [] }),
    });
    expect(outcome.status).toBe("shipped");
    expect(outcome.preparedPath).toBeDefined();
  });

  it("chooseLowFreqReviewItems fronts the rarest (highest/absent rank) items first", () => {
    const prevNew = ["常", "冷", "僻"];
    const freqRank = { 常: 10, 冷: 500 }; // 僻 absent → treated as rarest
    expect(chooseLowFreqReviewItems(prevNew, freqRank, 2)).toEqual(["僻", "冷"]);
    expect(chooseLowFreqReviewItems([], freqRank, 3)).toEqual([]);
    // needed clamps to at least 1
    expect(chooseLowFreqReviewItems(prevNew, freqRank, 0)).toHaveLength(1);
  });

  it("runReadingPipeline catches per-spec errors, skips and logs (error handling improvement)", async () => {
    const qpath = join(workDir, "q.json");
    writeFileSync(qpath, JSON.stringify({ version: 1, specs: [ { ...SPEC, status: "pending" } ] }), "utf8");
    const client = createMockBatchClient({ "pc-001:generate": DRAFT });
    const outcomes = await runReadingPipeline({
      queuePath: qpath,
      skipLogPath: join(workDir, "skips-eh.jsonl"),
      outputDir: join(workDir, "out"),
      batchClient: client,
      resolveTarget: () => TARGET,
      // force error via stub that always throws to simulate
      gateStub: async () => { throw new Error("boom in gate"); },
    } as any);
    // wrapper catches, produces skipped outcome
    expect(outcomes.length).toBeGreaterThan(0);
    expect(outcomes[0]?.status).toBe("skipped");
  });
});