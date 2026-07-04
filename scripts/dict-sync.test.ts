import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkFreshness, copyFullSet, shardManifest } from "./dict-sync.js";

let work: string;
let source: string;
let dest: string;

beforeEach(() => {
  work = join(tmpdir(), `dict-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  source = join(work, "source");
  dest = join(work, "dest");
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

function seed(dir: string, files: Record<string, string>): void {
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body, "utf8");
  }
}

describe("dict-sync freshness gate", () => {
  it("fails loudly when the ed source is absent (ED-REPO-BLOCKED)", () => {
    const res = checkFreshness(join(work, "nope"), dest);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/ED-REPO-BLOCKED/);
  });

  it("fails when the vendored copy is empty", () => {
    seed(source, { "entries-meta.json": JSON.stringify({ count: 3 }), "entries-0.json": "[]" });
    mkdirSync(dest, { recursive: true });
    const res = checkFreshness(source, dest);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/empty/);
  });

  it("fails on a stale/undersized vendored set (hash drift)", () => {
    seed(source, {
      "entries-meta.json": JSON.stringify({ count: 10260 }),
      "entries-0.json": "[1,2,3]",
      "cjk-0.json": "[9]",
    });
    // vendored is missing the newer family → stale
    seed(dest, { "entries-meta.json": JSON.stringify({ count: 10178 }), "entries-0.json": "[1,2,3]" });
    const res = checkFreshness(source, dest);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/STALE/);
  });

  it("passes once the vendored copy mirrors the full source set", () => {
    seed(source, {
      "entries-meta.json": JSON.stringify({ count: 10260 }),
      "entries-0.json": "[1,2,3]",
      "cjk-0.json": "[9]",
      "pinyin-0.json": "[7]",
    });
    const m = copyFullSet(source, dest);
    expect(m.files).toBe(4);
    expect(m.rows).toBe(10260);
    const res = checkFreshness(source, dest);
    expect(res.ok).toBe(true);
    expect(res.reason).toMatch(/fresh/);
  });

  it("copyFullSet removes stale vendored shards not present in source", () => {
    seed(source, { "entries-meta.json": JSON.stringify({ count: 1 }), "entries-0.json": "[1]" });
    seed(dest, { "stale-legacy.json": "[0]" });
    copyFullSet(source, dest);
    const m = shardManifest(dest);
    expect(m.files).toBe(2); // only source files remain
  });

  it("copyFullSet throws loudly when source is absent", () => {
    expect(() => copyFullSet(join(work, "nope"), dest)).toThrow(/ED-REPO-BLOCKED/);
  });
});
