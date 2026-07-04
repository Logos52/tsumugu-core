import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { WordStore } from "@tsumugu/engine";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import { createReaderState } from "../app/state.js";
import { createWordPopup } from "../hover/wordPopup.js";
import { mountCardShell, SAMPLE_CONTENT } from "../test/fixtures.js";
import { __setTestEntries } from "../dict/dictResolve.js";

describe("bridge card", () => {
  beforeEach(() => {
    mountCardShell();
    __setTestEntries([{ id: 0, h: "望", k: "c", u: "c/望.html" }]);
  });

  afterEach(() => {
    __setTestEntries(null);
    document.body.innerHTML = "";
  });

  it("renders bridge card with morphemes on VI rail", () => {
    const state = createReaderState(SAMPLE_CONTENT, new WordStore(), {
      ...DEFAULT_SETTINGS,
      rail: "vi",
    });
    const popup = createWordPopup(state);
    const anchor = document.createElement("span");
    popup.open("望", anchor);

    const bridge = document.getElementById("cBridge");
    expect(bridge?.style.display).not.toBe("none");
    expect(document.getElementById("card")?.classList.contains("is-bridge")).toBe(true);
    expect(document.querySelectorAll(".cog").length).toBeGreaterThan(0);
    expect(document.querySelector(".bridge.draw")).not.toBeNull();
  });

  it("hides bridge and shows ennote on EN rail", () => {
    document.documentElement.dataset.rail = "en";
    const state = createReaderState(SAMPLE_CONTENT, new WordStore(), {
      ...DEFAULT_SETTINGS,
      rail: "en",
    });
    const popup = createWordPopup(state);
    popup.open("望", document.createElement("span"));

    expect(document.getElementById("cBridge")?.style.display).toBe("none");
    expect(document.getElementById("cEnNote")?.style.display).not.toBe("none");
  });

  it("no bridge block when entry lacks bridge", () => {
    const state = createReaderState(SAMPLE_CONTENT, new WordStore(), DEFAULT_SETTINGS);
    const popup = createWordPopup(state);
    popup.open("他", document.createElement("span"));
    expect(document.getElementById("card")?.classList.contains("is-bridge")).toBe(false);
  });
});