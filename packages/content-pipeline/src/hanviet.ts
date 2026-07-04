import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface HanVietRecord {
  hanViets: string[];
  pinyinMap: Record<string, string>;
}

export type HanVietIndex = Map<string, HanVietRecord>;

export interface CharViIndex {
  has: (char: string) => boolean;
}

const DEFAULT_HANVIET_JSON = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tsumugu-ed/sources/hanviet/hanviet.json",
);

const DEFAULT_CHAR_VI_TXT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tsumugu-ed/sources/hanviet/char_vi.txt",
);

interface RawHanVietEntry {
  hanViet?: string;
  hanViets?: string[];
  pinyinMap?: Record<string, string>;
}

let cachedHanViet: HanVietIndex | undefined;
let cachedCharVi: Set<string> | undefined;

/** Parse hanviet.json into a char → readings map. */
export function loadHanViet(jsonPath: string = DEFAULT_HANVIET_JSON): HanVietIndex {
  if (cachedHanViet !== undefined && jsonPath === DEFAULT_HANVIET_JSON) {
    return cachedHanViet;
  }

  if (!existsSync(jsonPath)) {
    throw new Error(`hanviet.json not found at ${jsonPath}`);
  }

  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as Record<string, RawHanVietEntry>;
  const index: HanVietIndex = new Map();

  for (const [char, entry] of Object.entries(raw)) {
    const hanViets =
      entry.hanViets && entry.hanViets.length > 0
        ? entry.hanViets
        : entry.hanViet
          ? [entry.hanViet]
          : [];
    index.set(char, {
      hanViets,
      pinyinMap: entry.pinyinMap ?? {},
    });
  }

  if (jsonPath === DEFAULT_HANVIET_JSON) cachedHanViet = index;
  return index;
}

/** Build-time char_vi membership set (share-alike; never bundled to client). */
export function loadCharVi(txtPath: string = DEFAULT_CHAR_VI_TXT): CharViIndex {
  if (cachedCharVi !== undefined && txtPath === DEFAULT_CHAR_VI_TXT) {
    return { has: (char) => cachedCharVi!.has(char) };
  }

  if (!existsSync(txtPath)) {
    throw new Error(`char_vi.txt not found at ${txtPath}`);
  }

  const chars = new Set<string>();
  for (const line of readFileSync(txtPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const head = trimmed.split("_")[0];
    if (head) chars.add(head);
  }

  if (txtPath === DEFAULT_CHAR_VI_TXT) cachedCharVi = chars;
  return { has: (char) => chars.has(char) };
}

export function hanVietReadings(index: HanVietIndex, char: string): string[] {
  return index.get(char)?.hanViets ?? [];
}

export function charViHas(charVi: CharViIndex, char: string): boolean {
  return charVi.has(char);
}

/** Test helper: reset module caches between fixture loads. */
export function resetHanVietCaches(): void {
  cachedHanViet = undefined;
  cachedCharVi = undefined;
}