import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_RAIL,
  getPrefs,
  restore,
  setPalette,
  setTheme,
} from "./prefs.js";

describe("prefs", () => {
  let root: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    root = document.documentElement;
    for (const key of ["palette", "theme", "rail", "reading", "script", "gloss"]) {
      delete root.dataset[key as keyof DOMStringMap];
    }
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to seal-red light with EN rail when no attributes", () => {
    const prefs = restore(root);
    expect(prefs.palette).toBe("seal");
    expect(prefs.theme).toBe("light");
    expect(prefs.rail).toBe(DEFAULT_RAIL);
    expect(root.dataset.palette).toBe("seal");
    expect(root.dataset.theme).toBe("light");
    expect(root.dataset.rail).toBe("en");
  });

  it("persists palette switches via attributes only", () => {
    restore(root);
    setPalette("celadon", root);
    expect(root.dataset.palette).toBe("celadon");
    expect(getPrefs().palette).toBe("celadon");

    const fresh = document.createElement("html") as HTMLElement;
    const reloaded = restore(fresh);
    expect(reloaded.palette).toBe("celadon");
    expect(fresh.dataset.palette).toBe("celadon");

    setPalette("navy", fresh);
    setTheme("dark", fresh);
    expect(fresh.dataset.palette).toBe("navy");
    expect(fresh.dataset.theme).toBe("dark");
  });
});