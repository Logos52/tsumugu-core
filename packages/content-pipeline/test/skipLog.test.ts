import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appendSkipLog } from "content-pipeline/skipLog";

function report(reasons: string[]) {
  return {
    pass: false,
    reasons,
    achievedLevel: "TOCFL-5",
    aboveBandTokens: [],
    ciMeasured: 0.4,
    newTargetRecycle: [],
    scriptLeaks: [],
    bridgeFailures: [],
    polyphoneRisks: [],
  };
}

describe("appendSkipLog", () => {
  let dir = "";

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("appends one JSON line per skip, creating the parent directory", () => {
    dir = mkdtempSync(join(tmpdir(), "skip-log-"));
    const logPath = join(dir, "nested", "skips.jsonl");
    appendSkipLog(report(["above-band: 怪獸"]), "readings/a.prepared.json", logPath);
    appendSkipLog(report(["script: 学"]), "readings/b.prepared.json", logPath);

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0] ?? "") as { ts: string; path: string; reasons: string[] };
    const second = JSON.parse(lines[1] ?? "") as { path: string; reasons: string[] };
    expect(Number.isNaN(Date.parse(first.ts))).toBe(false);
    expect(first.path).toBe("readings/a.prepared.json");
    expect(first.reasons).toEqual(["above-band: 怪獸"]);
    expect(second.path).toBe("readings/b.prepared.json");
    expect(second.reasons).toEqual(["script: 学"]);
  });
});
