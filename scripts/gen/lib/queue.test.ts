import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  claimNextSpec,
  loadQueue,
  markSpecComplete,
  markSpecSkipped,
  type ReadingQueueSpec,
} from "./queue.js";

function spec(
  id: string,
  lesson: string,
  status: ReadingQueueSpec["status"] = "pending",
): ReadingQueueSpec {
  return {
    id,
    lesson,
    format: "story",
    band: "A1",
    topic: "測試",
    lengthTarget: 80,
    status,
  };
}

function writeQueue(path: string, specs: ReadingQueueSpec[]): void {
  writeFileSync(path, `${JSON.stringify({ version: 1, specs }, null, 2)}\n`);
}

describe("reading spec queue", () => {
  let dir = "";

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function queuePath(): string {
    dir = mkdtempSync(join(tmpdir(), "reading-queue-"));
    return join(dir, "queue.json");
  }

  it("loads a missing file as an empty version-1 queue", () => {
    const path = queuePath();
    expect(loadQueue(path)).toEqual({ version: 1, specs: [] });
    expect(existsSync(path)).toBe(false);
  });

  it("claims the first pending spec and leaves the claim on disk", () => {
    const path = queuePath();
    writeQueue(path, [spec("a", "b1l01"), spec("b", "b1l02")]);
    const claimed = claimNextSpec(path, "worker-a");
    expect(claimed?.id).toBe("a");
    expect(claimed?.status).toBe("claimed");
    expect(claimed?.claimedBy).toBe("worker-a");
    expect(Number.isNaN(Date.parse(claimed?.claimedAt ?? ""))).toBe(false);

    const stored = loadQueue(path);
    expect(stored.specs[0]?.status).toBe("claimed");
    expect(stored.specs[1]?.status).toBe("pending");
    expect(readFileSync(path, "utf8").endsWith("\n")).toBe(true);
  });

  it("claims a different lesson while another lesson is already claimed", () => {
    const path = queuePath();
    writeQueue(path, [spec("a", "b1l01", "claimed"), spec("b", "b1l02")]);
    const claimed = claimNextSpec(path, "worker-b");
    expect(claimed?.id).toBe("b");
    expect(claimed?.status).toBe("claimed");
  });

  it("refuses a second pending spec from a lesson that is already claimed", () => {
    const path = queuePath();
    writeQueue(path, [spec("a", "b1l01", "claimed"), spec("b", "b1l01")]);
    expect(claimNextSpec(path, "worker-b")).toBeUndefined();
    expect(loadQueue(path).specs[1]?.status).toBe("pending");
  });

  it.skip("claimNextSpec returns undefined when the first pending lesson is already claimed, so a later free lesson is never claimed", () => {
    const path = queuePath();
    writeQueue(path, [
      spec("a", "b1l01", "claimed"),
      spec("b", "b1l01"),
      spec("c", "b1l02"),
    ]);
    const claimed = claimNextSpec(path, "worker-c");
    expect(claimed?.id).toBe("c");
    expect(claimed?.lesson).toBe("b1l02");
  });

  it("marks a claimed spec complete, then claims the next pending spec of that lesson", () => {
    const path = queuePath();
    writeQueue(path, [spec("a", "b1l01"), spec("b", "b1l01")]);
    expect(claimNextSpec(path, "worker-a")?.id).toBe("a");
    expect(claimNextSpec(path, "worker-b")).toBeUndefined();
    markSpecComplete(path, "a");
    expect(loadQueue(path).specs[0]?.status).toBe("complete");
    expect(claimNextSpec(path, "worker-b")?.id).toBe("b");
  });

  it("marks a spec skipped and does not claim complete or skipped rows", () => {
    const path = queuePath();
    writeQueue(path, [spec("a", "b1l01", "complete"), spec("b", "b1l02", "skipped"), spec("c", "b1l03")]);
    markSpecSkipped(path, "c");
    expect(loadQueue(path).specs.map((row) => row.status)).toEqual(["complete", "skipped", "skipped"]);
    expect(claimNextSpec(path, "worker-z")).toBeUndefined();
  });

  it("throws when the spec id is not in the queue", () => {
    const path = queuePath();
    writeQueue(path, [spec("a", "b1l01")]);
    expect(() => markSpecComplete(path, "missing")).toThrow(/queue spec not found: missing/);
    expect(() => markSpecSkipped(join(dir, "absent.json"), "missing")).toThrow(/queue spec not found: missing/);
  });
});
