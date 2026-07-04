import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

export type ReadingFormat = "story" | "dialogue" | "explainer";

export type QueueSpecStatus = "pending" | "claimed" | "complete" | "skipped";

export interface ReadingQueueSpec {
  id: string;
  lesson: string;
  format: ReadingFormat;
  band: string;
  topic: string;
  lengthTarget: number;
  status: QueueSpecStatus;
  claimedBy?: string;
  claimedAt?: string;
}

export interface ReadingQueue {
  version: 1;
  specs: ReadingQueueSpec[];
}

const MAX_LOCK_RETRIES = 8;

function sleep(ms: number): void {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    /* spin */
  }
}

export function loadQueue(path: string): ReadingQueue {
  if (!existsSync(path)) {
    return { version: 1, specs: [] };
  }
  return JSON.parse(readFileSync(path, "utf8")) as ReadingQueue;
}

export function saveQueue(path: string, queue: ReadingQueue): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  renameSync(tmp, path);
}

/** CAS claim: mark the first pending spec claimed by `workerId`. */
export function claimNextSpec(
  path: string,
  workerId: string,
): ReadingQueueSpec | undefined {
  for (let attempt = 0; attempt < MAX_LOCK_RETRIES; attempt++) {
    const queue = loadQueue(path);
    const candidate = queue.specs.find((s) => s.status === "pending");
    if (!candidate) return undefined;

    const overlap = queue.specs.some(
      (s) => s.status === "claimed" && s.id !== candidate.id && s.lesson === candidate.lesson,
    );
    if (overlap) return undefined;

    candidate.status = "claimed";
    candidate.claimedBy = workerId;
    candidate.claimedAt = new Date().toISOString();

    try {
      saveQueue(path, queue);
      return candidate;
    } catch {
      sleep(10 + attempt * 5);
    }
  }
  return undefined;
}

export function markSpecComplete(path: string, specId: string): void {
  const queue = loadQueue(path);
  const spec = queue.specs.find((s) => s.id === specId);
  if (!spec) throw new Error(`queue spec not found: ${specId}`);
  spec.status = "complete";
  saveQueue(path, queue);
}

export function markSpecSkipped(path: string, specId: string): void {
  const queue = loadQueue(path);
  const spec = queue.specs.find((s) => s.id === specId);
  if (!spec) throw new Error(`queue spec not found: ${specId}`);
  spec.status = "skipped";
  saveQueue(path, queue);
}