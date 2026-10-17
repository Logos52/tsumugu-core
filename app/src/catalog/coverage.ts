import { DEFAULT_KNOWN_POLICY, type WordStatus } from "@tsumugu/engine";
import type { Band, CatalogEntry, CoverageBand } from "./types.js";

export function percentKnown(
  wordCounts: Record<string, number>,
  totalWords: number,
  getStatus: (w: string) => WordStatus,
): number {
  if (totalWords <= 0) return 0;
  const known = new Set<WordStatus>(DEFAULT_KNOWN_POLICY.knownStatuses);
  let knownTokens = 0;
  for (const [word, count] of Object.entries(wordCounts)) {
    if (known.has(getStatus(word))) knownTokens += count;
  }
  return Math.round((knownTokens / totalWords) * 1000) / 10;
}

export function readingBand(pct: number, min = 80, max = 95): CoverageBand {
  if (pct > max) return "outgrown";
  if (pct >= min) return "in-range";
  return "stretch";
}

function bandLabel(band: CoverageBand): string {
  switch (band) {
    case "in-range":
      return "in range";
    case "stretch":
      return "stretch";
    case "outgrown":
      return "outgrown";
  }
}

export function perBandCounts(catalog: CatalogEntry[]): Record<Band, number> {
  const counts: Record<Band, number> = { A1: 0, A2: 0, B1: 0 };
  for (const entry of catalog) {
    counts[entry.band] += 1;
  }
  return counts;
}

export function hasKnownWords(
  wordCounts: Record<string, number>,
  getStatus: (w: string) => WordStatus,
): boolean {
  const known = new Set<WordStatus>(DEFAULT_KNOWN_POLICY.knownStatuses);
  for (const word of Object.keys(wordCounts)) {
    if (known.has(getStatus(word))) return true;
  }
  return false;
}

export function pickContinueCandidate(
  catalog: CatalogEntry[],
  getStatus: (lang: string, word: string) => WordStatus,
  lastId?: string | null,
): CatalogEntry | null {
  if (catalog.length === 0) return null;
  const lang = catalog[0]?.lang ?? "zh-Hant";

  if (lastId) {
    const hit = catalog.find((e) => e.path === lastId);
    if (hit) return hit;
  }

  let best: { entry: CatalogEntry; pct: number } | null = null;
  for (const entry of catalog) {
    if (!hasKnownWords(entry.wordCounts, (w) => getStatus(lang, w))) continue;
    const pct = percentKnown(entry.wordCounts, entry.totalWords, (w) => getStatus(lang, w));
    if (pct > 95) continue; 
    if (!best || pct > best.pct) {
      best = { entry, pct };
    }
  }
  if (best) return best.entry;

  
  return catalog.find((e) => hasKnownWords(e.wordCounts, (w) => getStatus(lang, w))) || null;
}

interface HealthIssue { path: string; reason: string; }
interface LibraryHealthReport {
  ok: boolean;
  scanned: number;
  issues: HealthIssue[];
  summary: string;
}
export function libraryHealthScan(catalog: CatalogEntry[], now = Date.now()): LibraryHealthReport {
  const issues: HealthIssue[] = [];
  const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
  for (const e of catalog) {
    if (e.dateAdded && (now - new Date(e.dateAdded).getTime() > THIRTY_DAYS)) {
      issues.push({ path: e.path, reason: "stale (>30d)" });
    }
    if (!e.binding && Object.keys(e.wordCounts || {}).length < 5) {
      issues.push({ path: e.path, reason: "orphan-ish (no binding, tiny)" });
    }
  }
  const ok = issues.length === 0;
  return {
    ok,
    scanned: catalog.length,
    issues,
    summary: ok ? "library.health.ok" : `library.health.issues (${issues.length})`,
  };
}

interface DailyDigest {
  date: string;
  recent: string[];
  backlog: number;
  openQs: number;
  nextRec: string | null;
}
export function generateDailyDigestThinStrip(catalog: CatalogEntry[], lastIds: string[] = []): DailyDigest {
  const date = new Date().toISOString().slice(0,10);
  const recent = catalog.slice(0,3).map(e => e.path);
  const backlog = Math.max(0, catalog.length - lastIds.length);
  return {
    date,
    recent,
    backlog,
    openQs: 0, 
    nextRec: catalog[0]?.path || null,
  };
}

export function reverseLinksForWord(word: string, catalog: CatalogEntry[]): string[] {
  return catalog.filter(e => e.wordCounts && e.wordCounts[word]).map(e => e.path);
}