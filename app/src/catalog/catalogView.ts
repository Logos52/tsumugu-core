/**
 * Library surface (home) — 冊 Bound Volume convergence (2026-07-02, §8 final).
 *
 * Top-to-bottom, matching mockups/explorations-2026-07/unified/library.html:
 *   masthead (one line) → Continue strip (quiet glow row + obi) → 課本架
 *   Companion shelf (slot; Book spines → lesson set-cards) → 目錄 Catalog (a
 *   large sortable SPREADSHEET grouped by 冊/課, replacing the Reading Wall) →
 *   卡 Card studies (planned picture cards) → note.
 *
 * The green (D Verdigris) is the only saturated voice; statistics stay minimal
 * (one fact per spreadsheet row: the 新 new-word count; no rings, no zebra, no
 * percentages). All colour flows through the app's semantic --tsg-* tokens.
 *
 * The old Seal-red Reading Wall (topic rail / gallery / study-A·C cards / table
 * toggle) is retired here; its pure model helpers stay in libraryModel.ts.
 */
import type { WordStatus } from "@tsumugu/engine";
import { el, clear } from "../ui/dom.js";
import { pickContinueCandidate } from "./coverage.js";
import { applyFacets, facetsFromHash } from "./facets.js";
import type { CatalogEntry } from "./types.js";
import { FIXTURE_CATALOG } from "./fixtures/catalog.js";
import {
  bandNum,
  groupCatalogByLesson,
  hanNum,
  isViRail,
  say,
  toReadingRecord,
  type ReadingRecord,
} from "./libraryModel.js";

