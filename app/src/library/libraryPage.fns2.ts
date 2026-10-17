import type { Col } from "./libraryPage.js";
import { mountLibraryPageTail1 } from "./libraryPage.fns1.js";
import { el, clear } from "../ui/dom.js";
import { hanNum, isViRail, say } from "../catalog/libraryModel.js";
import { buildCompanionSpine, type CompanionLesson, type LessonGroup } from "./companionShelf.js";
import type { CatalogEntry } from "../catalog/types.js";
export function mountLibraryPageTail2(ctx: any): any {
const leadOf = (e: CatalogEntry, vi: boolean): string => {
    const t = ctx.titleOf(e);
    return vi ? t.vi || t.en : t.en || t.zh;
  };
  const fmtOf = (e: CatalogEntry): string => ctx.fmtClass(ctx.titleOf(e).format ?? e.kind);

  const currentCols = (): Col[] => {
    const partsOf = (book: number): Col[] => {
      const meta = ctx.BOOK_META[book] ?? { lessons: 15, band: "A1" };
      const parts = ctx.bookParts(meta.lessons);
      const ls = ctx.lessonsOf(book);
      return [0, 1, 2].map((i) => {
        const [a, b] = ctx.partRange(parts, i);
        return {
          pn: `第${ctx.CNP[i]!}部分`,
          rg: `L${a}–${b}`,
          lessons: ls.filter((g: any) => g.lesson >= a && g.lesson <= b),
        };
      });
    };
    if (ctx.mode === "book") return partsOf(ctx.curBook);
    const lvl = ctx.SHELF_LEVELS[ctx.curLvl]!;
    if (lvl.books.length === 0) return [{ pn: lvl.code, rg: "", lessons: [] }];
    if (lvl.books.length === 1) return partsOf(lvl.books[0]!);
    return lvl.books.slice(0, 3).map((b: any) => ({
      pn: `第${ctx.hanNum(b)}冊`,
      rg: `${ctx.BOOK_META[b]?.lessons ?? "?"} 課`,
      lessons: ctx.lessonsOf(b),
      book: b,
    }));
  };

  const multiBook = (): boolean => ctx.mode === "level" && (ctx.SHELF_LEVELS[ctx.curLvl]?.books.length ?? 0) > 1;

  const scopedReadings = (cols: Col[]): CatalogEntry[] => {
    const all = (cs: Col[]): CatalogEntry[] => cs.flatMap((c) => c.lessons.flatMap((g) => g.readings));
    if (ctx.scope.lesson) {
      return all(cols).filter((e) => {
        const b = e.binding;
        return b ? `${b.book}:${b.lesson}` === ctx.scope.lesson : false;
      });
    }
    if (ctx.scope.col != null && cols[ctx.scope.col]) return all([cols[ctx.scope.col]!]);
    return all(cols);
  };


  const wrap = ctx.el("div", { class: "wrap lp" });
  let bandCols!: HTMLElement;
ctx.bandCols = bandCols;
  let shelfEl!: HTMLElement;
ctx.shelfEl = shelfEl;
  let rowsEl!: HTMLElement;
ctx.rowsEl = rowsEl;
  let filterInput!: HTMLInputElement;
ctx.filterInput = filterInput;

  const paintShelf = (): void => {
    let html = "";
    if (ctx.mode === "book") {
      for (const b of ctx.SHELF_BOOKS) {
        const has = (ctx.byBook.get(b)?.lessons.length ?? 0) > 0;
        html +=
          `<button class="lp-cover${b === ctx.curBook ? " on" : ""}${has ? "" : " dim"}" data-book="${b}">` +
          `<span class="vt">第${ctx.hanNum(b)}冊</span><span class="lv">${ctx.esc(ctx.BOOK_META[b]?.band ?? "")}</span></button>`;
      }
    } else {
      ctx.SHELF_LEVELS.forEach((L: any, i: any) => {
        const live = L.books.some((b: any) => (ctx.byBook.get(b)?.lessons.length ?? 0) > 0);
        html +=
          `<button class="lp-cover lvl${i === ctx.curLvl ? " on" : ""}${live ? "" : " dim"}" data-lvl="${i}">` +
          `<span class="vt">${ctx.esc(L.code)}</span></button>`;
      });
    }
    ctx.shelfEl.innerHTML = html;
  };

  const paintCols = (): void => {
    const vi = ctx.isViRail();
    const cols = currentCols();
    let html = "";
    cols.forEach((col, i) => {
      const hOn = ctx.scope.col === i && ctx.scope.lesson === null;
      html += `<div class="lp-col">`;
      html +=
        `<button class="lp-colh${hOn ? " on" : ""}" data-col="${i}">` +
        `<span class="pn">${ctx.esc(col.pn)}</span><span class="rg">${ctx.esc(col.rg)}</span></button>`;
      if (col.lessons.length === 0) {
        html += `<div class="lp-soon">尚未出版<span>coming soon</span></div>`;
      } else {
        for (const g of col.lessons) {
          const key = ctx.lessonKey(g);
          const first = g.readings[0];
          const lead = first ? leadOf(first, vi) : g.title || g.unit;
          html +=
            `<button class="lp-les${ctx.scope.lesson === key ? " on" : ""}" data-col="${i}" data-lesson="${ctx.esc(key)}">` +
            `<span class="lnum">課${g.lesson}</span><span class="ltitle">${ctx.esc(lead)}</span></button>`;
        }
      }
      html += `</div>`;
    });
    ctx.bandCols.innerHTML = html;

    const maxL = Math.max(0, ...cols.map((c) => c.lessons.length));
    wrap.style.setProperty("--lp-shelf-h", `${Math.max(120, 27 + Math.min(maxL, 5) * 35)}px`);
  };

  const paintList = (): void => {
    const vi = ctx.isViRail();
    const cols = currentCols();
    let data = scopedReadings(cols);
    const hadAny = data.length > 0;
    if (ctx.q) {
      const ql = ctx.q.toLowerCase();
      data = data.filter((e) => {
        const t = ctx.titleOf(e);
        return (
          t.en.toLowerCase().includes(ql) || t.vi.toLowerCase().includes(ql) || t.zh.includes(ctx.q)
        );
      });
    }
    if (data.length === 0) {
      const msg = ctx.q && hadAny ? ctx.say("noMatches", vi) : ctx.say("notYetPublished", vi);
      ctx.rowsEl.innerHTML = `<tr><td class="lp-empty" colspan="3">${ctx.esc(msg)}</td></tr>`;
      return;
    }
    const lessonNum = (e: CatalogEntry): number => (e.binding ? e.binding.book * 100 + e.binding.lesson : 0);
    if (ctx.sortMode === "format") data.sort((a, b) => fmtOf(a).localeCompare(fmtOf(b)) || lessonNum(a) - lessonNum(b) || a.path.localeCompare(b.path));
    else if (ctx.sortMode === "title") data.sort((a, b) => leadOf(a, vi).localeCompare(leadOf(b, vi)));
    else data.sort((a, b) => lessonNum(a) - lessonNum(b) || a.path.localeCompare(b.path));

    const multi = multiBook();
    let prev = "";
    ctx.rowsEl.innerHTML = data
      .map((e) => {
        const t = ctx.titleOf(e);
        const cls = fmtOf(e);
        const b = e.binding;
        const lkey = b ? `${b.book}:${b.lesson}` : "";

        const showL = ctx.sortMode !== "lesson" || lkey !== prev;
        prev = lkey;
        const lab = b ? `${multi ? `${ctx.hanNum(b.book)}·` : ""}課${b.lesson}` : "";
        return (
          `<tr data-path="${ctx.esc(e.path)}"><td class="lp-title">` +
          `<i class="lp-d ${cls}" title="${ctx.esc(ctx.FMT_TIP[cls] ?? "")}"></i>` +
          `<span class="lead">${ctx.esc(vi ? t.vi || t.en : t.en || t.zh)}</span></td>` +
          `<td class="lp-zh" lang="zh-Hant">${ctx.esc(t.zh)}</td>` +
          `<td class="lp-lesson">${showL ? ctx.esc(lab) : ""}</td></tr>`
        );
      })
      .join("");
  };

  ctx.wrap = wrap; ctx.paintList = paintList; ctx.paintShelf = paintShelf; ctx.paintCols = paintCols;
return mountLibraryPageTail1(ctx);
}
