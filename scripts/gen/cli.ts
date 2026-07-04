#!/usr/bin/env tsx
/**
 * `pnpm gen:reading` — leveled-reading Batches pipeline (env-gated).
 *
 *   pnpm gen:reading --queue out/reading-queue.json [--lanes 5] [--dry-run]
 *
 * Gen→publisher seam: `--out` defaults to the static vault readings directory the
 * publisher (`pipeline/publish-readings.ts`) scans, so generated `*.prepared.json`
 * land where `pnpm publish:readings` expects them (see docs/handoffs/README.md).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseArgs, str, num, flag } from "@tsumugu/gen-qa";

import { runReadingPipeline } from "./reading-pipeline.js";
import { createAnthropicBatchClient } from "./lib/batchClient.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Default gen output = the vault readings directory the publisher scans. Absolute
 * (repo-root anchored) so the default target is stable regardless of cwd. The
 * generator writes prepared JSON here; the publisher then emits `__readings.json`.
 * (This lane defaults the PATH only — it never writes to the vault itself.)
 */
export const DEFAULT_OUT_DIR = join(REPO_ROOT, "app/public/vault/readings/zh-Hant");

/** Resolve the output dir: explicit `--out` wins, else the publisher's vault path. */
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

// Run only as a CLI entry (never on import, so tests can pull resolveOutDir).
const isCliEntry =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntry) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  });
}
