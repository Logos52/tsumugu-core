#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");


export const ED_SEARCH_SOURCE = resolve(REPO_ROOT, "../tsumugu-ed/exports/site/assets/search");

export const DICT_DEST = resolve(REPO_ROOT, "app/public/dict-search");

export interface ShardManifest {
  files: number;
  bytes: number;
  
  rows: number;
  
  hash: string;
}


function shardFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .sort();
}

function readRows(dir: string): number {
  const meta = join(dir, "entries-meta.json");
  if (!existsSync(meta)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(meta, "utf8")) as { count?: number };
    return typeof parsed.count === "number" ? parsed.count : 0;
  } catch {
    return 0;
  }
}


export function shardManifest(dir: string): ShardManifest {
  const files = shardFiles(dir);
  const h = createHash("sha256");
  let bytes = 0;
  for (const name of files) {
    const buf = readFileSync(join(dir, name));
    bytes += buf.length;
    h.update(name);
    h.update("\0");
    h.update(buf);
    h.update("\0");
  }
  return { files: files.length, bytes, rows: readRows(dir), hash: h.digest("hex") };
}

export interface FreshnessResult {
  ok: boolean;
  reason: string;
  source?: ShardManifest;
  dest?: ShardManifest;
}


export function checkFreshness(source = ED_SEARCH_SOURCE, dest = DICT_DEST): FreshnessResult {
  if (!existsSync(source)) {
    return {
      ok: false,
      reason:
        `ED-REPO-BLOCKED: ed search export not found at ${source}. ` +
        `Cannot verify dict-search freshness — the full shard set lands once tsumugu-ed lands to main.`,
    };
  }
  const src = shardManifest(source);
  const dst = shardManifest(dest);
  if (dst.files === 0) {
    return { ok: false, reason: `Vendored dict-search is empty at ${dest}; run \`tsx scripts/dict-sync.ts --copy\`.`, source: src, dest: dst };
  }
  if (src.hash !== dst.hash) {
    return {
      ok: false,
      reason:
        `Vendored dict-search is STALE vs ed source (source ${src.files}f/${src.rows}rows, ` +
        `vendored ${dst.files}f/${dst.rows}rows). Run \`tsx scripts/dict-sync.ts --copy\`.`,
      source: src,
      dest: dst,
    };
  }
  return { ok: true, reason: `dict-search fresh (${dst.files} files / ${dst.rows} rows)`, source: src, dest: dst };
}


export function copyFullSet(source = ED_SEARCH_SOURCE, dest = DICT_DEST): ShardManifest {
  if (!existsSync(source)) {
    throw new Error(`ED-REPO-BLOCKED: ed search export not found at ${source}; cannot vendor dict-search.`);
  }
  mkdirSync(dest, { recursive: true });
  
  for (const name of shardFiles(dest)) rmSync(join(dest, name), { force: true });
  for (const name of shardFiles(source)) {
    cpSync(join(source, name), join(dest, name), { force: true });
  }
  return shardManifest(dest);
}

function main(): void {
  const mode = process.argv.includes("--copy") ? "copy" : "check";
  if (mode === "copy") {
    const m = copyFullSet();
    console.log(`[dict-sync] vendored ${m.files} files / ${m.rows} rows / ${(m.bytes / 1e6).toFixed(2)}MB`);
    return;
  }
  const res = checkFreshness();
  if (!res.ok) {
    console.error(`[dict-sync] FAIL: ${res.reason}`);
    process.exit(1);
  }
  console.log(`[dict-sync] OK: ${res.reason}`);
}

const isCliEntry =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) main();
