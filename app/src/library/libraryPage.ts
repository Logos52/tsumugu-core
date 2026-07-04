/**
 * Library page — the settled 2026-07 design (contract: mockups/explorations-
 * 2026-07/unified/library-columns.html + docs/DESIGN-PRINCIPLES.md).
 *
 * One page, master–detail:
 *   tabs (課本架 volumes / 級別架 TOCFL) → a slim book shelf on the LEFT with
 *   the selection's three columns filling the space to its RIGHT (a volume's
 *   三部分, or a level's contributing volumes) → below everything, the
 *   title-led reading table (faint format dot · reader-language title · 中文 ·
 *   課), scoped by the band, sortable (Lesson/Format/Title) and filterable in
 *   place (⌘K focuses the filter; no modal).
 *
 * Interest leads: readings surface by their EN/VI title (content/titles.json,
 * shipped as vault/__titles.json). Cold-start first: no progress affordances
 * here — the progress layer arrives as an enhancement, never the baseline.
 * Supersedes the stacked catalogView hub (masthead/continue/spreadsheet/cards),
 * which stays in-tree unrouted until the progress layer returns.
 */
import { el, clear } from "../ui/dom.js";
import { hanNum, isViRail, say } from "../catalog/libraryModel.js";
import { buildCompanionSpine, type CompanionLesson, type LessonGroup } from "./companionShelf.js";
import type { CatalogEntry } from "../catalog/types.js";

/** One reading's tri-rail title, as emitted by content/titles.json. */
export interface ReadingTitle {
  zh: string;
  en: string;
  vi: string;
  lesson?: string;
  format?: string;
}
export type TitlesMap = Record<string, ReadingTitle>;

/** Volume metadata the shelf needs even before a volume publishes. */
export const BOOK_META: Record<number, { lessons: number; band: string }> = {
  1: { lessons: 15, band: "A1" },
  2: { lessons: 15, band: "A2" },
  3: { lessons: 12, band: "B1" },
  4: { lessons: 12, band: "B1" },
  5: { lessons: 10, band: "B1" },
};
const SHELF_BOOKS = [1, 2, 3, 4, 5];

/** 級別架 levels; contributing volumes overlap the 課本架 shelf. */
export const SHELF_LEVELS: { code: string; books: number[] }[] = [
  { code: "A1", books: [1] },
  { code: "A2", books: [2] },
  { code: "B1", books: [3, 4, 5] },
  { code: "B2", books: [] },
  { code: "C1", books: [] },
  { code: "C2", books: [] },
];

/** A volume's three-part split boundaries (cumulative last-lesson per 部分). */
export function bookParts(lessons: number): [number, number, number] {
  if (lessons === 10) return [4, 7, 10];
  const third = lessons / 3;
  return [Math.round(third), Math.round(2 * third), lessons];
}

/** [first, last] lesson numbers of part `i` (0–2). */
export function partRange(parts: [number, number, number], i: number): [number, number] {
  return [i === 0 ? 1 : parts[i - 1]! + 1, parts[i]!];
}

/** Reading id (titles.json key) from a vault path: …/b1l02-r2.prepared.json → b1l02-r2. */
export function readingId(path: string): string {
  const m = /([^/]+?)(?:\.prepared)?\.json$/.exec(path);
  return m ? m[1]! : path;
}

/** Format string (zh or en) → signifier class. */
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

interface Col {
  /** Column heading (第N部分 or 第N冊) + right-aligned range note. */
  pn: string;
  rg: string;
  lessons: LessonGroup[];
  /** Set in multi-volume (level) columns, for 課-label disambiguation. */
  book?: number;
}

export interface LibraryPageOpts {
  catalog: CatalogEntry[];
  /** vault/__titles.json — reading id → tri-rail title. */
  titles?: TitlesMap;
  lessons?: CompanionLesson[];
  onOpen: (path: string) => void;
}

