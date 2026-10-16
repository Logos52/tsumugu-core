#!/usr/bin/env tsx

import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseArgs, str, num, flag } from "@tsumugu/gen-qa";

import { runReadingPipeline } from "./reading-pipeline.js";
import { createAnthropicBatchClient } from "./lib/batchClient.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");


export const DEFAULT_OUT_DIR = join(REPO_ROOT, "app/public/vault/readings/zh-Hant");


export function resolveOutDir(opts: Record<string, string | boolean>): string {
  return str(opts, "out") ?? DEFAULT_OUT_DIR;
}

async function main(): Promise<void> {
  const { opts } = parseArgs(process.argv.slice(2));
  const queuePath = str(opts, "queue") ?? "out/reading-queue.json";
  const skipLogPath = str(opts, "skip-log") ?? "out/reading-skips.jsonl";
  const outputDir = resolveOutDir(opts);
  const lanes = num(opts, "lanes");
  const dryRun = flag(opts, "dry-run");

  if (dryRun) {
    console.log(
      `reading pipeline dry-run: queue=${queuePath} lanes=${lanes ?? 5} out=${outputDir}`,
    );
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is required for live Batches runs");
    process.exit(2);
  }

  const batchClient = createAnthropicBatchClient(apiKey);
  const outcomes = await runReadingPipeline({
    queuePath,
    skipLogPath,
    outputDir,
    lanes,
    apiKey,
    batchClient,
  });

  for (const o of outcomes) {
    console.log(`${o.status.toUpperCase()} ${o.specId}${o.preparedPath ? ` → ${o.preparedPath}` : ""}`);
  }
}


const isCliEntry =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntry) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  });
}
