import { describe, it, expect } from "vitest";

import { execFileSync } from "node:child_process";

import { PKG_DIR } from "./readingChecks.test.part2.js";

describe("reading-checks CLI", () => {
  it("prints OK with exit 0 for the clean fixture", () => {
    const out = execFileSync(
      "pnpm",
      [
        "exec",
        "tsx",
        "src/cli.ts",
        "--def-index",
        "test/fixtures/def-index.json",
        "test/fixtures/clean.prepared.json",
      ],
      { cwd: PKG_DIR, encoding: "utf8" },
    );
    expect(out).toContain("OK");
    expect(out).toContain("clean.prepared.json");
  });

  it("prints FAIL with exit nonzero for a planted-fail fixture", () => {
    let exitCode = 0;
    try {
      execFileSync(
        "pnpm",
        [
          "exec",
          "tsx",
          "src/cli.ts",
          "--def-index",
          "test/fixtures/def-index.json",
          "test/fixtures/above-band.prepared.json",
        ],
        { cwd: PKG_DIR, encoding: "utf8" },
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 1;
      const combined = `${e.stdout ?? ""}${e.stderr ?? ""}`;
      expect(combined).toContain("FAIL");
      expect(combined).toContain("above-band.prepared.json");
    }
    expect(exitCode).not.toBe(0);
  });
});
