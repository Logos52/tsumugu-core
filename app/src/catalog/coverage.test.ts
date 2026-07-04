import { describe, expect, it } from "vitest";
import { hasKnownWords, percentKnown, perBandCounts, readingBand, libraryHealthScan, generateDailyDigestThinStrip, reverseLinksForWord } from "./coverage.js";
import { FIXTURE_CATALOG } from "./fixtures/catalog.js";

describe("percentKnown", () => {
  it("counts known token occurrences from wordCounts", () => {
    const pct = percentKnown(
      { 山: 2, 水: 1 },
      3,
      (w) => (w === "山" ? "known" : "1"),
    );
    expect(pct).toBeCloseTo(66.7, 1);
  });
});

describe("readingBand", () => {
  it("classifies in-range, stretch, and outgrown", () => {
    expect(readingBand(85)).toBe("in-range");
    expect(readingBand(70)).toBe("stretch");
    expect(readingBand(97)).toBe("outgrown");
  });
});

describe("perBandCounts", () => {
  it("returns per-band counts matching fixture composition", () => {
    expect(perBandCounts(FIXTURE_CATALOG)).toEqual({ A1: 2, A2: 2, B1: 1 });
  });
});

describe("hasKnownWords", () => {
  it("is false when no words are known", () => {
    expect(hasKnownWords({ 山: 2 }, () => "1")).toBe(false);
  });

  it("is true when at least one word is known", () => {
    expect(hasKnownWords({ 山: 2, 水: 1 }, (w) => (w === "山" ? "known" : "1"))).toBe(true);
  });
});



describe("library health scan + digest + reverse (Phase2/polish)", () => {
  it("scans for stale/orphan issues", () => {
    const r = libraryHealthScan(FIXTURE_CATALOG);
    expect(typeof r.ok).toBe("boolean");
    expect(r.scanned).toBeGreaterThan(0);
  });
  it("generates thin strip digest", () => {
    const d = generateDailyDigestThinStrip(FIXTURE_CATALOG);
    expect(d.date).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(Array.isArray(d.recent)).toBe(true);
  });
  it("reverse links stub finds usages", () => {
    const links = reverseLinksForWord("早", FIXTURE_CATALOG);
    expect(Array.isArray(links)).toBe(true);
  });
});