import type { Col } from "./libraryPage.js";
import { el, clear } from "../ui/dom.js";
import { hanNum, isViRail, say } from "../catalog/libraryModel.js";
import { buildCompanionSpine, type CompanionLesson, type LessonGroup } from "./companionShelf.js";
import type { CatalogEntry } from "../catalog/types.js";
export function mountLibraryPageTail1(ctx: any): any {
const paintTabs = (): void => {
    ctx.wrap.querySelectorAll(".lp-tab").forEach((t: any) => {
      t.classList.toggle("on", t.dataset.shelf === ctx.mode);
    });
  };

  const render = (): void => {
    const vi = ctx.isViRail();
    ctx.clear(ctx.root);
    ctx.clear(ctx.wrap);

    if (ctx.opts.catalog.length === 0) {
      ctx.wrap.append(ctx.el("div", { class: "lib-empty", html: ctx.say("emptyCatalog", vi) }));
      ctx.root.append(ctx.wrap);
      return;
    }

    ctx.wrap.innerHTML =
      `<h2 class="lp-tabs">` +
      `<button class="lp-tab${ctx.mode === "book" ? " on" : ""}" data-shelf="book">課本架 <span class="en">當代中文課程</span></button>` +
      `<button class="lp-tab${ctx.mode === "level" ? " on" : ""}" data-shelf="level">級別架 <span class="en">TOCFL</span></button>` +
      `</h2>` +
      `<div class="lp-band"><div class="lp-shelf"></div><div class="lp-cols"></div></div>` +
      `<div class="lp-sortbar"><span class="sl">${ctx.esc(ctx.say("sort", vi))}</span>` +
      `<button class="sb${ctx.sortMode === "lesson" ? " on" : ""}" data-sort="lesson">${ctx.esc(ctx.say("sortLesson", vi))}</button>` +
      `<button class="sb${ctx.sortMode === "format" ? " on" : ""}" data-sort="format">${ctx.esc(ctx.say("sortFormat", vi))}</button>` +
      `<button class="sb${ctx.sortMode === "title" ? " on" : ""}" data-sort="title">${ctx.esc(ctx.say("sortTitle", vi))}</button>` +
      `<span class="lp-filter">⌕<input type="text" autocomplete="off" placeholder="${ctx.esc(ctx.say("filterPh", vi))}" aria-label="${ctx.esc(ctx.say("searchAria", vi))}"></span></div>` +
      `<div class="lp-card"><table class="lp-cat" aria-label="讀物目錄"><tbody></tbody></table></div>`;

    ctx.shelfEl = ctx.wrap.querySelector(".lp-shelf")!;
    ctx.bandCols = ctx.wrap.querySelector(".lp-cols")!;
    ctx.rowsEl = ctx.wrap.querySelector(".lp-cat tbody")!;
    ctx.filterInput = ctx.wrap.querySelector(".lp-filter input")!;
    ctx.filterInput.value = ctx.q;
    ctx.filterInput.addEventListener("input", () => {
      ctx.q = ctx.filterInput.value.trim();
      ctx.paintList();
    });

    ctx.paintShelf();
    ctx.paintCols();
    ctx.paintList();
    ctx.root.append(ctx.wrap);
  };

  const onClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    const tab = target.closest<HTMLElement>(".lp-tab");
    if (tab && tab.dataset.shelf && tab.dataset.shelf !== ctx.mode) {
      ctx.mode = tab.dataset.shelf as "book" | "level";
      ctx.scope = { col: null, lesson: null };
      paintTabs(); ctx.paintShelf(); ctx.paintCols(); ctx.paintList();
      return;
    }
    const cover = target.closest<HTMLElement>(".lp-cover");
    if (cover) {
      if (cover.dataset.book) ctx.curBook = Number(cover.dataset.book);
      if (cover.dataset.lvl) ctx.curLvl = Number(cover.dataset.lvl);
      ctx.scope = { col: null, lesson: null };
      ctx.paintShelf(); ctx.paintCols(); ctx.paintList();
      return;
    }
    const les = target.closest<HTMLElement>(".lp-les");
    if (les) {
      const key = les.dataset.lesson ?? null;
      const col = Number(les.dataset.col ?? 0);
      if (ctx.scope.lesson === key) ctx.scope = { col, lesson: null }; 
      else ctx.scope = { col, lesson: key };
      ctx.paintCols(); ctx.paintList();
      return;
    }
    const colh = target.closest<HTMLElement>(".lp-colh");
    if (colh) {
      const col = Number(colh.dataset.col ?? 0);
      if (ctx.scope.col === col && ctx.scope.lesson === null) ctx.scope = { col: null, lesson: null }; 
      else ctx.scope = { col, lesson: null };
      ctx.paintCols(); ctx.paintList();
      return;
    }
    const sb = target.closest<HTMLElement>(".lp-sortbar .sb");
    if (sb && sb.dataset.sort) {
      ctx.sortMode = sb.dataset.sort as typeof ctx.sortMode;
      ctx.wrap.querySelectorAll(".lp-sortbar .sb").forEach((x: any) => x.classList.toggle("on", x === sb));
      ctx.paintList();
      return;
    }
    const row = target.closest<HTMLElement>("tr[data-path]");
    if (row?.dataset.path) {
      e.preventDefault();
      ctx.opts.onOpen(row.dataset.path);
    }
  };

  const onKey = (e: KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      ctx.filterInput?.focus();
    } else if (e.key === "Escape" && document.activeElement === ctx.filterInput) {
      ctx.filterInput.value = "";
      ctx.q = "";
      ctx.paintList();
      ctx.filterInput.blur();
    }
  };

  ctx.wrap.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  render();

  return {
    render,
    destroy: () => {
      ctx.wrap.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      ctx.clear(ctx.root);
    },
  };
}
