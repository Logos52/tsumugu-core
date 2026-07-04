// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { WordStore } from "@tsumugu/engine";
import {
  KNOWN_CHARS_KEY,
  TINT_RULE,
  deriveKnownChars,
  writeKnownChars,
  type KnownCharsMirror,
} from "./knownChars.js";

describe("knownChars derivation (C5)", () => {
  beforeEach(() => localStorage.clear());

  it("tints an exactly-known single character", () => {
    const store = new WordStore();
    store.setStatus("zh-Hant", "山", "known");
    expect(deriveKnownChars(store)).toContain("山");
  });

  it("tints every character inside a known multi-char word", () => {
    const store = new WordStore();
    store.setStatus("zh-Hant", "朋友", "known");
    const chars = deriveKnownChars(store);
    expect(chars).toContain("朋");
    expect(chars).toContain("友");
  });

  it("does not tint characters of an unknown word", () => {
    const store = new WordStore();
    store.setStatus("zh-Hant", "困難", "2"); // still learning
    const chars = deriveKnownChars(store);
    expect(chars).not.toContain("困");
    expect(chars).not.toContain("難");
  });

  it("writes a versioned, rule-stamped mirror to localStorage", () => {
    const store = new WordStore();
    store.setStatus("zh-Hant", "學", "known");
    writeKnownChars(store, "zh-Hant", "2026-07-02T00:00:00.000Z");
    const raw = localStorage.getItem(KNOWN_CHARS_KEY);
    expect(raw).toBeTruthy();
    const payload = JSON.parse(raw!) as KnownCharsMirror;
    expect(payload.v).toBe(1);
    expect(payload.rule).toBe(TINT_RULE);
    expect(payload.chars).toContain("學");
  });
});
