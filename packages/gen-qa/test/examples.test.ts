import { describe, expect, it } from "vitest";
import {
  EXAMPLE_COUNT_DEFAULT,
  EXAMPLE_COUNT_MAX,
  EXAMPLE_COUNT_MIN,
  exampleTargetCount,
  isFilledExample,
  isOverlayExample,
  isSharedExample,
  seedSharedExampleSlots,
} from "../src/examples.js";

describe("exampleTargetCount", () => {
  it("stays inside the shared-example band and is stable", () => {
    expect(EXAMPLE_COUNT_MIN).toBe(3);
    expect(EXAMPLE_COUNT_MAX).toBe(6);
    expect(EXAMPLE_COUNT_DEFAULT).toBe(4);
    for (const term of ["學習", "朋友", "a", "你好", ""]) {
      const count = exampleTargetCount(term);
      expect(count).toBeGreaterThanOrEqual(EXAMPLE_COUNT_MIN);
      expect(count).toBeLessThanOrEqual(EXAMPLE_COUNT_MAX);
      expect(exampleTargetCount(term)).toBe(count);
    }
  });

  it("hashes known terms to fixed counts", () => {
    expect(exampleTargetCount("學習")).toBe(5);
    expect(exampleTargetCount("朋友")).toBe(3);
    expect(exampleTargetCount("a")).toBe(4);
    expect(exampleTargetCount("你好")).toBe(4);
    expect(exampleTargetCount("")).toBe(3);
  });
});

describe("example slots", () => {
  it("seeds empty shared generated rows for the term's target count", () => {
    const slots = seedSharedExampleSlots("學習");
    expect(slots).toHaveLength(5);
    expect(slots.every((ex) => ex.text === "" && ex.translation === "" && ex.shared === true)).toBe(
      true,
    );
    expect(slots.every((ex) => ex.source === "generated")).toBe(true);
  });

  it("treats a row as filled when either side has non-whitespace text", () => {
    expect(isFilledExample({ text: "  ", translation: "" })).toBe(false);
    expect(isFilledExample({ text: "x", translation: "" })).toBe(true);
    expect(isFilledExample({ text: "", translation: " y " })).toBe(true);
  });

  it("treats a missing shared flag as shared, and false as overlay", () => {
    expect(isSharedExample({ text: "", translation: "" })).toBe(true);
    expect(isSharedExample({ text: "", translation: "", shared: true })).toBe(true);
    expect(isSharedExample({ text: "", translation: "", shared: false })).toBe(false);
    expect(isOverlayExample({ text: "", translation: "", shared: false })).toBe(true);
    expect(isOverlayExample({ text: "", translation: "" })).toBe(false);
  });
});
