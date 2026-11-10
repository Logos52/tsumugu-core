import { describe, expect, it } from "vitest";
import { fuzzyMatchGrammarPoint } from "./fuzzy-match.js";
import {
  expectedCumulativeThrough,
  normalizeNameZh,
  normalizeStructureTemplate,
  tokenizeStructure,
} from "./normalize.js";

describe("grammar name and structure normalization", () => {
  it("strips punctuation, folds width, and drops brackets from names", () => {
    expect(normalizeNameZh("  ABC ")).toBe("abc");
    expect(normalizeNameZh("Ａ")).toBe("a");
    expect(normalizeNameZh("把字句（一）")).toBe("把字句一");
    expect(normalizeNameZh("Hello, World!")).toBe("helloworld");
  });

  it("collapses syntactic slot names and plus signs", () => {
    expect(normalizeStructureTemplate("Sentence + NP + VP")).toBe("s + s + s");
    expect(normalizeStructureTemplate("S+VP")).toBe("s + s");
    expect(tokenizeStructure("Sentence + NP")).toEqual(["s", "s"]);
  });

  it("pads the lesson number in a cumulative id", () => {
    expect(expectedCumulativeThrough(1, 3)).toBe("b1l03");
    expect(expectedCumulativeThrough(10, 12)).toBe("b10l12");
  });
});

describe("fuzzyMatchGrammarPoint", () => {
  it("matches the same point across spacing and a longer name", () => {
    expect(fuzzyMatchGrammarPoint("把字句", "S + 把 + O", "把字句", "S+把+O")).toBe(true);
    expect(fuzzyMatchGrammarPoint("把字句", "S + 把", "把字句", "S + 把 + O")).toBe(true);
    expect(fuzzyMatchGrammarPoint("把字句", "S + V", "把字句用法", "S + V")).toBe(true);
  });

  it("rejects an unrelated name, and an identical name with an unrelated structure", () => {
    expect(fuzzyMatchGrammarPoint("蘋果", "S + V", "香蕉", "S + V")).toBe(false);
    expect(fuzzyMatchGrammarPoint("呢", "S 呢", "了", "S 了")).toBe(false);
    expect(fuzzyMatchGrammarPoint("把字句", "A B C D E", "把字句", "Z")).toBe(false);
  });
});
