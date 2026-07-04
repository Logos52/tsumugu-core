import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { WordStore } from "@tsumugu/engine";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import { createReaderState } from "../app/state.js";
import { createWordPopup } from "../hover/wordPopup.js";
import { mountReader } from "./reader.js";
import { mountCardShell, SAMPLE_CONTENT } from "../test/fixtures.js";

describe("dual-rail", () => {
  beforeEach(() => {
    mountCardShell();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("theme/palette flip preserves word-span node identities", () => {
    const state = createReaderState(SAMPLE_CONTENT, new WordStore(), DEFAULT_SETTINGS);
    const prose = document.getElementById("prose")!;
    const reader = mountReader(prose, state, createWordPopup(state), null);

    const before = [...prose.querySelectorAll(".w")];
    document.documentElement.dataset.palette = "celadon";
    document.documentElement.dataset.theme = "dark";
    const after = [...prose.querySelectorAll(".w")];
    expect(after.length).toBe(before.length);
    for (let i = 0; i < before.length; i++) {
      expect(after[i]).toBe(before[i]);
    }
    reader.unmount();
  });

  it("reading rebuild changes ruby rt text", () => {
    const state = createReaderState(SAMPLE_CONTENT, new WordStore(), {
      ...DEFAULT_SETTINGS,
      rail: "vi",
      reading: "hv",
      gloss: "vi",
    });
    const prose = document.getElementById("prose")!;
    const reader = mountReader(prose, state, createWordPopup(state), null);

    const rtBefore = prose.querySelector('[data-word="望"] rt')?.textContent;
    state.updateSettings({ reading: "py" });
    reader.rebuildProse();
    const rtAfter = prose.querySelector('[data-word="望"] rt')?.textContent;
    expect(rtBefore).toBe("vọng");
    expect(rtAfter).toBe("wàng");
    reader.unmount();
  });
});