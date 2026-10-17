import { mountCatalogViewTail1 } from "./catalogView.fns1.js";
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
export function mountCatalogViewTail2(ctx: any): any {
const mastheadHtml = (vi: boolean): string => {
    const m = ctx.say("masthead", vi);
    const dot = m.indexOf(". ");
    const lead = dot > 0 ? m.slice(0, dot + 1) : m;
    const rest = dot > 0 ? m.slice(dot + 2) : "";
    return `<p><b>${ctx.esc(lead)}</b>${rest ? ` ${ctx.esc(rest)}` : ""}</p>`;
  };


  const buildContinue = (cr: ReadingRecord, vi: boolean): HTMLElement => {
    const cont = ctx.el("section", { class: "lib-continue", attrs: { "aria-label": ctx.say("continue", vi) } });
    const card = ctx.el("a", {
      class: "cont-card glow",
      dataset: { go: "1", path: cr.path },
      attrs: { href: "#", role: "button", "aria-label": `${ctx.say("resume", vi)} ${cr.descTitle}` },
    });
    const resumeLbl = ctx.say("resume", vi).replace(/\s*→\s*$/, "");
    card.innerHTML =
      `<div class="cont-row"><div class="cont-main">` +
      `<div class="cont-top"><span class="cont-zh">續讀</span>` +
      `<span class="cont-en">${ctx.esc(ctx.say("continue", vi))}</span>` +
      `<span class="cont-pos">${ctx.esc(ctx.courseLabel(cr))} · ${ctx.esc(cr.fmt)}</span></div>` +
      `<p class="cont-ex" lang="zh-Hant">${ctx.firstCellHtml(cr)}</p>` +
      `</div><span class="cont-go">續讀 <span class="en">${ctx.esc(resumeLbl)}</span></span></div>` +
      `<span class="obi">${ctx.obiHtml(cr, vi, { min: true, known: true })}</span>`;
    cont.append(card);
    return cont;
  };


  const buildCatalog = (records: ReadingRecord[], vi: boolean, continueId: string | null): HTMLElement => {
    const sec = ctx.el("section", { class: "catalog-sec", attrs: { "aria-label": "目錄 Catalog" } });
    const readingsWord = records.length === 1 ? ctx.say("reading", vi) : ctx.say("readings", vi);
    const cols: { key: string; type: "text" | "num"; zh: string; en: string; num?: boolean }[] = [
      { key: "first", type: "text", zh: "首行", en: ctx.say("colFirst", vi) },
      { key: "lesson", type: "num", zh: "課", en: ctx.say("colLesson", vi) },
      { key: "fmt", type: "text", zh: "體", en: ctx.say("colFormat", vi) },
      { key: "band", type: "num", zh: "級", en: ctx.say("colBand", vi) },
      { key: "len", type: "num", zh: "字", en: ctx.say("colChars", vi), num: true },
      { key: "new", type: "num", zh: "新", en: ctx.say("colNew", vi), num: true },
    ];
    const thead =
      `<tr>` +
      cols
        .map(
          (c) =>
            `<th data-key="${c.key}" data-type="${c.type}"${c.num ? ' class="num"' : ""} scope="col">` +
            `${ctx.esc(c.zh)} <span class="hen">${ctx.esc(c.en)}</span><span class="ind" aria-hidden="true"></span></th>`,
        )
        .join("") +
      `<th class="nosort" scope="col">續</th>`;


    const groups = ctx.groupCatalogByLesson(records);
    let idx = 0;
    let body = "";
    for (const g of groups) {
      const header = g.free
        ? `免 Free readings · ${ctx.RUNG_ZH[g.band] ?? g.band} · ${ctx.esc(g.band)} · ${g.items.length} 篇`
        : `當代 第${ctx.hanNum(g.book!)}冊 · 第${ctx.hanNum(g.lesson!)}課 · ${ctx.esc(g.band)} · ${g.items.length} 篇`;
      body += `<tr class="grp"><td colspan="7">${header}</td></tr>`;
      for (const r of g.items) {
        const lessonKey = r.book != null && r.lesson != null ? r.book * 100 + r.lesson : 900 + idx;
        const here = r.path === continueId;
        body +=
          `<tr class="rd${here ? " here" : ""}" data-idx="${idx}" data-path="${ctx.esc(r.path)}" ` +
          `data-first="${ctx.esc(ctx.firstText(r))}" data-lesson="${lessonKey}" data-fmt="${ctx.esc(r.fmt)}" ` +
          `data-band="${ctx.bandNum(r.band)}" data-len="${r.len}" data-new="${r.newN}">` +
          `<td class="cat-first" lang="zh-Hant">${ctx.firstCellHtml(r)}</td>` +
          `<td class="cat-lesson">${ctx.esc(ctx.courseCell(r))}</td>` +
          `<td class="cat-fmt">${ctx.esc(r.fmt)}</td>` +
          `<td class="cat-band">${ctx.esc(r.band)}</td>` +
          `<td class="num">${r.len}</td>` +
          `<td class="num">${r.newN}</td>` +
          `<td class="cat-resume">${here ? "●" : ""}</td>` +
          `</tr>`;
        idx++;
      }
    }

    sec.innerHTML =
      `<div class="sec-head"><h2>目錄</h2><span class="sec-en">${ctx.esc(ctx.say("catalog", vi))}</span>` +
      `<span class="sec-cnt">${records.length} ${ctx.esc(readingsWord)}</span></div>` +
      `<p class="cat-hint">點欄位標題排序 · ${ctx.esc(ctx.say("sortHint", vi))}</p>` +
      `<div class="cat-scroll"><table class="catalog" aria-label="讀物目錄 catalog of readings">` +
      `<thead>${thead}</thead><tbody>${body || `<tr><td colspan="7"><div class="lib-empty" style="margin:14px">${ctx.esc(ctx.say("emptyFilter", vi))}</div></td></tr>`}</tbody>` +
      `</table></div>`;
    return sec;
  };


  const wireSort = (table: HTMLTableElement): void => {
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    const natural = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"));
    const ths = Array.from(table.querySelectorAll<HTMLElement>("th[data-key]"));
    const coll = new Intl.Collator("zh-Hant", { numeric: true });
    let stateKey: string | null = null;
    let dir = 0; 

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
      tbody.classList.add("sorted"); 
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
  }; ctx.mastheadHtml = mastheadHtml; ctx.buildContinue = buildContinue; ctx.buildCatalog = buildCatalog; ctx.wireSort = wireSort;
return mountCatalogViewTail1(ctx);
}
