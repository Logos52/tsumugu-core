import type { CatalogEntry } from "./types.js";

import type { WordStatus } from "@tsumugu/engine";

import { hasKnownWords, percentKnown, readingBand } from "./coverage.js";

import { TOPIC_ORDER, normalizeTopic } from "./libraryModel.part2.js";

import type { ReadingRecord } from "./libraryModel.part2.js";

import { bandNum, descriptiveTitle, formatLabel } from "./libraryModel.part3.js";

import type { LibSort, LibView, ReadingStatus, TopicKey } from "./libraryModel.part3.js";

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

export function toReadingRecord(
  entry: CatalogEntry,
  getStatus: (lang: string, word: string) => WordStatus,
): ReadingRecord {
  const lang = entry.lang ?? "zh-Hant";
  const status1 = (w: string): WordStatus => getStatus(lang, w);
  const hasProgress = hasKnownWords(entry.wordCounts, status1);
  const covPct = hasProgress ? percentKnown(entry.wordCounts, entry.totalWords, status1) : null;
  const covReal = covPct != null;
  const cov = covPct != null
    ? Math.round(covPct)
    : clamp(100 - (entry.newWords ?? 0), 40, 99);
  const status: ReadingStatus = covPct != null && readingBand(covPct) === "stretch" ? "stretch" : "in";

  const nw: [string, string, string][] = entry.newWordSamples?.slice(0, 3)
    ?? Object.keys(entry.wordCounts ?? {}).slice(0, 3).map((w) => [w, "", ""] as [string, string, string]);

  const bind = entry.binding ? `ACCC B${entry.binding.book} L${entry.binding.lesson}` : "";

  return {
    path: entry.path,
    zh: entry.title ?? entry.path,
    rom: entry.titleRom ?? "",
    romVi: entry.titleRomVi ?? entry.titleRom ?? "",
    topic: normalizeTopic(entry.topic),
    band: entry.band,
    tocfl: `TOCFL ${entry.tocfl}`,
    bind,
    mins: entry.minutes ?? 0,
    audio: !!entry.hasAudio,
    cov,
    covReal,
    newN: entry.newWords ?? nw.length,
    status,
    rec: entry.recommended ?? (status === "in"),
    added: Date.parse(entry.dateAdded ?? "") || 0,
    nw,
    ex: entry.excerpt ?? "",
    fmt: formatLabel(entry),
    len: entry.totalWords ?? 0,
    book: entry.binding?.book ?? null,
    lesson: entry.binding?.lesson ?? null,
    descTitle: descriptiveTitle(entry),
  };
}

interface LessonGroupRows {
  
  key: string;
  
  free: boolean;
  book: number | null;
  lesson: number | null;
  band: string;
  items: ReadingRecord[];
}

export function groupCatalogByLesson(records: ReadingRecord[]): LessonGroupRows[] {
  const groups = new Map<string, LessonGroupRows>();
  for (const r of records) {
    const bound = r.book != null && r.lesson != null;
    const key = bound ? `b${r.book}l${r.lesson}` : `free-${r.band}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, free: !bound, book: r.book, lesson: r.lesson, band: r.band, items: [] };
      groups.set(key, g);
    }
    g.items.push(r);
  }
  for (const g of groups.values()) g.items.sort((a, b) => a.path.localeCompare(b.path));
  return [...groups.values()].sort((a, b) => {
    if (a.free !== b.free) return a.free ? 1 : -1; 
    if (a.free) return bandNum(a.band) - bandNum(b.band);
    return (a.book! - b.book!) || (a.lesson! - b.lesson!);
  });
}

export interface LibState {
  topic: TopicKey | "all";
  forLevel: boolean;
  audio: boolean;
  sort: LibSort;
  view: LibView;
  q: string;
}

export function defaultLibState(): LibState {
  return { topic: "all", forLevel: true, audio: false, sort: "fit", view: "gallery", q: "" };
}

function haystack(r: ReadingRecord): string {
  return `${r.zh} ${r.rom} ${r.romVi} ${r.nw.map((w) => w.join(" ")).join(" ")}`.toLowerCase();
}

export function passRecord(r: ReadingRecord, state: LibState, ignoreTopic = false): boolean {
  if (state.audio && !r.audio) return false;
  if (state.forLevel && r.status === "stretch") return false;
  if (!ignoreTopic && state.topic !== "all" && r.topic !== state.topic) return false;
  return true;
}

function matchesQuery(r: ReadingRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return haystack(r).includes(needle);
}

export function sortRecords(list: ReadingRecord[], sort: LibSort): ReadingRecord[] {
  const copy = list.slice();
  return copy.sort((a, b) => {
    if (sort === "short") return a.mins - b.mins || b.cov - a.cov;
    if (sort === "new") return b.added - a.added;
    const ai = a.status === "in" ? 0 : 1;
    const bi = b.status === "in" ? 0 : 1;
    if (ai !== bi) return ai - bi;
    return b.cov - a.cov;
  });
}

export function rankRecords(list: ReadingRecord[], q: string, sort: LibSort = "fit"): ReadingRecord[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return sortRecords(list, sort);
  const tiered: { r: ReadingRecord; tier: number }[] = [];
  for (const r of list) {
    const titles = [r.zh, r.rom, r.romVi].map((t) => t.toLowerCase()).filter(Boolean);
    let tier = 0;
    if (titles.some((t) => t === needle)) tier = 3;
    else if (titles.some((t) => t.startsWith(needle))) tier = 2;
    else if (haystack(r).includes(needle)) tier = 1;
    if (tier > 0) tiered.push({ r, tier });
  }
  const bySort = new Map(sortRecords(list, sort).map((r, i) => [r.path, i]));
  return tiered
    .sort((a, b) => b.tier - a.tier || (bySort.get(a.r.path)! - bySort.get(b.r.path)!))
    .map((x) => x.r);
}

function groupByTopic(list: ReadingRecord[]): { key: TopicKey; items: ReadingRecord[] }[] {
  return TOPIC_ORDER
    .map((key) => ({ key, items: list.filter((r) => r.topic === key) }))
    .filter((g) => g.items.length > 0);
}

function parseHash(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return raw ? new URLSearchParams(raw) : new URLSearchParams();
}

export function libStateFromHash(hash: string): LibState {
  const p = parseHash(hash);
  const s = defaultLibState();
  const lt = p.get("lt");
  if (lt && (lt === "all" || TOPIC_ORDER.includes(lt as TopicKey))) s.topic = lt as TopicKey | "all";
  if (p.get("lv") === "0") s.forLevel = false;
  if (p.get("la") === "1") s.audio = true;
  const ls = p.get("ls");
  if (ls === "new" || ls === "short" || ls === "fit") s.sort = ls;
  if (p.get("lw") === "table") s.view = "table";
  s.q = p.get("lq") ?? "";
  return s;
}

export function libStateToHash(state: LibState, baseHash = ""): string {
  const p = parseHash(baseHash);
  const set = (k: string, cond: boolean, v: string): void => {
    if (cond) p.set(k, v);
    else p.delete(k);
  };
  set("lt", state.topic !== "all", state.topic);
  set("lv", !state.forLevel, "0");
  set("la", state.audio, "1");
  set("ls", state.sort !== "fit", state.sort);
  set("lw", state.view !== "gallery", state.view);
  set("lq", !!state.q.trim(), state.q.trim());
  const qs = p.toString();
  return qs ? `#${qs}` : "";
}
