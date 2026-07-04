#!/usr/bin/env tsx
/**
 * Dict-search freshness gate + vendoring copy.
 *
 * Vendors the tsumugu-ed search index (`../tsumugu-ed/exports/site/assets/search/`)
 * into `app/public/dict-search/` and gates CI on staleness. The Vite copy step
 * (`vite.config.ts` copyDictSearchIndex) silently no-ops when the sibling repo is
 * absent — this gate does the opposite: it FAILS LOUDLY on an absent source or a
 * stale/undersized vendored set, so a build never ships mismatched dict shards.
 *
 * Target full set ≈ 5.0MB / 248 files / 10,260 rows (all entries + cjk + pinyin/VI/
 * zhuyin/EN/facet families + 82 pattern entries). The full content lands once
 * tsumugu-ed lands to main (ED-REPO-BLOCKED); the gate + hash check ship now and
 * pass once the source is the full set and the vendored copy has been refreshed.
 *
 *   tsx scripts/dict-sync.ts --copy    # mirror source → dest (fails if source absent)
 *   tsx scripts/dict-sync.ts --check   # freshness gate (default): fail on stale/absent
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

/** ed search-index export (the sibling repo; absent in a data-free checkout). */
export const ED_SEARCH_SOURCE = resolve(REPO_ROOT, "../tsumugu-ed/exports/site/assets/search");
/** Vendored copy the app + PWA precache consume. */
export const DICT_DEST = resolve(REPO_ROOT, "app/public/dict-search");

export interface ShardManifest {
  files: number;
  bytes: number;
  /** Row count from `entries-meta.json` when present (else 0). */
  rows: number;
  /** Deterministic content hash over the shard set (name + bytes). */
  hash: string;
}

/** List the vendored shard files (flat `*.json`), sorted for determinism. */
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

/** Deterministic manifest (count/bytes/rows/hash) over a shard directory. */
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

/**
 * Compare the vendored copy against the ed source. Fails loudly (never silent) on:
 * absent source (ED-REPO-BLOCKED), absent/empty vendored copy, or hash drift (stale).
 */
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

/** Mirror the FULL ed source set into the vendored dest (fails loudly if source absent). */
export function copyFullSet(source = ED_SEARCH_SOURCE, dest = DICT_DEST): ShardManifest {
  if (!existsSync(source)) {
    throw new Error(`ED-REPO-BLOCKED: ed search export not found at ${source}; cannot vendor dict-search.`);
  }
  mkdirSync(dest, { recursive: true });
  // Remove stale vendored shards, then mirror every source shard (the full family set).
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
