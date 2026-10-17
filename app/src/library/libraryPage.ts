import { mountLibraryPageTail1 } from "./libraryPage.fns1.js";
import { mountLibraryPageTail2 } from "./libraryPage.fns2.js";

import { el, clear } from "../ui/dom.js";
import { hanNum, isViRail, say } from "../catalog/libraryModel.js";
import { buildCompanionSpine, type CompanionLesson, type LessonGroup } from "./companionShelf.js";
import type { CatalogEntry } from "../catalog/types.js";

interface ReadingTitle {
  zh: string;
  en: string;
  vi: string;
  lesson?: string;
  format?: string;
}
export type TitlesMap = Record<string, ReadingTitle>;

const BOOK_META: Record<number, { lessons: number; band: string }> = {
  1: { lessons: 15, band: "A1" },
  2: { lessons: 15, band: "A2" },
  3: { lessons: 12, band: "B1" },
  4: { lessons: 12, band: "B1" },
  5: { lessons: 10, band: "B1" },
};
const SHELF_BOOKS = [1, 2, 3, 4, 5];

export const SHELF_LEVELS: { code: string; books: number[] }[] = [
  { code: "A1", books: [1] },
  { code: "A2", books: [2] },
  { code: "B1", books: [3, 4, 5] },
  { code: "B2", books: [] },
  { code: "C1", books: [] },
  { code: "C2", books: [] },
];

export function bookParts(lessons: number): [number, number, number] {
  if (lessons === 10) return [4, 7, 10];
  const third = lessons / 3;
  return [Math.round(third), Math.round(2 * third), lessons];
}

export function partRange(parts: [number, number, number], i: number): [number, number] {
  return [i === 0 ? 1 : parts[i - 1]! + 1, parts[i]!];
}

export function readingId(path: string): string {
  const m = /([^/]+?)(?:\.prepared)?\.json$/.exec(path);
  return m ? m[1]! : path;
}

const FMT_CLASS: Record<string, string> = {
  對話: "dlg", dialogue: "dlg",
  自述: "slf", "first-person": "slf",
  短文: "sty", story: "sty",
  日記: "dia", diary: "dia",
  問答: "qa", 比較: "qa",
  報導: "rep", report: "rep", 廣播: "rep",
  explainer: "exp", 說明: "exp",
};
const FMT_TIP: Record<string, string> = {
  dlg: "對話 · dialogue", slf: "自述 · first-person", sty: "短文 · story",
  dia: "日記 · diary", qa: "問答 · Q&A", rep: "報導 · report", exp: "說明 · explainer",
};
export function fmtClass(format?: string): string {
  return (format && FMT_CLASS[format]) || "sty";
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const CNP = ["一", "二", "三"];

export interface Col {
  
  pn: string;
  rg: string;
  lessons: LessonGroup[];
  
  book?: number;
}

interface LibraryPageOpts {
  catalog: CatalogEntry[];
  
  titles?: TitlesMap;
  lessons?: CompanionLesson[];
  onOpen: (path: string) => void;
}

export function mountLibraryPage(
  root: HTMLElement,
  opts: LibraryPageOpts,
): { destroy: () => void; render: () => void } {
const ctx: any = {};

  const titles: TitlesMap = opts.titles ?? {};
  const spine = buildCompanionSpine(opts.catalog, opts.lessons ?? []);
  const byBook = new Map(spine.map((b) => [b.book, b]));

  
  const mode: "book" | "level" = "book";
ctx.mode = mode;
  const curBook = 1;
ctx.curBook = curBook;
  const curLvl = 0;
ctx.curLvl = curLvl;
  const scope: { col: number | null; lesson: string | null } = { col: null, lesson: null };
ctx.scope = scope;
  const sortMode: "lesson" | "format" | "title" = "lesson";
ctx.sortMode = sortMode;
  const q = "";
ctx.q = q;

  const lessonKey = (g: LessonGroup): string => `${g.book}:${g.lesson}`;
  const lessonsOf = (book: number): LessonGroup[] => byBook.get(book)?.lessons ?? [];

  const titleOf = (e: CatalogEntry): ReadingTitle => {
    const t = titles[readingId(e.path)];
    if (t) return t;
    const zh = e.title ?? e.path;
    return { zh, en: zh, vi: zh };
  };
  ctx.titleOf = titleOf; ctx.fmtClass = fmtClass; ctx.BOOK_META = BOOK_META; ctx.bookParts = bookParts; ctx.lessonsOf = lessonsOf; ctx.partRange = partRange; ctx.CNP = CNP; ctx.SHELF_LEVELS = SHELF_LEVELS; ctx.hanNum = hanNum; ctx.el = el; ctx.SHELF_BOOKS = SHELF_BOOKS; ctx.byBook = byBook; ctx.esc = esc; ctx.isViRail = isViRail; ctx.lessonKey = lessonKey; ctx.say = say; ctx.FMT_TIP = FMT_TIP; ctx.clear = clear; ctx.root = root; ctx.opts = opts;
return mountLibraryPageTail2(ctx);
}

export async function loadCompanionTitles(vaultBase: string): Promise<TitlesMap> {
  try {
    const res = await fetch(`${vaultBase.replace(/\/$/, "")}/__titles.json`);
    if (!res.ok) return {};
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return data as TitlesMap;
  } catch {
    return {};
  }
}
