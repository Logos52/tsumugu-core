// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import {
  PREFS_MIRROR_KEY,
  PREFS_MIRROR_VERSION,
  toPrefsMirror,
  writePrefsMirror,
  type PrefsMirror,
} from "./prefsMirror.js";

describe("prefsMirror (C6)", () => {
  beforeEach(() => localStorage.clear());

  it("projects only the federation-facing subset, versioned", () => {
    const m = toPrefsMirror({ ...DEFAULT_SETTINGS, script: "simp", reading: "hv", gloss: "vi", theme: "dark", palette: "sumi" });
    expect(m).toEqual({
      v: PREFS_MIRROR_VERSION,
      updatedAt: expect.any(String),
      script: "simp",
      reading: "hv",
      gloss: "vi",
      theme: "dark",
      palette: "sumi",
    });
  });

  it("writes the mirror key when a pref changes", () => {
    writePrefsMirror({ ...DEFAULT_SETTINGS, palette: "celadon" });
    const first = JSON.parse(localStorage.getItem(PREFS_MIRROR_KEY)!) as PrefsMirror;
    expect(first.palette).toBe("celadon");

    writePrefsMirror({ ...DEFAULT_SETTINGS, palette: "loom", theme: "dark" });
    const second = JSON.parse(localStorage.getItem(PREFS_MIRROR_KEY)!) as PrefsMirror;
    expect(second.palette).toBe("loom");
    expect(second.theme).toBe("dark");
  });
});
