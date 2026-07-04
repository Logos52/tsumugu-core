/**
 * Companion shelf — the Book → Lesson spine over the ACCC textbook companion.
 *
 * Each lesson set is sold as a study-C card: pedagogy-as-hero, with the
 * union-coverage promise (the union of the lesson's 3 articles = 100% of the
 * lesson's vocab + grammar). Reading data comes from `CatalogEntry.binding`
 * (grouped by book/lesson); lesson title/theme/grammar metadata comes from the
 * content workflow's `companion-lessons.json` (consumed read-only, may be
 * absent — the shelf degrades to bindings alone).
 *
 * Per the 2026-07-02 amendment, the lesson view PUBLISHES the extracted
 * grammar-point list AND links each point to its tsumugu-ed `g/` page. This
 * module renders that list link-only; it never renders in-app grammar prose.
 */
import type { WordStatus } from "@tsumugu/engine";
import { el, clear } from "../ui/dom.js";
import { formatLabel, hanNum, isViRail, say } from "../catalog/libraryModel.js";
import { percentKnown } from "../catalog/coverage.js";
import type { CatalogEntry } from "../catalog/types.js";

export interface CompanionGrammar {
  name: string;
  /** tsumugu-ed grammar-page slug (`g/<edSlug>`), when known. */
  edSlug?: string;
}

/** One lesson's metadata, as emitted by `companion-lessons.json`. */
export interface CompanionLesson {
  /** Unit label, e.g. "B1L02". Book/lesson may also be given explicitly. */
  unit: string;
  book?: number;
  lesson?: number;
  title?: string;
  theme?: string;
  grammar?: CompanionGrammar[];
}

export interface LessonGroup {
  book: number;
  lesson: number;
  unit: string;
  title: string;
  theme: string;
  readings: CatalogEntry[];
  grammar: CompanionGrammar[];
  articles: number;
  /** Union coverage the card sells (0–100). */
  unionCoverage: number;
}

export interface BookGroup {
  book: number;
  lessons: LessonGroup[];
}

function parseUnit(unit: string): { book?: number; lesson?: number } {
  const m = /B\s*(\d+)\s*L\s*(\d+)/i.exec(unit ?? "");
  if (!m) return {};
  return { book: Number(m[1]), lesson: Number(m[2]) };
}