export interface CatalogViewOpts {
  catalog: CatalogEntry[];
  getStatus: (lang: string, word: string) => WordStatus;
  onOpen: (path: string) => void;
  bandMin?: number;
  bandMax?: number;
  /** When true (logged-in), show coverage % on the continue obi + resume row. */
  isLoggedIn?: boolean | (() => boolean);
  getLastReadingId?: () => string | null;
  /** Force the demo banner; defaults to detecting the bundled fixture catalog. */
  isDemo?: boolean;
  /** Render the loading skeleton instead of content (manifest still in flight). */
  loading?: boolean;
  /**
   * Companion-shelf slot: called with a host section placed between the
   * continue strip and the catalog spreadsheet (hub order per the 2026-07-02
   * amendment: Continue → 課本架 Companion → 目錄 Catalog). The slot is dropped
   * when the callback renders nothing.
   */
  renderCompanion?: (host: HTMLElement) => void;
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const stripTags = (s: string): string => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Rung labels for the "免 Free readings" band buckets (unbound entries). */
const RUNG_ZH: Record<string, string> = {
  A1: "入門 Starter",
  A2: "基礎 Elementary",
  B1: "進階 Intermediate",
};

/** 課 position label for the obi + continue strip. */
function courseLabel(r: ReadingRecord): string {
  return r.book != null && r.lesson != null ? `當代 B${r.book} L${r.lesson}` : (RUNG_ZH[r.band] ?? r.band);
}

/** 課 spreadsheet cell (zero-padded lesson), or an em dash when unbound. */
function courseCell(r: ReadingRecord): string {
  return r.book != null && r.lesson != null ? `當代 B${r.book}·L${String(r.lesson).padStart(2, "0")}` : "—";
}

/** 書腰 obi band: one fixed fact line. Band leads (bold); % shown only when real. */
function obiHtml(r: ReadingRecord, vi: boolean, opts: { min?: boolean; known?: boolean } = {}): string {
  const parts: string[] = [esc(courseLabel(r)), esc(r.fmt), `${r.len}字`];
  if (opts.known && r.covReal) parts.push(`${r.cov}% ${esc(say("known", vi))}`);
  parts.push(`${r.newN} ${esc(say("new", vi))}`);
  if (opts.min && r.mins) parts.push(`≈${r.mins} ${esc(say("min", vi))}`);
  return `<b>${esc(r.band)}</b> · ${parts.join(" · ")}`;
}

/** First-line cell: pre-rendered excerpt HTML when present, else muted title. */
function firstCellHtml(r: ReadingRecord): string {
  return r.ex ? r.ex : `<span class="cat-first-fallback">${esc(r.descTitle)}</span>`;
}

function firstText(r: ReadingRecord): string {
  return r.ex ? stripTags(r.ex) : r.descTitle;
}

export function mountCatalogView(
  root: HTMLElement,
  opts: CatalogViewOpts,
): { destroy: () => void; render: () => void } {
  const isDemo = opts.isDemo ?? opts.catalog === FIXTURE_CATALOG;

  const resolveLoggedIn = (): boolean => {
    const v = opts.isLoggedIn;
    if (typeof v === "function") return v();
    return v ?? false;
  };

  /** Records after the hard URL facet filter (deep links: #band=…&book=…). */
  const facetedRecords = (): ReadingRecord[] => {
    const faceted = applyFacets(opts.catalog, facetsFromHash(location.hash));
    return faceted.map((e) => toReadingRecord(e, opts.getStatus));
  };

  // ─────────────────────────── masthead ───────────────────────────
  const mastheadHtml = (vi: boolean): string => {
    const m = say("masthead", vi);
    const dot = m.indexOf(". ");
    const lead = dot > 0 ? m.slice(0, dot + 1) : m;
    const rest = dot > 0 ? m.slice(dot + 2) : "";
    return `<p><b>${esc(lead)}</b>${rest ? ` ${esc(rest)}` : ""}</p>`;
  };

  // ─────────────────────────── continue strip ─────────────────────
  const buildContinue = (cr: ReadingRecord, vi: boolean): HTMLElement => {
    const cont = el("section", { class: "lib-continue", attrs: { "aria-label": say("continue", vi) } });
    const card = el("a", {
      class: "cont-card glow",
      dataset: { go: "1", path: cr.path },
      attrs: { href: "#", role: "button", "aria-label": `${say("resume", vi)} ${cr.descTitle}` },
    });
    const resumeLbl = say("resume", vi).replace(/\s*→\s*$/, "");
    card.innerHTML =
      `<div class="cont-row"><div class="cont-main">` +
      `<div class="cont-top"><span class="cont-zh">續讀</span>` +
      `<span class="cont-en">${esc(say("continue", vi))}</span>` +
      `<span class="cont-pos">${esc(courseLabel(cr))} · ${esc(cr.fmt)}</span></div>` +
      `<p class="cont-ex" lang="zh-Hant">${firstCellHtml(cr)}</p>` +
      `</div><span class="cont-go">續讀 <span class="en">${esc(resumeLbl)}</span></span></div>` +
      `<span class="obi">${obiHtml(cr, vi, { min: true, known: true })}</span>`;
    cont.append(card);
    return cont;
  };

  // ─────────────────────────── catalog spreadsheet ────────────────
  const buildCatalog = (records: ReadingRecord[], vi: boolean, continueId: string | null): HTMLElement => {
    const sec = el("section", { class: "catalog-sec", attrs: { "aria-label": "目錄 Catalog" } });
    const readingsWord = records.length === 1 ? say("reading", vi) : say("readings", vi);
    const cols: { key: string; type: "text" | "num"; zh: string; en: string; num?: boolean }[] = [
      { key: "first", type: "text", zh: "首行", en: say("colFirst", vi) },
      { key: "lesson", type: "num", zh: "課", en: say("colLesson", vi) },
      { key: "fmt", type: "text", zh: "體", en: say("colFormat", vi) },
      { key: "band", type: "num", zh: "級", en: say("colBand", vi) },
      { key: "len", type: "num", zh: "字", en: say("colChars", vi), num: true },
      { key: "new", type: "num", zh: "新", en: say("colNew", vi), num: true },
    ];
    const thead =
      `<tr>` +
      cols
        .map(
          (c) =>
            `<th data-key="${c.key}" data-type="${c.type}"${c.num ? ' class="num"' : ""} scope="col">` +
            `${esc(c.zh)} <span class="hen">${esc(c.en)}</span><span class="ind" aria-hidden="true"></span></th>`,
        )
        .join("") +
      `<th class="nosort" scope="col">續</th>`;

    // Natural (shelf) order with a stable idx for the sort tiebreak.
    const groups = groupCatalogByLesson(records);
    let idx = 0;
    let body = "";
    for (const g of groups) {
      const header = g.free
        ? `免 Free readings · ${RUNG_ZH[g.band] ?? g.band} · ${esc(g.band)} · ${g.items.length} 篇`
        : `當代 第${hanNum(g.book!)}冊 · 第${hanNum(g.lesson!)}課 · ${esc(g.band)} · ${g.items.length} 篇`;
      body += `<tr class="grp"><td colspan="7">${header}</td></tr>`;
      for (const r of g.items) {
        const lessonKey = r.book != null && r.lesson != null ? r.book * 100 + r.lesson : 900 + idx;
        const here = r.path === continueId;
        body +=
          `<tr class="rd${here ? " here" : ""}" data-idx="${idx}" data-path="${esc(r.path)}" ` +
          `data-first="${esc(firstText(r))}" data-lesson="${lessonKey}" data-fmt="${esc(r.fmt)}" ` +
          `data-band="${bandNum(r.band)}" data-len="${r.len}" data-new="${r.newN}">` +
          `<td class="cat-first" lang="zh-Hant">${firstCellHtml(r)}</td>` +
          `<td class="cat-lesson">${esc(courseCell(r))}</td>` +
          `<td class="cat-fmt">${esc(r.fmt)}</td>` +
          `<td class="cat-band">${esc(r.band)}</td>` +
          `<td class="num">${r.len}</td>` +
          `<td class="num">${r.newN}</td>` +
          `<td class="cat-resume">${here ? "●" : ""}</td>` +
          `</tr>`;
        idx++;
      }
    }

    sec.innerHTML =
      `<div class="sec-head"><h2>目錄</h2><span class="sec-en">${esc(say("catalog", vi))}</span>` +
      `<span class="sec-cnt">${records.length} ${esc(readingsWord)}</span></div>` +
      `<p class="cat-hint">點欄位標題排序 · ${esc(say("sortHint", vi))}</p>` +
      `<div class="cat-scroll"><table class="catalog" aria-label="讀物目錄 catalog of readings">` +
      `<thead>${thead}</thead><tbody>${body || `<tr><td colspan="7"><div class="lib-empty" style="margin:14px">${esc(say("emptyFilter", vi))}</div></td></tr>`}</tbody>` +
      `</table></div>`;
    return sec;
  };

  /** Three-state column sort (asc → desc → shelf order), ported from the mockup. */
  const wireSort = (table: HTMLTableElement): void => {
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    const natural = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"));
    const ths = Array.from(table.querySelectorAll<HTMLElement>("th[data-key]"));
    const coll = new Intl.Collator("zh-Hant", { numeric: true });
    let stateKey: string | null = null;
    let dir = 0; // 1 asc, -1 desc, 0 off

    const restore = (): void => {
      natural.forEach((r) => tbody.appendChild(r));
      tbody.classList.remove("sorted");
    };
    const sortBy = (key: string, type: string, d: number): void => {
      const rows = natural.filter((r) => r.classList.contains("rd"));
      rows.sort((a, b) => {
        let c: number;
        if (type === "num") c = (parseFloat(a.dataset[key] ?? "0") || 0) - (parseFloat(b.dataset[key] ?? "0") || 0);
        else c = coll.compare(a.dataset[key] ?? "", b.dataset[key] ?? "");
        if (c === 0) c = Number(a.dataset.idx) - Number(b.dataset.idx);
        return c * d;
      });
      tbody.classList.add("sorted"); // CSS hides .grp while sorted
      rows.forEach((r) => tbody.appendChild(r));
    };
    const indicators = (): void => {
      ths.forEach((th) => {
        const active = th.dataset.key === stateKey && dir !== 0;
        th.setAttribute("aria-sort", !active ? "none" : dir === 1 ? "ascending" : "descending");
        const ind = th.querySelector(".ind");
        if (ind) ind.textContent = !active ? "" : dir === 1 ? "↑" : "↓";
      });
    };
    ths.forEach((th) => {
      th.tabIndex = 0;
      th.setAttribute("role", "columnheader");
      th.setAttribute("aria-sort", "none");
      const go = (): void => {
        const key = th.dataset.key!;
        const type = th.dataset.type ?? "text";
        if (stateKey === key) {
          dir = dir === 1 ? -1 : dir === -1 ? 0 : 1;
          if (dir === 0) stateKey = null;
        } else {
          stateKey = key;
          dir = 1;
        }
        indicators();
        if (stateKey === null || dir === 0) restore();
        else sortBy(key, type, dir);
      };
      th.addEventListener("click", go);
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
  };

  // ─────────────────────────── card studies ───────────────────────
  const buildCardStudies = (records: ReadingRecord[], vi: boolean): HTMLElement => {
    const sec = el("section", { class: "cards-sec", attrs: { "aria-label": "卡 Card studies" } });
    const picks = records.slice().sort((a, b) => b.newN - a.newN).slice(0, 4);
    const cards = picks
      .map((r, i) => {
        const glow = i % 2 === 0 ? " glow" : "";
        return (
          `<article class="pcard${glow}">` +
          `<div class="pcard-img" aria-hidden="true"><span class="mk">圖</span><span class="mklab">圖卡 image</span></div>` +
          `<div class="pcard-body"><p class="pcard-ex" lang="zh-Hant">${firstCellHtml(r)}</p></div>` +
          `<div class="obi">${obiHtml(r, vi)}</div></article>`
        );
      })
      .join("");
    sec.innerHTML =
      `<div class="sec-head"><h2>卡</h2><span class="sec-en">${esc(say("cardStudies", vi))}</span></div>` +
      `<p class="cards-fact">${esc(say("cardStudiesFact", vi))}</p>` +
      `<div class="cardrow">${cards}</div>`;
    return sec;
  };

  // ─────────────────────────── render ─────────────────────────────
  const render = (): void => {
    clear(root);
    const vi = isViRail();
    const wrap = el("div", { class: "wrap lib" });

    if (isDemo) {
      wrap.append(
        el("div", { class: "lib-demo-banner", attrs: { role: "note" }, html: `⚠ ${say("demoBanner", vi)}` }),
      );
    }

    if (opts.loading) {
      const sk = el("div", {
        class: "lib-skeleton",
        attrs: { role: "status", "aria-busy": "true", "aria-label": say("loading", vi) },
      });
      sk.innerHTML = Array.from({ length: 6 }, () => '<div class="sk"></div>').join("");
      wrap.append(sk);
      root.append(wrap);
      return;
    }

    if (opts.catalog.length === 0) {
      wrap.append(el("div", { class: "lib-empty lib-empty-catalog", html: say("emptyCatalog", vi) }));
      wrap.append(el("p", { class: "lib-note", html: say("note", vi) }));
      root.append(wrap);
      return;
    }

    const records = facetedRecords();

    // Masthead (one line).
    wrap.append(el("div", { class: "masthead", html: mastheadHtml(vi) }));

    // Continue strip (real resume target + obi fact line).
    const showProgress = resolveLoggedIn() || records.some((r) => r.covReal);
    const lastId = opts.getLastReadingId?.() ?? null;
    const candidateEntry = showProgress
      ? pickContinueCandidate(applyFacets(opts.catalog, facetsFromHash(location.hash)), opts.getStatus, lastId)
      : null;
    const continueId = candidateEntry?.path ?? null;
    if (candidateEntry) {
      wrap.append(buildContinue(toReadingRecord(candidateEntry, opts.getStatus), vi));
    }

    // 課本架 Companion shelf slot (Continue → Companion → Catalog).
    if (opts.renderCompanion) {
      const slot = el("section", { class: "lib-companion-slot" });
      opts.renderCompanion(slot);
      if (slot.childNodes.length > 0) wrap.append(slot);
    }

    // 目錄 Catalog spreadsheet (replaces the Reading Wall).
    const catalogSec = buildCatalog(records, vi, continueId);
    wrap.append(catalogSec);

    // 卡 Card studies (planned picture cards).
    wrap.append(buildCardStudies(records, vi));

    wrap.append(el("p", { class: "lib-note", html: say("note", vi) }));
    root.append(wrap);

    // Wire the spreadsheet sort + row / continue navigation.
    const table = catalogSec.querySelector<HTMLTableElement>("table.catalog");
    if (table) wireSort(table);
    wrap.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("th[data-key]")) return; // sort headers handle themselves
      const go = target.closest<HTMLElement>('[data-go="1"], tr.rd[data-path]');
      if (go) {
        e.preventDefault();
        const path = go.getAttribute("data-path") ?? go.dataset.path;
        if (path) opts.onOpen(path);
      }
    });
  };

  const onHash = (): void => render();
  window.addEventListener("hashchange", onHash);
  render();

  return {
    render,
    destroy: () => {
      window.removeEventListener("hashchange", onHash);
      clear(root);
    },
  };
}
