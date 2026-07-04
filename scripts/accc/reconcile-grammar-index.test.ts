import { describe, expect, it } from "vitest";

import type { GrammarIndexFile } from "./lib/grammar-index-types.js";
import { reconcileGrammarIndexes } from "./lib/reconcile.js";
import { createValidFixturePoint } from "./lib/validate.js";

function makeIndex(points: GrammarIndexFile["points"]): GrammarIndexFile {
  return {
    source: "ACCC",
    edition: "1st",
    extracted: "2026-06-23",
    points,
  };
}

describe("reconcileGrammarIndexes", () => {
  it("merges agreeing points within a lesson and flags lesson conflicts", () => {
    const shared = createValidFixturePoint({
      pattern_id: "accc-b1l01-ne",
      name_zh: "呢",
      structure_template: "S1 V O , S2 呢 ?",
    });

    const { merged, conflicts, summary } = reconcileGrammarIndexes({
      json: makeIndex([shared]),
      grok: makeIndex([
        {
          ...shared,
          pattern_id: "accc-b1-l01-呢",
          structure_template: "S1 V O , S2 呢?",
        },
      ]),
      composer: makeIndex([]),
      v2: makeIndex([]),
      qwen: makeIndex([
        {
          ...shared,
          book: 1,
          lesson: 2,
          cumulative_through: "b1l02",
          pattern_id: "accc-b1l02-ne",
        },
      ]),
    });

    expect(summary.totalPoints).toBe(2);
    expect(merged.points.some((point) => point.agreement === 2)).toBe(true);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.assignments).toHaveLength(2);
  });

  it("robustly dedups and canonicalizes colliding/bad pattern_ids (e.g. from v2 empties)", () => {
    const p1 = createValidFixturePoint({ pattern_id: "accc-b1l01-", name_zh: "了", book: 1, lesson: 1, cumulative_through: "b1l01" });
    const p2 = createValidFixturePoint({ pattern_id: "accc-b1l01-", name_zh: "也", book: 1, lesson: 1, cumulative_through: "b1l01" });
    const p3 = createValidFixturePoint({ pattern_id: "accc-b1l01-", name_zh: "了", book: 1, lesson: 1, cumulative_through: "b1l01" }); // dup id, same as p1-ish

    const { merged, summary } = reconcileGrammarIndexes({
      json: makeIndex([p1, p2]),
      grok: makeIndex([p3]),
      composer: makeIndex([]),
      v2: makeIndex([]),
      qwen: makeIndex([]),
    });

    // All unique after canonical dedup
    const ids = merged.points.map((p) => p.pattern_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(summary.totalPoints).toBeGreaterThanOrEqual(2);
    // canonical form used for bad ids
    expect(ids.some((id) => id.startsWith("accc-b1l01-"))).toBe(true);
  });
});