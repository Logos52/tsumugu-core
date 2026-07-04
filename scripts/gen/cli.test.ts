import { describe, expect, it } from "vitest";
import { parseArgs } from "@tsumugu/gen-qa";
import { DEFAULT_OUT_DIR, resolveOutDir } from "./cli.js";

describe("gen cli --out (gen→publisher seam)", () => {
  it("defaults --out to the publisher's vault readings directory", () => {
    const { opts } = parseArgs([]);
    expect(resolveOutDir(opts)).toBe(DEFAULT_OUT_DIR);
    // The default target is exactly the directory publish-readings.ts scans.
    expect(DEFAULT_OUT_DIR.endsWith("app/public/vault/readings/zh-Hant")).toBe(true);
  });

  it("lets an explicit --out override the default", () => {
    const { opts } = parseArgs(["--out", "out/readings"]);
    expect(resolveOutDir(opts)).toBe("out/readings");
  });
});
