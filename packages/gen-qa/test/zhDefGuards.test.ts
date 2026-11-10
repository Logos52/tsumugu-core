import { describe, expect, it } from "vitest";
import { isCircularZhDef, isEmptyZhDef } from "../src/zhDefGuards.js";

describe("isCircularZhDef", () => {
  it("is false for an empty headword", () => {
    expect(isCircularZhDef("", "任何字", "任何字")).toBe(false);
  });

  it("is true when the gloss or the illustration contains the headword", () => {
    expect(isCircularZhDef("朋友", "朋友就是友伴", undefined)).toBe(true);
    expect(isCircularZhDef("朋友", "同伴", "他是朋友")).toBe(true);
    expect(isCircularZhDef("朋友", "同伴", "他是同學")).toBe(false);
  });
});

describe("isEmptyZhDef", () => {
  it("is true for blank glosses", () => {
    expect(isEmptyZhDef("朋友", "  ")).toBe(true);
    expect(isEmptyZhDef("朋友", "")).toBe(true);
  });

  it("is false for an empty headword with any gloss text", () => {
    expect(isEmptyZhDef("", "同伴")).toBe(false);
  });

  it("is true when the gloss is only the headword, and false when extra text remains", () => {
    expect(isEmptyZhDef("你好", "你好")).toBe(true);
    expect(isEmptyZhDef("你好", "你好你好")).toBe(true);
    expect(isEmptyZhDef("你好", "你好 你好")).toBe(true);
    expect(isEmptyZhDef("你好", "你好啊")).toBe(false);
    expect(isEmptyZhDef("你好", "你 好")).toBe(false);
  });
});
