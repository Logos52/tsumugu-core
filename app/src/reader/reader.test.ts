import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { WordStore, statusColorClass } from "@tsumugu/engine";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import { createReaderState } from "../app/state.js";
import { createWordPopup } from "../hover/wordPopup.js";
import { mountReader } from "./reader.js";
import { mountCardShell, SAMPLE_CONTENT } from "../test/fixtures.js";
import { __setTestEntries } from "../dict/dictResolve.js";

describe("mountReader", () => {
  beforeEach(() => {
    localStorage.clear();
    mountCardShell();
    __setTestEntries([
      { id: 0, h: "望", k: "c", u: "c/望.html" },
      { id: 1, h: "客棧", k: "w", u: "w/客棧.html" },
    ]);
  });

  afterEach(() => {
    __setTestEntries(null);
    document.body.innerHTML = "";
  });

  it("renders anonymous reading with empty WordStore — no status classes when knownStateOff", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const store = new WordStore();
    const state = createReaderState(SAMPLE_CONTENT, store, {
      ...DEFAULT_SETTINGS,
      knownStateOn: false,
    });
    const prose = document.getElementById("prose")!;
    const popup = createWordPopup(state);
    mountReader(prose, state, popup, null);

    const words = prose.querySelectorAll(".w");
    expect(words.length).toBe(3);
    for (const w of words) {
      expect([...w.classList].some((c) => c.startsWith("tsg-status-"))).toBe(false);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("lookup-is-capture: opening card records seen and recolors", async () => {
    const store = new WordStore();
    const state = createReaderState(SAMPLE_CONTENT, store, {
      ...DEFAULT_SETTINGS,
      knownStateOn: true,
    });
    const prose = document.getElementById("prose")!;
    const popup = createWordPopup(state);
    mountReader(prose, state, popup, null);

    const span = prose.querySelector('[data-word="望"]') as HTMLElement;
    popup.open("望", span);

    expect(store.has("zh-Hant", "望")).toBe(true);
    expect(store.get("zh-Hant", "望")?.seenCount).toBe(1);
    expect(span.classList.contains(statusColorClass("1"))).toBe(true);

    const dict = document.getElementById("aDict") as HTMLAnchorElement;
    expect(dict.tagName).toBe("A");
    expect(dict.target).toBe("_blank");
    expect(dict.rel).toBe("noopener");
    await vi.waitFor(() => expect(dict.href).toContain("tsumugu-ed.com"));
  });

  it("grade flow: known hotkey sets status and persists", () => {
    const store = new WordStore();
    const state = createReaderState(SAMPLE_CONTENT, store, {
      ...DEFAULT_SETTINGS,
      knownStateOn: true,
    });
    const prose = document.getElementById("prose")!;
    const popup = createWordPopup(state);
    mountReader(prose, state, popup, null);

    const span = prose.querySelector('[data-word="望"]') as HTMLElement;
    span.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));

    expect(store.getStatus("zh-Hant", "望")).toBe("known");
    expect(span.classList.contains(statusColorClass("known"))).toBe(true);
    expect(localStorage.getItem("tsumugu-core/word-store")).toContain("known");
  });

  it("marks lesson new-target words with .nw", () => {
    const store = new WordStore();
    const state = createReaderState(SAMPLE_CONTENT, store, DEFAULT_SETTINGS);
    const prose = document.getElementById("prose")!;
    const popup = createWordPopup(state);
    mountReader(prose, state, popup, null);

    expect(prose.querySelector('[data-word="望"]')?.classList.contains("nw")).toBe(true);
    expect(prose.querySelector('[data-word="他"]')?.classList.contains("nw")).toBe(false);
  });
});