import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  distinctHanzi,
  parseLessonRef,
  resolveLessonTarget,
} from "./lib/lesson-target.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const VOCAB_DIR = join(REPO_ROOT, "private", "dangdai-vocab");
const PRIVATE_DIR = join(REPO_ROOT, "private");

function loadFixtureLines(name: string): string[] {
  return readFileSync(join(VOCAB_DIR, name), "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean);
}

describe("parseLessonRef", () => {
  it("normalizes b4l3 to b4l03", () => {
    expect(parseLessonRef("b4l3")).toEqual({ book: 4, lesson: 3, canonical: "b4l03" });
    expect(parseLessonRef("B4L03")).toEqual({ book: 4, lesson: 3, canonical: "b4l03" });
  });

  it("throws on unknown lesson id", () => {
    expect(() => parseLessonRef("lesson-9")).toThrow(/unknown lesson id/i);
    expect(() => parseLessonRef("b0l1")).toThrow(/unknown lesson id/i);
  });
});

describe("resolveLessonTarget", () => {
  const opts = {
    vocabCsvPath: join(VOCAB_DIR, "dangdai.csv"),
    grammarIndexPath: join(PRIVATE_DIR, "dangdai-grammar-index.FINAL.json"),
    grammarFallbackPath: join(PRIVATE_DIR, "dangdai-grammar-index.merged.json"),
  };

  it("returns 2196 cumulative vocab and 1353 hanzi for b4l3", () => {
    const target = resolveLessonTarget("b4l3", opts);
    const fixtureTrad = loadFixtureLines("_cumulative-b4l3-trad.txt");
    const fixtureChars = [...readFileSync(join(VOCAB_DIR, "_cumulative-b4l3-chars.txt"), "utf8").trim()];

    expect(target.lesson).toBe("b4l03");
    expect(target.cumulativeVocab).toHaveLength(2196);
    expect(target.cumulativeHanzi).toHaveLength(1353);
    expect(new Set(target.cumulativeVocab)).toEqual(new Set(fixtureTrad));
    expect(new Set(target.cumulativeHanzi)).toEqual(new Set(fixtureChars));
  });

  it("returns non-empty new vocab and grammar for b4l3", () => {
    const target = resolveLessonTarget("b4l3", opts);
    expect(target.newVocab.length).toBeGreaterThan(15);
    expect(target.newGrammar.length).toBeGreaterThan(0);
    expect(target.newVocab).toContain("何必");
  });

  it("throws on unknown lesson id beyond dataset", () => {
    expect(() => resolveLessonTarget("b9l99", opts)).toThrow(/unknown lesson id/i);
    expect(() => resolveLessonTarget("b7l1", opts)).toThrow(/unknown lesson id/i);
  });

  it("distinctHanzi collects unique Han characters sorted", () => {
    expect(distinctHanzi(["你好", "好天"])).toEqual(
      ["你", "好", "天"].sort((a, b) => a.localeCompare(b, "zh-Hant")),
    );
  });
});