import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { WordStore } from "@tsumugu/engine";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import { createReaderState } from "../app/state.js";
import { createWordPopup } from "./wordPopup.js";
import { mountCardShell, SAMPLE_CONTENT } from "../test/fixtures.js";
import { __setTestEntries } from "../dict/dictResolve.js";

function fixedClock(iso: string) {
  return { now: () => new Date(iso) };
}

describe("wordPopup lookup-is-capture", () => {
  beforeEach(() => {
    localStorage.clear();
    mountCardShell();
    __setTestEntries([{ id: 0, h: "望", k: "c", u: "c/望.html" }]);
  });

  afterEach(() => {
    __setTestEntries(null);
    document.body.innerHTML = "";
  });

  it("recordSeen on first open — idempotent second open bumps seenCount", () => {
    const store = new WordStore();
    const clock = fixedClock("2026-06-23T12:00:00.000Z");
    const state = createReaderState(SAMPLE_CONTENT, store, DEFAULT_SETTINGS, clock);

    const popup = createWordPopup(state);
    const anchor = document.createElement("span");

    popup.open("望", anchor);
    expect(store.getStatus("zh-Hant", "望")).toBe("1");
    expect(store.get("zh-Hant", "望")?.seenCount).toBe(1);
    expect(store.get("zh-Hant", "望")?.firstSeen).toBe("2026-06-23T12:00:00.000Z");

    popup.open("望", anchor);
    expect(store.get("zh-Hant", "望")?.seenCount).toBe(2);
    expect(store.getStatus("zh-Hant", "望")).toBe("1");
  });

  it("hides the Form box when the entry carries no form data", async () => {
    const store = new WordStore();
    const clock = fixedClock("2026-06-23T12:00:00.000Z");
    const state = createReaderState(SAMPLE_CONTENT, store, DEFAULT_SETTINGS, clock);

    const popup = createWordPopup(state);
    const anchor = document.createElement("span");
    popup.open("望", anchor);

    // let the shard lookup + form paint settle
    await Promise.resolve();
    await Promise.resolve();

    const card = document.getElementById("card");
    expect(card?.querySelector(".tsg-form")).toBeNull();
  });
});