

import { firstCjkChar } from "./dictLink.js";

type DictKind = "c" | "w" | "g";

export interface ShardDictEntry {
  id: number;
  h: string;
  k: DictKind;
  u: string;
  hs?: string;
  g?: string;      
  gv?: string;     
  hve?: string;    
  py?: string;
  p?: string;
  v?: string;
  zy?: string;
  b?: string;      
  
  form?: string;           
  components?: string;     
  encoding?: string;       
}

interface EntriesMeta {
  sharded: boolean;
  count: number;
  parts: { start: number; count: number }[];
}

export function dictIndexBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/dict-search`;
}

const INDEX_BASE = dictIndexBase();

let loadPromise: Promise<{ kindMap: Map<string, DictKind>; rows: ShardDictEntry[] }> | null = null;
let testEntries: ShardDictEntry[] | null = null;

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

export async function lookupShardEntry(word: string): Promise<ShardDictEntry | undefined> {
  try {
    const { rows } = await ensureLookup();
    
    let hit = rows.find((r) => r.h === word || r.hs === word);
    if (!hit && /[\u4e00-\u9fff]/.test(word)) {
      hit = rows.find((r) => r.h === firstCjkChar(word));
    }
    return hit;
  } catch {
    return undefined;
  }
}

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