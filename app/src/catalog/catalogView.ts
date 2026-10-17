import { mountCatalogViewTail1 } from "./catalogView.fns1.js";
import { mountCatalogViewTail2 } from "./catalogView.fns2.js";

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

interface CatalogViewOpts {
  catalog: CatalogEntry[];
  getStatus: (lang: string, word: string) => WordStatus;
  onOpen: (path: string) => void;
  bandMin?: number;
  bandMax?: number;
  
  isLoggedIn?: boolean | (() => boolean);
  getLastReadingId?: () => string | null;
  
  isDemo?: boolean;
  
  loading?: boolean;
  
  renderCompanion?: (host: HTMLElement) => void;
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const stripTags = (s: string): string => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const RUNG_ZH: Record<string, string> = {
  A1: "入門 Starter",
  A2: "基礎 Elementary",
  B1: "進階 Intermediate",
};

function courseLabel(r: ReadingRecord): string {
  return r.book != null && r.lesson != null ? `當代 B${r.book} L${r.lesson}` : (RUNG_ZH[r.band] ?? r.band);
}

function courseCell(r: ReadingRecord): string {
  return r.book != null && r.lesson != null ? `當代 B${r.book}·L${String(r.lesson).padStart(2, "0")}` : "—";
}

function obiHtml(r: ReadingRecord, vi: boolean, opts: { min?: boolean; known?: boolean } = {}): string {
  const parts: string[] = [esc(courseLabel(r)), esc(r.fmt), `${r.len}字`];
  if (opts.known && r.covReal) parts.push(`${r.cov}% ${esc(say("known", vi))}`);
  parts.push(`${r.newN} ${esc(say("new", vi))}`);
  if (opts.min && r.mins) parts.push(`≈${r.mins} ${esc(say("min", vi))}`);
  return `<b>${esc(r.band)}</b> · ${parts.join(" · ")}`;
}

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
const ctx: any = {};

  const isDemo = opts.isDemo ?? opts.catalog === FIXTURE_CATALOG;

  const resolveLoggedIn = (): boolean => {
    const v = opts.isLoggedIn;
    if (typeof v === "function") return v();
    return v ?? false;
  };

  
  const facetedRecords = (): ReadingRecord[] => {
    const faceted = applyFacets(opts.catalog, facetsFromHash(location.hash));
    return faceted.map((e) => toReadingRecord(e, opts.getStatus));
  };

  
  ctx.say = say; ctx.esc = esc; ctx.el = el; ctx.courseLabel = courseLabel; ctx.firstCellHtml = firstCellHtml; ctx.obiHtml = obiHtml; ctx.groupCatalogByLesson = groupCatalogByLesson; ctx.RUNG_ZH = RUNG_ZH; ctx.hanNum = hanNum; ctx.firstText = firstText; ctx.bandNum = bandNum; ctx.courseCell = courseCell; ctx.clear = clear; ctx.root = root; ctx.isViRail = isViRail; ctx.isDemo = isDemo; ctx.opts = opts; ctx.facetedRecords = facetedRecords; ctx.resolveLoggedIn = resolveLoggedIn; ctx.pickContinueCandidate = pickContinueCandidate; ctx.applyFacets = applyFacets; ctx.facetsFromHash = facetsFromHash; ctx.toReadingRecord = toReadingRecord;
return mountCatalogViewTail2(ctx);
}
