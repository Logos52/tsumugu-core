/**
 * Resolve word → dictionary page kind (`c` | `w` | `g`) via the bundled
 * tsumugu-ed search index. Also provides richer entry slices (g, gv, hve, py, v)
 * pulled from the same bundled shards for wordPopup enrichment (def, HanViet, etc).
 *
 * Bundled shards at `/dict-search/` (entries-*.json + cjk-*.json copied from
 * `tsumugu-ed/exports/site/assets/search/` at build via vite plugin; more slices
 * can be added to copy for story/components when available in export).
 *
 * Search integration of ed shards: searchEdShards uses the entries table for
 * headword + gloss matches (cjk shards are postings; full search can layer on ids).
 */

import { firstCjkChar } from "./dictLink.js";

export type DictKind = "c" | "w" | "g";

export interface ShardDictEntry {
  id: number;
  h: string;
  k: DictKind;
  u: string;
  hs?: string;
  g?: string;      // en gloss / def
  gv?: string;     // vi gloss
  hve?: string;    // Hán-Việt
  py?: string;
  p?: string;
  v?: string;
  zy?: string;
  b?: string;      // band if present
  // form / encoding / component fields (from tsumugu-ed shards; may be enriched in entries export)
  form?: string;           // e.g. sayText or lemma form
  components?: string;     // component form / breakdown
  encoding?: string;       // mnemonic / story hint
}

interface EntriesMeta {
  sharded: boolean;
  count: number;
  parts: { start: number; count: number }[];
}

/**
 * Base-relative dict-search index root (mirrors `httpVault.staticVaultBase`):
 * respects the Vite `base`, so shards resolve under a non-root deploy
 * (e.g. `/tsumugu/app/dict-search`). No trailing slash — callers append `/…`.
 */
export function dictIndexBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/dict-search`;
}

const INDEX_BASE = dictIndexBase();

let loadPromise: Promise<{ kindMap: Map<string, DictKind>; rows: ShardDictEntry[] }> | null = null;
let testEntries: ShardDictEntry[] | null = null;

/** Test hook — inject a fixture entry table without fetch. */
export function __setTestEntries(entries: ShardDictEntry[] | null): void {
  testEntries = entries;
  loadPromise = null;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`dict index fetch failed: ${path} (${res.status})`);
  return res.json() as Promise<T>;
}

async function loadEntryTable(): Promise<{ kindMap: Map<string, DictKind>; rows: ShardDictEntry[] }> {
  if (testEntries) {
    return buildLookup(testEntries);
  }

  const metaRes = await fetch(`${INDEX_BASE}/entries-meta.json`);
  let rows: ShardDictEntry[];

  if (metaRes.ok) {
    const meta = (await metaRes.json()) as EntriesMeta;
    // Fetch shards in parallel; Promise.all preserves order, so the flattened
    // table matches the serial layout buildLookup expects.
    const shards = await Promise.all(
      meta.parts.map((_, i) => fetchJson<ShardDictEntry[]>(`${INDEX_BASE}/entries-${i}.json`)),
    );
    rows = shards.flat();
  } else {
    rows = await fetchJson<ShardDictEntry[]>(`${INDEX_BASE}/entries.json`);
  }

  return buildLookup(rows);
}

function buildLookup(rows: ShardDictEntry[]): { kindMap: Map<string, DictKind>; rows: ShardDictEntry[] } {
  const kindMap = new Map<string, DictKind>();
  for (const row of rows) {
    if (row.k === "g") continue;
    kindMap.set(row.h, row.k);
    if (row.hs && row.hs !== row.h) kindMap.set(row.hs, row.k);
  }
  return { kindMap, rows };
}

async function ensureLookup(): Promise<{ kindMap: Map<string, DictKind>; rows: ShardDictEntry[] }> {
  if (!loadPromise) loadPromise = loadEntryTable();
  return loadPromise;
}

/**
 * Look up the exact headword in the entry table.
 * Multi-char word (`w`) beats single char (`c`); absent → `"c"` on first CJK char.
 * Never returns `"g"` from prose-word lookup. Robust to fetch errors (falls back).
 */
export async function resolveKind(word: string): Promise<"c" | "w"> {
  try {
    const { kindMap } = await ensureLookup();
    const direct = kindMap.get(word);
    if (direct === "w") return "w";
    if (direct === "c") return "c";
    const fallback = firstCjkChar(word);
    const fb = kindMap.get(fallback);
    if (fb === "w") return "w";
    return "c";
  } catch {
    return "c";
  }
}

/** Lookup richer shard data for a headword (for popup: def/g/gv + form/encoding/component fields). */
export async function lookupShardEntry(word: string): Promise<ShardDictEntry | undefined> {
  try {
    const { rows } = await ensureLookup();
    // exact first, then simplified/trad alias if hs
    let hit = rows.find((r) => r.h === word || r.hs === word);
    if (!hit && /[\u4e00-\u9fff]/.test(word)) {
      hit = rows.find((r) => r.h === firstCjkChar(word));
    }
    return hit;
  } catch {
    return undefined;
  }
}

/**
 * Search integration over ed shards (entries data).
 * Matches headword (h), gloss (g/gv), hanviet (hve), pinyin (py).
 * Uses loaded rows (from bundled shards). For cjk postings, a future layer can resolve ids to heads.
 */
export async function searchEdShards(q: string, limit = 8): Promise<ShardDictEntry[]> {
  const qq = q.trim().toLowerCase();
  if (!qq) return [];
  try {
    const { rows } = await ensureLookup();
    const res: ShardDictEntry[] = [];
    for (const r of rows) {
      if (r.k === "g") continue;
      const hay = [
        r.h,
        r.hs || "",
        r.g || "",
        r.gv || "",
        r.hve || "",
        r.py || "",
        r.p || "",
        r.v || "",
        r.form || "",
        r.components || "",
        r.encoding || "",
      ].join(" ").toLowerCase();
      if (hay.includes(qq)) {
        res.push(r);
        if (res.length >= limit) break;
      }
    }
    return res;
  } catch {
    return [];
  }
}