import { readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { parsePreparedContent, PREPARED_CONTENT_SCHEMA_V2 } from "@tsumugu/engine";

import type { LessonTarget } from "../../accc/lib/lesson-target.js";
import {
  FIXTURE_CHAR_VI,
  FIXTURE_DEF_INDEX,
  FIXTURE_HANVIET,
} from "../../../packages/content-pipeline/test/helpers.js";
import { enrichCatalogEntry } from "../../../pipeline/lib/catalogEnrich.js";
import { populateDualRail, segmentDraft } from "./dualRail.js";

const TARGET: LessonTarget = {
  lesson: "b4l03",
  cumulativeVocab: [
    "今天",
    "天氣",
    "很",
    "好",
    "我",
    "想",
    "去",
    "打算",
    "公園",
    "因為",
    "讓",
    "心情",
    "變",
    "後來",
    "遇到",
    "朋友",
    "我們",
    "一起",
    "聊天",
    "聊",
    "了",
    "久",
    "開心",
  ],
  cumulativeGrammar: [],
  newVocab: ["散步"],
  newGrammar: [
    {
      pattern_id: "accc-test",
      name_zh: "了",
      name_pinyin: "le",
      structure_template: "V 了",
      function_tag: "aspect",
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
  cumulativeHanzi: [],
};

const DRAFT =
  "今天天氣很好，我想去散步。我打算去公園散步，因為散步讓心情變好。" +
  "後來遇到朋友，我們一起聊天，聊了很久。我很開心了。" +
  "今天我去公園，天氣很好，我想去散步。";

let workDir: string;

beforeEach(() => {
  workDir = join(tmpdir(), `dual-rail-${Date.now()}-${Math.random()}`);
  mkdirSync(workDir, { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("segmentDraft", () => {
  it("segments using cumulative vocab longest-match", () => {
    const known = new Set(["今天", "天氣", "很", "好"]);
    const tokens = segmentDraft("今天天氣很好。", known);
    expect(tokens.map((t) => t.text)).toEqual(["今天", "天氣", "很", "好", "。"]);
  });
});

describe("populateDualRail", () => {
  it("emits PREPARED_CONTENT_SCHEMA_V2 with EN+VI rails and core metadata", async () => {
    const polyphoneLog = join(workDir, "polyphone-candidates.jsonl");
    const { prepared, polyphones } = await populateDualRail({
      draft: DRAFT,
      lessonTarget: TARGET,
      band: "A2",
      kind: "story",
      topic: "散步",
      hanviet: FIXTURE_HANVIET,
      charVi: FIXTURE_CHAR_VI,
      defLevelIndex: FIXTURE_DEF_INDEX,
      polyphoneLogPath: polyphoneLog,
      vocabLookup: new Map([
        ["散步", { pinyin: "sàn bù", meaning: "to take a walk" }],
        ["上班", { pinyin: "shàng bān", meaning: "go to work" }],
      ]),
    });

    expect(prepared.schema).toBe(PREPARED_CONTENT_SCHEMA_V2);
    // CatalogEntry-compatible core shape (D10): object binding + numeric tocfl/newWords + topic.
    expect(prepared.core?.binding).toEqual({ textbook: "accc", book: 4, lesson: 3 });
    expect(prepared.core?.tocfl).toBe(2);
    expect(prepared.core?.kind).toBe("story");
    expect(prepared.core?.band).toBe("A2");
    expect(prepared.core?.newWords).toBe(1);
    expect(prepared.core?.topic).toBe("散步");
    expect(prepared.fingerprint?.vocab.length).toBeGreaterThan(0);
    expect(prepared.fingerprint?.grammar).toContain("了");
    expect(prepared.glossary["散步"]?.definitions?.en?.gloss).toBeTruthy();
    expect(prepared.glossary["散步"]?.bridge?.morphemes?.length).toBeGreaterThan(0);

    const parsed = parsePreparedContent(JSON.stringify(prepared));
    expect(parsed.schema).toBe(PREPARED_CONTENT_SCHEMA_V2);
  });

  it("composes with pipeline enrichCatalogEntry without a shape mismatch (D10)", async () => {
    const { prepared } = await populateDualRail({
      draft: DRAFT,
      lessonTarget: TARGET,
      band: "A2",
      kind: "story",
      topic: "散步",
      hanviet: FIXTURE_HANVIET,
      charVi: FIXTURE_CHAR_VI,
      defLevelIndex: FIXTURE_DEF_INDEX,
      vocabLookup: new Map([["散步", { pinyin: "sàn bù", meaning: "to take a walk" }]]),
    });

    const preparedPath = join(workDir, "b4l03.prepared.json");
    writeFileSync(preparedPath, JSON.stringify(prepared, null, 2), "utf8");

    const entry = await enrichCatalogEntry(preparedPath, "readings/zh-Hant/b4l03.prepared.json");
    expect(entry.origin).toBe("generated");
    expect(entry.band).toBe("A2");
    expect(entry.tocfl).toBe(2);
    expect(entry.kind).toBe("story");
    expect(entry.binding).toEqual({ textbook: "accc", book: 4, lesson: 3 });
    expect(entry.newWords).toBe(1);
    expect(entry.topic).toBe("散步");
    expect(entry.totalWords).toBeGreaterThan(0);
    expect(typeof entry.wordCounts).toBe("object");
  });

  it("flags polyphone chars and logs candidates (g2pW candidate / to-integrate)", async () => {
    const polyphoneLog = join(workDir, "polyphone-candidates.jsonl");
    const targetWithShangban: LessonTarget = {
      ...TARGET,
      newVocab: ["上班"],
      cumulativeVocab: TARGET.cumulativeVocab.filter((w) => w !== "上" && w !== "班"),
    };
    const { prepared, polyphones } = await populateDualRail({
      draft: "今天我去上班。",
      lessonTarget: targetWithShangban,
      band: "A2",
      kind: "story",
      hanviet: FIXTURE_HANVIET,
      charVi: FIXTURE_CHAR_VI,
      defLevelIndex: FIXTURE_DEF_INDEX,
      polyphoneLogPath: polyphoneLog,
      vocabLookup: new Map([["上班", { pinyin: "shàng bān", meaning: "go to work" }]]),
    });

    expect(polyphones.some((p) => p.char === "上" && p.hvAmbiguous)).toBe(true);
    expect(polyphones[0]?.g2pwStatus).toBe("candidate / to-integrate");
    expect((prepared.glossary["上班"] as { hvAmbiguous?: boolean })?.hvAmbiguous).toBe(true);

    const lines = readFileSync(polyphoneLog, "utf8").trim().split("\n");
    expect(lines.length).toBeGreaterThan(0);
    const logged = JSON.parse(lines[0]!) as { char: string; hvAmbiguous: boolean };
    expect(logged.char).toBe("上");
    expect(logged.hvAmbiguous).toBe(true);
  });

  it("passes verifyReading on well-formed draft", async () => {
    const { gateReport } = await populateDualRail({
      draft: DRAFT,
      lessonTarget: TARGET,
      band: "A2",
      kind: "story",
      hanviet: FIXTURE_HANVIET,
      charVi: FIXTURE_CHAR_VI,
      defLevelIndex: FIXTURE_DEF_INDEX,
      vocabLookup: new Map([["散步", { pinyin: "sàn bù", meaning: "to take a walk" }]]),
    });
    expect(gateReport.pass).toBe(true);
  });

  it("fails gate on ungrounded cognate bridge", async () => {
    const { gateReport, prepared } = await populateDualRail({
      draft: "今天天氣很好，我想去散步。",
      lessonTarget: TARGET,
      band: "A2",
      kind: "story",
      hanviet: FIXTURE_HANVIET,
      charVi: { has: () => false },
      defLevelIndex: FIXTURE_DEF_INDEX,
      vocabLookup: new Map([["散步", { pinyin: "sàn bù", meaning: "to take a walk" }]]),
    });

    prepared.glossary["散步"]!.bridge!.morphemes = [
      { surface: "臆", etymon: "臆", reading: "dự" },
    ];

    const { verifyReading } = await import("content-pipeline");
    const report = await verifyReading({
      content: prepared,
      target: {
        lessonId: TARGET.lesson,
        ceiling: "TOCFL-3",
        cumulativeVocab: new Set(TARGET.cumulativeVocab),
        newVocab: TARGET.newVocab,
        newGrammar: ["了"],
      },
      hanviet: FIXTURE_HANVIET,
      charVi: { has: () => false },
    });

    expect(report.pass).toBe(false);
    expect(report.reasons.some((r) => r.includes("ungrounded cognate"))).toBe(true);
    expect(gateReport.pass).toBeDefined();
  });
});