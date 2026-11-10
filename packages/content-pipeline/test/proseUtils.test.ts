import { describe, expect, it } from "vitest";
import {
  hanCount,
  isCompleteSentence,
  paragraphWordCounts,
  sentenceOpenerBigram,
  splitParagraphs,
  splitSentences,
  topRepetitionOffender,
} from "../src/proseUtils.js";

describe("prose splitting", () => {
  it("counts Han characters, including the extension block", () => {
    expect(hanCount("a漢b字")).toBe(2);
    expect(hanCount("")).toBe(0);
    expect(hanCount("\u3400")).toBe(1);
  });

  it("accepts a sentence that ends in full stop, exclamation, or question after closers", () => {
    expect(isCompleteSentence("我很好。")).toBe(true);
    expect(isCompleteSentence("我很好！")).toBe(true);
    expect(isCompleteSentence("我很好？")).toBe(true);
    expect(isCompleteSentence("「我很好。」")).toBe(true);
    expect(isCompleteSentence("我很好。  ")).toBe(true);
    expect(isCompleteSentence("我很好")).toBe(false);
    expect(isCompleteSentence("」")).toBe(false);
    expect(isCompleteSentence("")).toBe(false);
    expect(isCompleteSentence("好.")).toBe(false);
  });

  it("splits on sentence punctuation and keeps a trailing fragment", () => {
    expect(splitSentences("甲。乙！丙？")).toEqual(["甲。", "乙！", "丙？"]);
    expect(splitSentences("  甲。  乙")).toEqual(["甲。", "乙"]);
    expect(splitSentences("甲…乙。")).toEqual(["甲…乙。"]);
    expect(splitSentences("沒有標點")).toEqual(["沒有標點"]);
    expect(splitSentences("")).toEqual([]);
  });

  it("splits paragraphs on blank lines only", () => {
    expect(splitParagraphs("甲\n\n乙")).toEqual(["甲", "乙"]);
    expect(splitParagraphs("甲\n乙")).toEqual(["甲\n乙"]);
    expect(splitParagraphs("甲\n \n乙")).toEqual(["甲", "乙"]);
    expect(splitParagraphs("")).toEqual([""]);
    expect(splitParagraphs("  ")).toEqual([""]);
  });

  it("reads the first two Han characters as the opener", () => {
    expect(sentenceOpenerBigram("「我很好。")).toBe("我很");
    expect(sentenceOpenerBigram("a我")).toBe("我");
    expect(sentenceOpenerBigram("abc")).toBe("");
  });
});

describe("paragraph repetition", () => {
  it("counts words and picks the first strictly highest ratio", () => {
    const counts = paragraphWordCounts(["朋友", "朋友", "我"]);
    expect(counts.total).toBe(3);
    expect(counts.byWord.get("朋友")).toBe(2);
    expect(topRepetitionOffender(counts.byWord, counts.total)).toEqual({
      word: "朋友",
      count: 2,
      ratio: 2 / 3,
    });

    const tie = paragraphWordCounts(["我", "你"]);
    expect(topRepetitionOffender(tie.byWord, tie.total)?.word).toBe("我");
    expect(topRepetitionOffender(new Map(), 0)).toBeUndefined();
  });
});