/** Build the Book → Lesson spine from bindings, joined with lesson metadata. */
export function buildCompanionSpine(
  catalog: CatalogEntry[],
  lessons: CompanionLesson[] = [],
): BookGroup[] {
  const metaByKey = new Map<string, CompanionLesson>();
  for (const l of lessons) {
    const bk = l.book ?? parseUnit(l.unit).book;
    const ls = l.lesson ?? parseUnit(l.unit).lesson;
    if (bk != null && ls != null) metaByKey.set(`${bk}:${ls}`, l);
  }

  const groups = new Map<string, LessonGroup>();
  for (const entry of catalog) {
    if (!entry.binding) continue;
    const { book, lesson } = entry.binding;
    const key = `${book}:${lesson}`;
    let g = groups.get(key);
    if (!g) {
      const meta = metaByKey.get(key);
      g = {
        book,
        lesson,
        unit: meta?.unit ?? `B${book}L${String(lesson).padStart(2, "0")}`,
        title: meta?.title ?? "",
        theme: meta?.theme ?? "",
        readings: [],
        grammar: meta?.grammar ?? [],
        articles: 0,
        unionCoverage: 0,
      };
      groups.set(key, g);
    }
    g.readings.push(entry);
  }

  for (const g of groups.values()) {
    g.articles = g.readings.length;
    // The pipeline guarantees the union of a lesson's articles covers 100% of
    // its target vocab+grammar; surface that promise once articles exist.
    g.unionCoverage = g.articles > 0 ? 100 : 0;
  }

  const byBook = new Map<number, LessonGroup[]>();
  for (const g of groups.values()) {
    const arr = byBook.get(g.book) ?? [];
    arr.push(g);
    byBook.set(g.book, arr);
  }

  return [...byBook.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([book, ls]) => ({ book, lessons: ls.sort((a, b) => a.lesson - b.lesson) }));
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Resolve a grammar point's tsumugu-ed `g/` URL, or null when link-only slug absent. */
export function grammarHref(g: CompanionGrammar, base: string): string | null {
  if (!g.edSlug) return null;
  return `${base.replace(/\/$/, "")}/g/${encodeURIComponent(g.edSlug)}`;
}

export interface CompanionShelfOpts {
  catalog: CatalogEntry[];
  lessons?: CompanionLesson[];
  onOpen: (path: string) => void;
  /** Base origin for tsumugu-ed grammar pages (kept for the lesson-detail view). */
  grammarBase?: string;
  /** Optional: last-opened reading path, to preselect its book + mark it current. */
  getLastReadingId?: () => string | null;
  /** Optional: live word status, so read articles can show 已讀. */
  getStatus?: (lang: string, word: string) => WordStatus;
}

/** Books the shelf shows as spines (the 當代中文課程 companion runs B1–B5). */
const SHELF_BOOKS = [1, 2, 3, 4, 5];

const fmtOf = (e: CatalogEntry): string => formatLabel(e);

/**
 * 課本架 Companion shelf — Book spines (B1–B5, open = current) opening into
 * lesson set-cards. Each card lists its 3 articles (format / 字 / status) and a
 * 書腰 obi line (詞彙與語法 100%, the union-coverage guarantee). Rebuilt from the
 * 2026-07-02 unified mockup; render-only (grammar points link out of the future
 * lesson-detail view, not the card face — minimalism wins).
 */
export function mountCompanionShelf(
  root: HTMLElement,
  opts: CompanionShelfOpts,
): { destroy: () => void } {
  const vi = isViRail();
  clear(root);

  const spine = buildCompanionSpine(opts.catalog, opts.lessons);
  const wrap = el("div", { class: "wrap comp-shelf" });

  if (spine.length === 0) {
    wrap.append(el("div", { class: "lib-empty", html: say("emptyCatalog", vi) }));
    root.append(wrap);
    return { destroy: () => clear(root) };
  }

  const byBook = new Map<number, BookGroup>(spine.map((b) => [b.book, b]));
  const lessonCount = spine.reduce((n, b) => n + b.lessons.length, 0);
  const lastId = opts.getLastReadingId?.() ?? null;
  const lastBook = lastId ? opts.catalog.find((e) => e.path === lastId)?.binding?.book ?? null : null;
  let openBook = lastBook != null && byBook.has(lastBook) ? lastBook : spine[0]!.book;

  const readStatus = (e: CatalogEntry): "current" | "read" | "unread" => {
    if (lastId && e.path === lastId) return "current";
    if (opts.getStatus) {
      const lang = e.lang ?? "zh-Hant";
      const pct = percentKnown(e.wordCounts, e.totalWords, (w) => opts.getStatus!(lang, w));
      if (pct > 95) return "read";
    }
    return "unread";
  };

  const statusLabel = (s: "current" | "read" | "unread"): { text: string; cls: string } => {
    if (s === "current") return { text: "續讀", cls: "st here" };
    if (s === "read") return { text: say("read", vi), cls: "st" };
    return { text: say("unread", vi), cls: "st" };
  };

  const lessonsHtml = (book: number): string => {
    const bg = byBook.get(book);
    if (!bg || bg.lessons.length === 0) {
      return `<div class="lib-empty" style="margin:0">${esc(say("notYetPublished", vi))}</div>`;
    }
    return bg.lessons
      .map((lg) => {
        const band = lg.readings[0]?.band ?? "A1";
        const isNow = lg.readings.some((r) => readStatus(r) === "current");
        const rows = lg.readings
          .slice()
          .sort((a, b) => a.path.localeCompare(b.path))
          .map((r) => {
            const st = statusLabel(readStatus(r));
            const link = readStatus(r) === "current";
            const tag = link ? "a" : "div";
            const attrs = link ? ' href="#"' : "";
            return (
              `<${tag} class="lrow${link ? " link" : ""}" data-path="${esc(r.path)}"${attrs}>` +
              `<span class="fmtg">${esc(fmtOf(r))}</span><span>${r.totalWords}字</span>` +
              `<span class="${st.cls}">${esc(st.text)}</span></${tag}>`
            );
          })
          .join("");
        return (
          `<div class="lcard${isNow ? " now" : ""}" data-path="${esc(lg.readings[0]?.path ?? "")}">` +
          `<div class="lc-body"><h3>第${hanNum(lg.lesson)}課<span class="en">L${String(lg.lesson).padStart(2, "0")}</span></h3>` +
          rows +
          `</div>` +
          `<div class="obi"><b>${esc(band)}</b> · 當代 B${lg.book} L${lg.lesson} · ${lg.articles}篇 · 詞彙與語法 100%</div>` +
          `</div>`
        );
      })
      .join("");
  };

  const spinesHtml = (): string =>
    SHELF_BOOKS.map((b) => {
      const has = byBook.has(b);
      const open = b === openBook;
      return (
        `<button class="spine${open ? " open" : ""}${has ? "" : " empty"}" role="listitem" ` +
        `data-book="${b}"${open ? ' aria-current="true"' : ""}>` +
        `<span class="vt">第${hanNum(b)}冊</span><span class="no">B${b}</span></button>`
      );
    }).join("");

  const paint = (): void => {
    wrap.innerHTML =
      `<div class="sec-head"><h2>課本架</h2><span class="sec-en">${esc(say("companion", vi))}</span>` +
      `<span class="sec-cnt">${esc(say("booksRange", vi))} · ${lessonCount} ${esc(say("lessonsWord", vi))}</span></div>` +
      `<div class="shelf"><div class="spines" role="list">${spinesHtml()}</div>` +
      `<div class="lessons">${lessonsHtml(openBook)}</div></div>` +
      `<p class="shelf-note">每課 3 篇，聯集涵蓋該課 100% 詞彙與語法。 ${esc(say("shelfNote", vi))}</p>`;
  };
  paint();

  const onClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    const spineBtn = target.closest<HTMLElement>(".spine[data-book]");
    if (spineBtn) {
      openBook = Number(spineBtn.dataset.book);
      paint();
      return;
    }
    const go = target.closest<HTMLElement>("[data-path]");
    if (go) {
      e.preventDefault();
      const path = go.getAttribute("data-path");
      if (path) opts.onOpen(path);
    }
  };
  wrap.addEventListener("click", onClick);
  root.append(wrap);

  return {
    destroy: () => {
      wrap.removeEventListener("click", onClick);
      clear(root);
    },
  };
}

/** Fetch `companion-lessons.json` from the vault base; [] when absent/invalid. */
export async function loadCompanionLessons(vaultBase: string): Promise<CompanionLesson[]> {
  try {
    const res = await fetch(`${vaultBase.replace(/\/$/, "")}/companion-lessons.json`);
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter((d): d is CompanionLesson => !!d && typeof (d as CompanionLesson).unit === "string");
  } catch {
    return [];
  }
}
