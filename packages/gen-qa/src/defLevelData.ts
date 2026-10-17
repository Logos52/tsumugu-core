import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DATA_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packs/private/zh-hant/data",
);

export interface TocflRecord {
  level: string;
}

export interface DefLevelIndex {
  tocfl: Record<string, TocflRecord>;
  freq: Record<string, number>;
  cedictWords?: string[];
}

let cachedIndex: DefLevelIndex | undefined;

export function tocflOrdinal(band: string): number {
  const m = /^TOCFL-(\d+)$/.exec(band);
  if (!m) return 99;
  return parseInt(m[1]!, 10);
}

export function tocflBandFromOrdinal(n: number): string {
  const clamped = Math.min(7, Math.max(1, n));
  return `TOCFL-${clamped}`;
}

export function freqRankToTocflBand(rank: number): string {
  if (rank <= 800) return "TOCFL-1";
  if (rank <= 1500) return "TOCFL-2";
  if (rank <= 3000) return "TOCFL-3";
  if (rank <= 6000) return "TOCFL-4";
  if (rank <= 12000) return "TOCFL-5";
  if (rank <= 25000) return "TOCFL-6";
  return "TOCFL-7";
}

export const DEFAULT_DEF_FLOOR_BAND = "TOCFL-3";

export function resolveDefFloorBand(explicit?: string): string {
  const fromEnv = process.env.TSUMUGU_DEF_FLOOR_BAND?.trim();
  const band = explicit ?? fromEnv ?? DEFAULT_DEF_FLOOR_BAND;
  if (!/^TOCFL-[1-7]$/.test(band)) {
    throw new Error(`invalid def floor band "${band}" — expected TOCFL-1..TOCFL-7`);
  }
  return band;
}

export function resolveTokenBand(token: string, index: DefLevelIndex): string {
  const official = index.tocfl[token];
  if (official !== undefined) return official.level;
  const rank = index.freq[token];
  if (rank !== undefined) return freqRankToTocflBand(rank);
  return "unrankable";
}

export function buildAllowList(ceilingBand: string, index: DefLevelIndex): Set<string> {
  const ceiling = tocflOrdinal(ceilingBand);
  const allow = new Set<string>();

  for (const [word, rec] of Object.entries(index.tocfl)) {
    if (tocflOrdinal(rec.level) <= ceiling) allow.add(word);
  }
  for (const [word, rank] of Object.entries(index.freq)) {
    if (index.tocfl[word] !== undefined) continue;
    if (tocflOrdinal(freqRankToTocflBand(rank)) <= ceiling) allow.add(word);
  }
  return allow;
}

export function allowListWords(ceilingBand: string, index: DefLevelIndex): string[] {
  return [...buildAllowList(ceilingBand, index)].sort((a, b) =>
    a === b ? 0 : a < b ? -1 : 1,
  );
}

export function loadDefLevelIndex(dataDir: string = DEFAULT_DATA_DIR): DefLevelIndex {
  if (cachedIndex !== undefined && dataDir === DEFAULT_DATA_DIR) return cachedIndex;

  const tocflPath = resolve(dataDir, "tocfl.json");
  const freqPath = resolve(dataDir, "freq.json");
  const cedictPath = resolve(dataDir, "cedict.json");

  if (!existsSync(tocflPath) || !existsSync(freqPath)) {
    throw new Error(
      `def-level data missing under ${dataDir} — need tocfl.json and freq.json (private pack)`,
    );
  }

  const index: DefLevelIndex = {
    tocfl: JSON.parse(readFileSync(tocflPath, "utf8")) as Record<string, TocflRecord>,
    freq: JSON.parse(readFileSync(freqPath, "utf8")) as Record<string, number>,
  };

  if (existsSync(cedictPath)) {
    index.cedictWords = Object.keys(
      JSON.parse(readFileSync(cedictPath, "utf8")) as Record<string, unknown>,
    );
  }

  if (dataDir === DEFAULT_DATA_DIR) cachedIndex = index;
  return index;
}

export function resetDefLevelIndexCache(): void {
  cachedIndex = undefined;
}