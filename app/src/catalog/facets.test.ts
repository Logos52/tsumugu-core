import { describe, expect, it } from "vitest";
import { applyFacets, facetsFromHash, facetsToHash, type CatalogFacets } from "./facets.js";
import { FIXTURE_CATALOG } from "./fixtures/catalog.js";

describe("facets round-trip", () => {
  it("is lossless for multi-select bands, kind, and binding", () => {
    const f: CatalogFacets = {
      band: ["A2", "B1"],
      kind: ["story", "dialogue"],
      topic: ["daily-life"],
      binding: { book: 4, lesson: 3 },
    };
    const restored = facetsFromHash(facetsToHash(f));
    expect(restored.band).toEqual(f.band);
    expect(restored.kind).toEqual(expect.arrayContaining(f.kind!));
    expect(restored.kind).toHaveLength(f.kind!.length);
    expect(restored.topic).toEqual(f.topic);
    expect(restored.binding).toEqual(f.binding);
  });

  it("empty facets produce empty hash and full catalog", () => {
    const f: CatalogFacets = {};
    expect(facetsToHash(f)).toBe("");
    expect(applyFacets(FIXTURE_CATALOG, f)).toHaveLength(FIXTURE_CATALOG.length);
  });
});

describe("applyFacets", () => {
  it("filters A2 readings bound to ACCC book 4", () => {
    const filtered = applyFacets(FIXTURE_CATALOG, {
      band: ["A2"],
      binding: { book: 4 },
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe("咖啡廳聊天");
  });
});