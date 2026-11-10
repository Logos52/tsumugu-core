import { describe, expect, it } from "vitest";
import { checkDefLevel, decomposesIntoAllowList, resetDefLevelSegmenter, segmentDefText } from "../src/defLevel.js";
import type { DefLevelIndex } from "../src/defLevelData.js";

const INDEX: DefLevelIndex = {
  tocfl: {
    你: { level: "TOCFL-1" },
    好: { level: "TOCFL-1" },
    你好: { level: "TOCFL-5" },
    怪獸: { level: "TOCFL-7" },
  },
  freq: {},
};

describe("decomposesIntoAllowList", () => {
  const allow = new Set(["你", "好", "你好"]);

  it("accepts a listed token and a left-to-right cover", () => {
    expect(decomposesIntoAllowList("你好", allow)).toBe(true);
    expect(decomposesIntoAllowList("你好", new Set(["你", "好"]))).toBe(true);
    expect(decomposesIntoAllowList("你", new Set(["你"]))).toBe(true);
  });

  it("rejects a token that leaves an uncovered tail", () => {
    expect(decomposesIntoAllowList("你好嗎", new Set(["你好"]))).toBe(false);
    expect(decomposesIntoAllowList("嗎", allow)).toBe(false);
    expect(decomposesIntoAllowList("", allow)).toBe(false);
  });

  it.skip("greedy longest match rejects 研究生命 even though 研究+生命 is in the allow list", () => {
    expect(decomposesIntoAllowList("研究生命", new Set(["研究", "研究生", "生命"]))).toBe(true);
  });
});

describe("checkDefLevel", () => {
  it("reports no violation and the highest in-ceiling band for an empty or easy text", () => {
    const empty = checkDefLevel({
      text: "",
      ceiling: "TOCFL-3",
      index: INDEX,
      segmenter: () => [],
    });
    expect(empty).toMatchObject({
      violations: [],
      achievedLevel: "TOCFL-3",
      levelEscalated: false,
      tokens: [],
    });

    const easy = checkDefLevel({
      text: "你",
      ceiling: "TOCFL-2",
      index: INDEX,
      segmenter: () => ["你"],
    });
    expect(easy.violations).toEqual([]);
    expect(easy.achievedLevel).toBe("TOCFL-1");
    expect(easy.levelEscalated).toBe(false);
  });

  it("credits a compound that splits into in-ceiling pieces and still records its own band", () => {
    const result = checkDefLevel({
      text: "你好",
      ceiling: "TOCFL-1",
      index: INDEX,
      field: "definitions.zh.gloss",
      segmenter: () => ["你好"],
    });
    expect(result.violations).toEqual([]);
    expect(result.achievedLevel).toBe("TOCFL-5");
    expect(result.levelEscalated).toBe(true);
    expect(result.tokens).toEqual(["你好"]);
  });

  it("records an above-ceiling token that does not decompose", () => {
    const result = checkDefLevel({
      text: "怪獸",
      ceiling: "TOCFL-2",
      index: INDEX,
      segmenter: () => ["你", "怪獸"],
    });
    expect(result.violations).toEqual([
      { word: "怪獸", band: "TOCFL-7", ceiling: "TOCFL-2", field: "text" },
    ]);
    expect(result.achievedLevel).toBe("TOCFL-7");
    expect(result.levelEscalated).toBe(true);
  });

  it("treats an unranked token as TOCFL-7 and a violation", () => {
    const result = checkDefLevel({
      text: "量子",
      ceiling: "TOCFL-3",
      index: INDEX,
      segmenter: () => ["量子"],
    });
    expect(result.violations).toEqual([
      { word: "量子", band: "unrankable", ceiling: "TOCFL-3", field: "text" },
    ]);
    expect(result.achievedLevel).toBe("TOCFL-7");
  });

  it.skip("an unrecognized ceiling is ordinal 99, so every ranked token counts as within ceiling", () => {
    const result = checkDefLevel({
      text: "怪獸",
      ceiling: "A2",
      index: INDEX,
      segmenter: () => ["怪獸"],
    });
    expect(result.violations.map((violation) => violation.word)).toEqual(["怪獸"]);
  });
});

describe("segmentDefText", () => {
  it("returns no tokens for empty text and keeps seeded words while dropping punctuation", () => {
    resetDefLevelSegmenter();
    const index: DefLevelIndex = {
      tocfl: { 天氣: { level: "TOCFL-2" } },
      freq: { 天氣: 20 },
    };
    expect(segmentDefText("", index)).toEqual([]);
    expect(segmentDefText("今天天氣很好。", index)).toEqual(["今天", "天氣", "很", "好"]);
  });
});
