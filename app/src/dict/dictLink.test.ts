import { describe, expect, it, beforeEach } from "vitest";
import { DICT_ORIGIN, dictUrlFor, readRailParams } from "./dictLink.js";

describe("dictLink", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.documentElement;
    root.dataset.script = "trad";
    root.dataset.reading = "hv";
    root.dataset.gloss = "vi";
  });

  it("origin is env-driven (default tsumugu-ed.com, not the dead core origin)", () => {
    expect(DICT_ORIGIN).toBe("https://tsumugu-ed.com");
    expect(DICT_ORIGIN).not.toBe("https://tsumugu.cc");
  });

  it("builds char URL with canonical rail query params", () => {
    expect(dictUrlFor("望", "c", { script: "trad", reading: "hv", gloss: "vi" })).toBe(
      `${DICT_ORIGIN}/c/%E6%9C%9B.html?s=trad&r=hv&g=vi`,
    );
  });

  it("builds word URL with w/ prefix", () => {
    expect(dictUrlFor("客棧", "w", { script: "trad", reading: "hv", gloss: "vi" })).toBe(
      `${DICT_ORIGIN}/w/%E5%AE%A2%E6%A3%A7.html?s=trad&r=hv&g=vi`,
    );
  });

  it("maps core internal reading axis (py) to canonical pinyin", () => {
    root.dataset.script = "simp";
    root.dataset.reading = "py";
    root.dataset.gloss = "en";
    expect(readRailParams(root)).toEqual({
      script: "simp",
      reading: "pinyin",
      gloss: "en",
    });
  });

  it("maps core internal zhuyin axes (zh, zy) to canonical zhuyin", () => {
    root.dataset.reading = "zh";
    expect(readRailParams(root).reading).toBe("zhuyin");
    root.dataset.reading = "zy";
    expect(readRailParams(root).reading).toBe("zhuyin");
  });

  it("emits canonical pinyin/en params on the EN rail dict URL", () => {
    root.dataset.script = "trad";
    root.dataset.reading = "py";
    root.dataset.gloss = "en";
    const url = dictUrlFor("望", "c", readRailParams(root));
    expect(url).toContain("?s=trad&r=pinyin&g=en");
  });
});
