import type { CatalogEntry } from "../catalog/types.js";

import type { WordStatus } from "@tsumugu/engine";

import { formatLabel, hanNum, isViRail, say } from "../catalog/libraryModel.js";

import { el, clear } from "../ui/dom.js";

import { percentKnown } from "../catalog/coverage.js";

import { buildCompanionSpine } from "./companionShelf.part2.js";

import type { BookGroup, CompanionGrammar, CompanionLesson } from "./companionShelf.part2.js";
import { isCompanionLesson } from "./shapes.js";

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function grammarHref(g: CompanionGrammar, base: string): string | null {
  if (!g.edSlug) return null;
  return `${base.replace(/\/$/, "")}/g/${encodeURIComponent(g.edSlug)}`;
}

interface CompanionShelfOpts {
  catalog: CatalogEntry[];
  lessons?: CompanionLesson[];
  onOpen: (path: string) => void;
  
  grammarBase?: string;
  
  getLastReadingId?: () => string | null;
  
  getStatus?: (lang: string, word: string) => WordStatus;
}

const SHELF_BOOKS = [1, 2, 3, 4, 5];

const fmtOf = (e: CatalogEntry): string => formatLabel(e);

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

export async function loadCompanionLessons(vaultBase: string): Promise<CompanionLesson[]> {
  try {
    const res = await fetch(`${vaultBase.replace(/\/$/, "")}/companion-lessons.json`);
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter(isCompanionLesson);
  } catch {
    return [];
  }
}
