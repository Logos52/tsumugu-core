import type { CatalogEntry } from "../catalog/types.js";
import { percentKnown, readingBand } from "../catalog/coverage.js";
import type { WordStatus } from "@tsumugu/engine";
import { el, clear } from "../ui/dom.js";

function fuzzyScore(query: string, title: string): number {
  const q = query.toLowerCase().trim();
  const t = title.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 100 - t.indexOf(q);
  let qi = 0;
  let score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 10 - Math.min(i, 9);
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

function metaLine(entry: CatalogEntry): string {
  const parts: string[] = [entry.kind];
  if (entry.binding) {
    parts.push(`ACCC B${entry.binding.book} L${entry.binding.lesson}`);
  }
  return parts.join(" · ");
}

export interface SwitcherOpts {
  catalog: CatalogEntry[];
  getStatus: (lang: string, word: string) => WordStatus;
  bandMin?: number;
  bandMax?: number;
  onSelect: (path: string) => void;
}

export function mountCommandSwitcher(opts: SwitcherOpts): { open: () => void; destroy: () => void } {
  const bandMin = opts.bandMin ?? 80;
  const bandMax = opts.bandMax ?? 95;
  const backdrop = el("div", { class: "tsg-switcher-backdrop tsg-switcher-hidden" });
  const panel = el("div", { class: "tsg-switcher" });
  const input = el("input", {
    class: "tsg-switcher-input",
    attrs: { type: "search", placeholder: "Jump to a reading…", autocomplete: "off" },
  });
  const list = el("div", { class: "tsg-switcher-list" });
  panel.append(input, list);
  backdrop.append(panel);
  document.body.append(backdrop);

  let active = 0;
  let visible = false;

  const ranked = (query: string): CatalogEntry[] => {
    return opts.catalog
      .map((e) => {
        const lang = e.lang ?? "zh-Hant";
        const pct = percentKnown(e.wordCounts, e.totalWords, (w) => opts.getStatus(lang, w));
        const inBand = readingBand(pct, bandMin, bandMax) === "in-range";
        const score = fuzzyScore(query, e.title ?? e.path);
        return { e, inBand, score };
      })
      .filter((r) => r.score >= 0)
      .sort(
        (a, b) =>
          (a.inBand === b.inBand ? 0 : a.inBand ? -1 : 1) ||
          b.score - a.score ||
          (a.e.title ?? "").localeCompare(b.e.title ?? ""),
      )
      .slice(0, 20)
      .map((r) => r.e);
  };

  const renderList = (): void => {
    clear(list);
    const items = ranked(input.value);
    active = Math.min(active, Math.max(0, items.length - 1));
    items.forEach((entry, i) => {
      const lang = entry.lang ?? "zh-Hant";
      const pct = percentKnown(entry.wordCounts, entry.totalWords, (w) =>
        opts.getStatus(lang, w),
      );
      const row = el("button", {
        class: i === active ? "tsg-switcher-row tsg-switcher-row--active" : "tsg-switcher-row",
        type: "button",
        on: {
          click: () => {
            close();
            opts.onSelect(entry.path);
          },
        },
      });
      row.append(
        el("span", { class: "tsg-switcher-title", text: entry.title ?? entry.path }),
        el("span", { class: "tsg-switcher-meta", text: `${metaLine(entry)} · ${pct}%` }),
      );
      list.append(row);
    });
  };

  const close = (): void => {
    visible = false;
    backdrop.classList.add("tsg-switcher-hidden");
    input.value = "";
    active = 0;
  };

  const open = (): void => {
    visible = true;
    backdrop.classList.remove("tsg-switcher-hidden");
    active = 0;
    renderList();
    input.focus();
  };

  input.addEventListener("input", () => {
    active = 0;
    renderList();
  });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  const onKey = (e: KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (visible) close();
      else open();
      return;
    }
    if (!visible) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    const items = ranked(input.value);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(active + 1, items.length - 1);
      renderList();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(active - 1, 0);
      renderList();
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      close();
      opts.onSelect(items[active]!.path);
    }
  };

  document.addEventListener("keydown", onKey);

  return {
    open,
    destroy: () => {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
    },
  };
}