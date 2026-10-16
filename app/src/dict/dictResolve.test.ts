import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { __setTestEntries, dictIndexBase, resolveKind, lookupShardEntry, searchEdShards } from "./dictResolve.js";

describe("dictResolve", () => {
  beforeEach(() => {
    __setTestEntries([
      { id: 0, h: "望", k: "c", u: "c/望.html" },
      { id: 1, h: "客棧", k: "w", u: "w/客棧.html", g: "to gaze", gv: "ngắm", hve: "vọng" },
    ]);
  });

  afterEach(() => {
    __setTestEntries(null);
  });

  it("derives a base-relative index root from BASE_URL (not a hardcoded absolute)", () => {
    const base = import.meta.env.BASE_URL || "/";
    expect(dictIndexBase()).toBe(`${base.replace(/\/$/, "")}/dict-search`);
    
    expect(dictIndexBase().endsWith("/")).toBe(false);
  });

  it("resolves multi-char word to w", async () => {
    expect(await resolveKind("客棧")).toBe("w");
  });

  it("resolves single char to c", async () => {
    expect(await resolveKind("望")).toBe("c");
  });

  it("falls back to c for absent headword on first CJK char", async () => {
    expect(await resolveKind("龘")).toBe("c");
  });

  it("never returns grammar kind g", async () => {
    __setTestEntries([{ id: 0, h: "過", k: "g", u: "g/guo.html" }]);
    expect(await resolveKind("過")).toBe("c");
  });

  it("lookupShardEntry returns richer data incl HanViet", async () => {
    const e = await lookupShardEntry("客棧");
    expect(e?.k).toBe("w");
    expect(e?.hve).toBe("vọng");
    expect(e?.g).toContain("gaze");
  });

  it("searchEdShards finds by head or gloss/HanViet", async () => {
    const hits = await searchEdShards("vọng", 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.h).toBe("客棧");
    const byGloss = await searchEdShards("to gaze");
    expect(byGloss.length).toBeGreaterThan(0);
  });
});