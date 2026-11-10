import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  allowListWords,
  buildAllowList,
  freqRankToTocflBand,
  loadDefLevelIndex,
  resolveDefFloorBand,
  resolveTokenBand,
  tocflBandFromOrdinal,
  tocflOrdinal,
  type DefLevelIndex,
} from "@tsumugu/gen-qa";

const INDEX: DefLevelIndex = {
  tocfl: {
    你: { level: "TOCFL-1" },
    好: { level: "TOCFL-1" },
    你好: { level: "TOCFL-5" },
  },
  freq: {
    你: 9000,
    好: 10,
    工作: 100,
  },
};

describe("TOCFL band mapping", () => {
  it("parses TOCFL-N and treats anything else as unranked", () => {
    expect(tocflOrdinal("TOCFL-1")).toBe(1);
    expect(tocflOrdinal("TOCFL-7")).toBe(7);
    expect(tocflOrdinal("tocfl-1")).toBe(99);
    expect(tocflOrdinal("TOCFL-")).toBe(99);
    expect(tocflOrdinal("A2")).toBe(99);
  });

  it("clamps ordinals into TOCFL-1..TOCFL-7", () => {
    expect(tocflBandFromOrdinal(1)).toBe("TOCFL-1");
    expect(tocflBandFromOrdinal(7)).toBe("TOCFL-7");
    expect(tocflBandFromOrdinal(0)).toBe("TOCFL-1");
    expect(tocflBandFromOrdinal(99)).toBe("TOCFL-7");
  });

  it("maps frequency ranks on the documented cut points", () => {
    expect(freqRankToTocflBand(0)).toBe("TOCFL-1");
    expect(freqRankToTocflBand(800)).toBe("TOCFL-1");
    expect(freqRankToTocflBand(801)).toBe("TOCFL-2");
    expect(freqRankToTocflBand(1500)).toBe("TOCFL-2");
    expect(freqRankToTocflBand(1501)).toBe("TOCFL-3");
    expect(freqRankToTocflBand(3000)).toBe("TOCFL-3");
    expect(freqRankToTocflBand(3001)).toBe("TOCFL-4");
    expect(freqRankToTocflBand(6000)).toBe("TOCFL-4");
    expect(freqRankToTocflBand(6001)).toBe("TOCFL-5");
    expect(freqRankToTocflBand(12000)).toBe("TOCFL-5");
    expect(freqRankToTocflBand(12001)).toBe("TOCFL-6");
    expect(freqRankToTocflBand(25000)).toBe("TOCFL-6");
    expect(freqRankToTocflBand(25001)).toBe("TOCFL-7");
  });
});

describe("token bands and allow lists", () => {
  it("prefers an official TOCFL row over a frequency rank", () => {
    expect(resolveTokenBand("你", INDEX)).toBe("TOCFL-1");
    expect(resolveTokenBand("工作", INDEX)).toBe("TOCFL-1");
    expect(resolveTokenBand("沒有", INDEX)).toBe("unrankable");
  });

  it("keeps in-ceiling words and lets an official row block a friendlier rank", () => {
    const allow = buildAllowList("TOCFL-1", INDEX);
    expect(allow.has("你")).toBe(true);
    expect(allow.has("好")).toBe(true);
    expect(allow.has("工作")).toBe(true);
    expect(allow.has("你好")).toBe(false);
    expect(allowListWords("TOCFL-1", INDEX)).toEqual(["你", "好", "工作"]);
  });
});

describe("resolveDefFloorBand", () => {
  const key = "TSUMUGU_DEF_FLOOR_BAND";

  afterEach(() => {
    delete process.env[key];
  });

  it("uses the explicit band, then the env, then TOCFL-3", () => {
    expect(resolveDefFloorBand()).toBe("TOCFL-3");
    expect(resolveDefFloorBand("TOCFL-1")).toBe("TOCFL-1");
    process.env[key] = "  TOCFL-6  ";
    expect(resolveDefFloorBand()).toBe("TOCFL-6");
    expect(resolveDefFloorBand("TOCFL-2")).toBe("TOCFL-2");
  });

  it("rejects a band outside TOCFL-1..TOCFL-7", () => {
    process.env[key] = "TOCFL-8";
    expect(() => resolveDefFloorBand()).toThrow(/invalid def floor band "TOCFL-8"/);
    expect(() => resolveDefFloorBand("A2")).toThrow(/invalid def floor band "A2"/);
  });
});

describe("loadDefLevelIndex", () => {
  let dir = "";

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("throws when tocfl.json or freq.json is missing", () => {
    dir = mkdtempSync(join(tmpdir(), "def-level-"));
    expect(() => loadDefLevelIndex(dir)).toThrow(/def-level data missing/);
  });

  it("loads tocfl, freq, and optional cedict keys from a directory", () => {
    dir = mkdtempSync(join(tmpdir(), "def-level-"));
    writeFileSync(join(dir, "tocfl.json"), JSON.stringify({ 你: { level: "TOCFL-1" } }));
    writeFileSync(join(dir, "freq.json"), JSON.stringify({ 你: 10 }));
    const withoutCedict = loadDefLevelIndex(dir);
    expect(withoutCedict.tocfl).toEqual({ 你: { level: "TOCFL-1" } });
    expect(withoutCedict.freq).toEqual({ 你: 10 });
    expect(withoutCedict.cedictWords).toBeUndefined();

    writeFileSync(join(dir, "cedict.json"), JSON.stringify({ 你: {}, 好: {} }));
    const withCedict = loadDefLevelIndex(dir);
    expect(withCedict.cedictWords).toEqual(["你", "好"]);
  });
});