export function mountLibraryPage(
  root: HTMLElement,
  opts: LibraryPageOpts,
): { destroy: () => void; render: () => void } {
  const titles: TitlesMap = opts.titles ?? {};
  const spine = buildCompanionSpine(opts.catalog, opts.lessons ?? []);
  const byBook = new Map(spine.map((b) => [b.book, b]));

  // ── interaction state (survives repaints; render() rebuilds the DOM) ──
  let mode: "book" | "level" = "book";
  let curBook = 1;
  let curLvl = 0;
  let scope: { col: number | null; lesson: string | null } = { col: null, lesson: null };
  let sortMode: "lesson" | "format" | "title" = "lesson";
  let q = "";

  const lessonKey = (g: LessonGroup): string => `${g.book}:${g.lesson}`;
  const lessonsOf = (book: number): LessonGroup[] => byBook.get(book)?.lessons ?? [];

  const titleOf = (e: CatalogEntry): ReadingTitle => {
    const t = titles[readingId(e.path)];
    if (t) return t;
    const zh = e.title ?? e.path;
    return { zh, en: zh, vi: zh };
  };
  const leadOf = (e: CatalogEntry, vi: boolean): string => {
    const t = titleOf(e);
    return vi ? t.vi || t.en : t.en || t.zh;
  };
  const fmtOf = (e: CatalogEntry): string => fmtClass(titleOf(e).format ?? e.kind);

  const currentCols = (): Col[] => {
    const partsOf = (book: number): Col[] => {
      const meta = BOOK_META[book] ?? { lessons: 15, band: "A1" };
      const parts = bookParts(meta.lessons);
      const ls = lessonsOf(book);
      return [0, 1, 2].map((i) => {
        const [a, b] = partRange(parts, i);
        return {
          pn: `第${CNP[i]!}部分`,
          rg: `L${a}–${b}`,
          lessons: ls.filter((g) => g.lesson >= a && g.lesson <= b),
        };
      });
    };
    if (mode === "book") return partsOf(curBook);
    const lvl = SHELF_LEVELS[curLvl]!;
    if (lvl.books.length === 0) return [{ pn: lvl.code, rg: "", lessons: [] }];
    if (lvl.books.length === 1) return partsOf(lvl.books[0]!);
    return lvl.books.slice(0, 3).map((b) => ({
      pn: `第${hanNum(b)}冊`,
      rg: `${BOOK_META[b]?.lessons ?? "?"} 課`,
      lessons: lessonsOf(b),
      book: b,
    }));
  };

  const multiBook = (): boolean => mode === "level" && (SHELF_LEVELS[curLvl]?.books.length ?? 0) > 1;

  const scopedReadings = (cols: Col[]): CatalogEntry[] => {
    const all = (cs: Col[]): CatalogEntry[] => cs.flatMap((c) => c.lessons.flatMap((g) => g.readings));
    if (scope.lesson) {
      return all(cols).filter((e) => {
        const b = e.binding;
        return b ? `${b.book}:${b.lesson}` === scope.lesson : false;
      });
    }
    if (scope.col != null && cols[scope.col]) return all([cols[scope.col]!]);
    return all(cols);
  };

  // ── static frame (built once per render; band + list repaint in place) ──
  const wrap = el("div", { class: "wrap lp" });
  let bandCols!: HTMLElement;
  let shelfEl!: HTMLElement;
  let rowsEl!: HTMLElement;
  let filterInput!: HTMLInputElement;

  const paintShelf = (): void => {
    let html = "";
    if (mode === "book") {
      for (const b of SHELF_BOOKS) {
        const has = (byBook.get(b)?.lessons.length ?? 0) > 0;
        html +=
          `<button class="lp-cover${b === curBook ? " on" : ""}${has ? "" : " dim"}" data-book="${b}">` +
          `<span class="vt">第${hanNum(b)}冊</span><span class="lv">${esc(BOOK_META[b]?.band ?? "")}</span></button>`;
      }
    } else {
      SHELF_LEVELS.forEach((L, i) => {
        const live = L.books.some((b) => (byBook.get(b)?.lessons.length ?? 0) > 0);
        html +=
          `<button class="lp-cover lvl${i === curLvl ? " on" : ""}${live ? "" : " dim"}" data-lvl="${i}">` +
          `<span class="vt">${esc(L.code)}</span></button>`;
      });
    }
    shelfEl.innerHTML = html;
  };

  const paintCols = (): void => {
    const vi = isViRail();
    const cols = currentCols();
    let html = "";
    cols.forEach((col, i) => {
      const hOn = scope.col === i && scope.lesson === null;
      html += `<div class="lp-col">`;
      html +=
        `<button class="lp-colh${hOn ? " on" : ""}" data-col="${i}">` +
        `<span class="pn">${esc(col.pn)}</span><span class="rg">${esc(col.rg)}</span></button>`;
      if (col.lessons.length === 0) {
        html += `<div class="lp-soon">尚未出版<span>coming soon</span></div>`;
      } else {
        for (const g of col.lessons) {
          const key = lessonKey(g);
          const first = g.readings[0];
          const lead = first ? leadOf(first, vi) : g.title || g.unit;
          html +=
            `<button class="lp-les${scope.lesson === key ? " on" : ""}" data-col="${i}" data-lesson="${esc(key)}">` +
            `<span class="lnum">課${g.lesson}</span><span class="ltitle">${esc(lead)}</span></button>`;
        }
      }
      html += `</div>`;
    });
    bandCols.innerHTML = html;
    // shelf height follows the columns' collapsed height (books read short)
    const maxL = Math.max(0, ...cols.map((c) => c.lessons.length));
    wrap.style.setProperty("--lp-shelf-h", `${Math.max(120, 27 + Math.min(maxL, 5) * 35)}px`);
  };

  const paintList = (): void => {
    const vi = isViRail();
    const cols = currentCols();
    let data = scopedReadings(cols);
    const hadAny = data.length > 0;
    if (q) {
      const ql = q.toLowerCase();
      data = data.filter((e) => {
        const t = titleOf(e);
        return (
          t.en.toLowerCase().includes(ql) || t.vi.toLowerCase().includes(ql) || t.zh.includes(q)
        );
      });
    }
    if (data.length === 0) {
      const msg = q && hadAny ? say("noMatches", vi) : say("notYetPublished", vi);
      rowsEl.innerHTML = `<tr><td class="lp-empty" colspan="3">${esc(msg)}</td></tr>`;
      return;
    }
    const lessonNum = (e: CatalogEntry): number => (e.binding ? e.binding.book * 100 + e.binding.lesson : 0);
    if (sortMode === "format") data.sort((a, b) => fmtOf(a).localeCompare(fmtOf(b)) || lessonNum(a) - lessonNum(b) || a.path.localeCompare(b.path));
    else if (sortMode === "title") data.sort((a, b) => leadOf(a, vi).localeCompare(leadOf(b, vi)));
    else data.sort((a, b) => lessonNum(a) - lessonNum(b) || a.path.localeCompare(b.path));

    const multi = multiBook();
    let prev = "";
    rowsEl.innerHTML = data
      .map((e) => {
        const t = titleOf(e);
        const cls = fmtOf(e);
        const b = e.binding;
        const lkey = b ? `${b.book}:${b.lesson}` : "";
        // ledger convention: suppress a repeated 課 value (lesson sort only)
        const showL = sortMode !== "lesson" || lkey !== prev;
        prev = lkey;
        const lab = b ? `${multi ? `${hanNum(b.book)}·` : ""}課${b.lesson}` : "";
        return (
          `<tr data-path="${esc(e.path)}"><td class="lp-title">` +
          `<i class="lp-d ${cls}" title="${esc(FMT_TIP[cls] ?? "")}"></i>` +
          `<span class="lead">${esc(vi ? t.vi || t.en : t.en || t.zh)}</span></td>` +
          `<td class="lp-zh" lang="zh-Hant">${esc(t.zh)}</td>` +
          `<td class="lp-lesson">${showL ? esc(lab) : ""}</td></tr>`
        );
      })
      .join("");
  };

  const paintTabs = (): void => {
    wrap.querySelectorAll<HTMLElement>(".lp-tab").forEach((t) => {
      t.classList.toggle("on", t.dataset.shelf === mode);
    });
  };

  const render = (): void => {
    const vi = isViRail();
    clear(root);
    clear(wrap);

    if (opts.catalog.length === 0) {
      wrap.append(el("div", { class: "lib-empty", html: say("emptyCatalog", vi) }));
      root.append(wrap);
      return;
    }

    wrap.innerHTML =
      `<h2 class="lp-tabs">` +
      `<button class="lp-tab${mode === "book" ? " on" : ""}" data-shelf="book">課本架 <span class="en">當代中文課程</span></button>` +
      `<button class="lp-tab${mode === "level" ? " on" : ""}" data-shelf="level">級別架 <span class="en">TOCFL</span></button>` +
      `</h2>` +
      `<div class="lp-band"><div class="lp-shelf"></div><div class="lp-cols"></div></div>` +
      `<div class="lp-sortbar"><span class="sl">${esc(say("sort", vi))}</span>` +
      `<button class="sb${sortMode === "lesson" ? " on" : ""}" data-sort="lesson">${esc(say("sortLesson", vi))}</button>` +
      `<button class="sb${sortMode === "format" ? " on" : ""}" data-sort="format">${esc(say("sortFormat", vi))}</button>` +
      `<button class="sb${sortMode === "title" ? " on" : ""}" data-sort="title">${esc(say("sortTitle", vi))}</button>` +
      `<span class="lp-filter">⌕<input type="text" autocomplete="off" placeholder="${esc(say("filterPh", vi))}" aria-label="${esc(say("searchAria", vi))}"></span></div>` +
      `<div class="lp-card"><table class="lp-cat" aria-label="讀物目錄"><tbody></tbody></table></div>`;

    shelfEl = wrap.querySelector(".lp-shelf")!;
    bandCols = wrap.querySelector(".lp-cols")!;
    rowsEl = wrap.querySelector(".lp-cat tbody")!;
    filterInput = wrap.querySelector<HTMLInputElement>(".lp-filter input")!;
    filterInput.value = q;
    filterInput.addEventListener("input", () => {
      q = filterInput.value.trim();
      paintList();
    });

    paintShelf();
    paintCols();
    paintList();
    root.append(wrap);
  };

  const onClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    const tab = target.closest<HTMLElement>(".lp-tab");
    if (tab && tab.dataset.shelf && tab.dataset.shelf !== mode) {
      mode = tab.dataset.shelf as "book" | "level";
      scope = { col: null, lesson: null };
      paintTabs(); paintShelf(); paintCols(); paintList();
      return;
    }
    const cover = target.closest<HTMLElement>(".lp-cover");
    if (cover) {
      if (cover.dataset.book) curBook = Number(cover.dataset.book);
      if (cover.dataset.lvl) curLvl = Number(cover.dataset.lvl);
      scope = { col: null, lesson: null };
      paintShelf(); paintCols(); paintList();
      return;
    }
    const les = target.closest<HTMLElement>(".lp-les");
    if (les) {
      const key = les.dataset.lesson ?? null;
      const col = Number(les.dataset.col ?? 0);
      if (scope.lesson === key) scope = { col, lesson: null }; // re-click: widen to its column
      else scope = { col, lesson: key };
      paintCols(); paintList();
      return;
    }
    const colh = target.closest<HTMLElement>(".lp-colh");
    if (colh) {
      const col = Number(colh.dataset.col ?? 0);
      if (scope.col === col && scope.lesson === null) scope = { col: null, lesson: null }; // widen to everything
      else scope = { col, lesson: null };
      paintCols(); paintList();
      return;
    }
    const sb = target.closest<HTMLElement>(".lp-sortbar .sb");
    if (sb && sb.dataset.sort) {
      sortMode = sb.dataset.sort as typeof sortMode;
      wrap.querySelectorAll(".lp-sortbar .sb").forEach((x) => x.classList.toggle("on", x === sb));
      paintList();
      return;
    }
    const row = target.closest<HTMLElement>("tr[data-path]");
    if (row?.dataset.path) {
      e.preventDefault();
      opts.onOpen(row.dataset.path);
    }
  };

  const onKey = (e: KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      filterInput?.focus();
    } else if (e.key === "Escape" && document.activeElement === filterInput) {
      filterInput.value = "";
      q = "";
      paintList();
      filterInput.blur();
    }
  };

  wrap.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  render();

  return {
    render,
    destroy: () => {
      wrap.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      clear(root);
    },
  };
}

/** Fetch `__titles.json` from the vault base; {} when absent/invalid. */
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
