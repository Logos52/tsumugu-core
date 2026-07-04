import { describe, expect, it } from "vitest";

import {
  createValidFixturePoint,
  formatValidationErrors,
  validateGrammarIndex,
} from "./lib/validate.js";

describe("validateGrammarIndex", () => {
  it("passes on a valid FINAL fixture", () => {
    const result = validateGrammarIndex({
      source: "ACCC",
      edition: "1st",
      extracted: "2026-06-23",
      points: [createValidFixturePoint()],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails on a planted bad cumulative_through mismatch", () => {
    const result = validateGrammarIndex({
      source: "ACCC",
      edition: "1st",
      extracted: "2026-06-23",
      points: [
        createValidFixturePoint({
          cumulative_through: "b1l1",
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(formatValidationErrors(result.errors)).toContain(
      "cumulative_through must be b1l01, got b1l1",
    );
  });

  it("fails on duplicate pattern_id", () => {
    const point = createValidFixturePoint();
    const result = validateGrammarIndex({
      source: "ACCC",
      edition: "1st",
      extracted: "2026-06-23",
      points: [point, point],
    });

    expect(result.ok).toBe(false);
    expect(formatValidationErrors(result.errors)).toContain("duplicate pattern_id");
  });

  it("fails on empty structure_template", () => {
    const result = validateGrammarIndex({
      source: "ACCC",
      edition: "1st",
      extracted: "2026-06-23",
      points: [
        createValidFixturePoint({
          structure_template: "   ",
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(formatValidationErrors(result.errors)).toContain(
      "structure_template must be a non-empty string",
    );
  });

  it("fails when FINAL index carries merged-only status field", () => {
    const result = validateGrammarIndex({
      source: "ACCC",
      edition: "1st",
      extracted: "2026-06-23",
      points: [
        {
          ...createValidFixturePoint(),
          status: "confirmed",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(formatValidationErrors(result.errors)).toContain(
      "status must not be present in FINAL index",
    );
  });
});