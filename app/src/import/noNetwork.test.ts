import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const NETWORK_RE = /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/;

describe("import modules have no network primitives", () => {
  it("prepareFromText.ts", async () => {
    const src = await readFile(join(import.meta.dirname, "prepareFromText.ts"), "utf8");
    expect(src).not.toMatch(NETWORK_RE);
  });

  it("importPanel.ts", async () => {
    const src = await readFile(join(import.meta.dirname, "importPanel.ts"), "utf8");
    expect(src).not.toMatch(NETWORK_RE);
  });
});