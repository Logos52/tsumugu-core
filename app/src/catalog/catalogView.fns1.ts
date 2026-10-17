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
export function mountCatalogViewTail1(ctx: any): any {
const buildCardStudies = (records: ReadingRecord[], vi: boolean): HTMLElement => {
    const sec = ctx.el("section", { class: "cards-sec", attrs: { "aria-label": "卡 Card studies" } });
    const picks = records.slice().sort((a, b) => b.newN - a.newN).slice(0, 4);
    const cards = picks
      .map((r, i) => {
        const glow = i % 2 === 0 ? " glow" : "";
        return (
          `<article class="pcard${glow}">` +
          `<div class="pcard-img" aria-hidden="true"><span class="mk">圖</span><span class="mklab">圖卡 image</span></div>` +
          `<div class="pcard-body"><p class="pcard-ex" lang="zh-Hant">${ctx.firstCellHtml(r)}</p></div>` +
          `<div class="obi">${ctx.obiHtml(r, vi)}</div></article>`
        );
      })
      .join("");
    sec.innerHTML =
      `<div class="sec-head"><h2>卡</h2><span class="sec-en">${ctx.esc(ctx.say("cardStudies", vi))}</span></div>` +
      `<p class="cards-fact">${ctx.esc(ctx.say("cardStudiesFact", vi))}</p>` +
      `<div class="cardrow">${cards}</div>`;
    return sec;
  };

  
  const render = (): void => {
    ctx.clear(ctx.root);
    const vi = ctx.isViRail();
    const wrap = ctx.el("div", { class: "wrap lib" });

    if (ctx.isDemo) {
      wrap.append(
        ctx.el("div", { class: "lib-demo-banner", attrs: { role: "note" }, html: `⚠ ${ctx.say("demoBanner", vi)}` }),
      );
    }

    if (ctx.opts.loading) {
      const sk = ctx.el("div", {
        class: "lib-skeleton",
        attrs: { role: "status", "aria-busy": "true", "aria-label": ctx.say("loading", vi) },
      });
      sk.innerHTML = Array.from({ length: 6 }, () => '<div class="sk"></div>').join("");
      wrap.append(sk);
      ctx.root.append(wrap);
      return;
    }

    if (ctx.opts.catalog.length === 0) {
      wrap.append(ctx.el("div", { class: "lib-empty lib-empty-catalog", html: ctx.say("emptyCatalog", vi) }));
      wrap.append(ctx.el("p", { class: "lib-note", html: ctx.say("note", vi) }));
      ctx.root.append(wrap);
      return;
    }

    const records = ctx.facetedRecords();

    
    wrap.append(ctx.el("div", { class: "masthead", html: ctx.mastheadHtml(vi) }));

    
    const showProgress = ctx.resolveLoggedIn() || records.some((r: any) => r.covReal);
    const lastId = ctx.opts.getLastReadingId?.() ?? null;
    const candidateEntry = showProgress
      ? ctx.pickContinueCandidate(ctx.applyFacets(ctx.opts.catalog, ctx.facetsFromHash(location.hash)), ctx.opts.getStatus, lastId)
      : null;
    const continueId = candidateEntry?.path ?? null;
    if (candidateEntry) {
      wrap.append(ctx.buildContinue(ctx.toReadingRecord(candidateEntry, ctx.opts.getStatus), vi));
    }

    
    if (ctx.opts.renderCompanion) {
      const slot = ctx.el("section", { class: "lib-companion-slot" });
      ctx.opts.renderCompanion(slot);
      if (slot.childNodes.length > 0) wrap.append(slot);
    }

    
    const catalogSec = ctx.buildCatalog(records, vi, continueId);
    wrap.append(catalogSec);

    
    wrap.append(buildCardStudies(records, vi));

    wrap.append(ctx.el("p", { class: "lib-note", html: ctx.say("note", vi) }));
    ctx.root.append(wrap);

    
    const table = catalogSec.querySelector("table.catalog");
    if (table) ctx.wireSort(table);
    wrap.addEventListener("click", (e: any) => {
      const target = e.target as HTMLElement;
      if (target.closest<HTMLElement>("th[data-key]")) return; 
      const go = target.closest<HTMLElement>('[data-go="1"], tr.rd[data-path]');
      if (go) {
        e.preventDefault();
        const path = go.getAttribute("data-path") ?? go.dataset.path;
        if (path) ctx.opts.onOpen(path);
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
      ctx.clear(ctx.root);
    },
  };
}
