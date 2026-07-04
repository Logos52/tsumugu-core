// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from "vitest";
import { WordStore } from "@tsumugu/engine";
import { mountCatalogView } from "./catalogView.js";
import { FIXTURE_CATALOG } from "./fixtures/catalog.js";
import type { CatalogEntry } from "./types.js";

const rows = (root: HTMLElement): NodeListOf<Element> => root.querySelectorAll(".catalog-sec tbody tr.rd");
const mount = (root: HTMLElement, store: WordStore, extra: Partial<Parameters<typeof mountCatalogView>[1]> = {}) =>
  mountCatalogView(root, {
    catalog: FIXTURE_CATALOG,
    getStatus: (lang, word) => store.getStatus(lang, word),
    onOpen: () => {},
    ...extra,
  });

describe("catalogView (Bound Volume library)", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.append(root);
    location.hash = "";
    document.documentElement.removeAttribute("data-rail");
  });

  it("renders a masthead + one spreadsheet row per fixture entry, no undefined/NaN", () => {
    mount(root, new WordStore());
    expect(root.querySelector(".masthead p")).not.toBeNull();
    expect(rows(root).length).toBe(FIXTURE_CATALOG.length);
    expect(root.textContent).not.toMatch(/undefined%|NaN%|undefined|NaN/);
  });

  it("shows a demo banner whenever the fixture catalog renders", () => {
    mount(root, new WordStore());
    expect(root.querySelector(".lib-demo-banner")).not.toBeNull();
  });

  it("groups spreadsheet rows by lesson (冊/課) with group header rows", () => {
    mount(root, new WordStore());
    const groups = root.querySelectorAll(".catalog-sec tbody tr.grp");
    expect(groups.length).toBeGreaterThanOrEqual(3); // ≥2 bound lessons + ≥1 free band bucket
    expect(root.querySelector(".catalog-sec")?.textContent).toContain("篇");
  });

  it("shows a continue strip (glow card + obi) once local known-word progress exists", () => {
    const store = new WordStore();
    store.setStatus("zh-Hant", "咖啡", "known");
    mount(root, store);
    const cont = root.querySelector(".lib-continue");
    expect(cont).not.toBeNull();
    expect(cont?.querySelector(".cont-card.glow")).not.toBeNull();
    expect(cont?.querySelector(".cont-ex")).not.toBeNull();
    expect(cont?.querySelector(".obi")).not.toBeNull();
  });

  it("renders the band + course-position cell on a bound reading row", () => {
    mount(root, new WordStore());
    const bound = FIXTURE_CATALOG.find((e) => e.binding?.book === 4 && e.binding.lesson === 3)!;
    const row = root.querySelector(`.catalog-sec tr.rd[data-path="${bound.path}"]`)!;
    expect(row.querySelector(".cat-band")?.textContent).toBe("A2");
    expect(row.querySelector(".cat-lesson")?.textContent).toContain("B4·L03");
    expect(row.querySelector(".cat-fmt")?.textContent).toBeTruthy();
  });

  it("renders a pre-rendered excerpt as the first-line cell (marked words)", () => {
    mount(root, new WordStore());
    const bound = FIXTURE_CATALOG.find((e) => e.excerpt)!;
    const row = root.querySelector(`.catalog-sec tr.rd[data-path="${bound.path}"]`)!;
    expect(row.querySelector(".cat-first .mn, .cat-first .ml")).not.toBeNull();
  });

  it("deep link filters to A2 + book 4 (single row)", () => {
    location.hash = "#band=A2&book=4";
    mount(root, new WordStore());
    expect(rows(root).length).toBe(1);
    expect(root.querySelector(".catalog-sec")?.textContent).toContain("B4·L03");
  });

  it("clicking a spreadsheet row opens the reader via data-path", () => {
    let opened = "";
    const store = new WordStore();
    mountCatalogView(root, {
      catalog: FIXTURE_CATALOG,
      getStatus: (lang, word) => store.getStatus(lang, word),
      onOpen: (p) => (opened = p),
    });
    const bound = FIXTURE_CATALOG.find((e) => e.binding?.book === 4)!;
    root.querySelector<HTMLElement>(`.catalog-sec tr.rd[data-path="${bound.path}"]`)?.click();
    expect(opened).toBe(bound.path);
  });

  it("clicking the continue card resumes the reader", () => {
    let opened = "";
    const store = new WordStore();
    store.setStatus("zh-Hant", "咖啡", "known");
    mountCatalogView(root, {
      catalog: FIXTURE_CATALOG,
      getStatus: (lang, word) => store.getStatus(lang, word),
      onOpen: (p) => (opened = p),
    });
    root.querySelector<HTMLElement>(".lib-continue .cont-card")?.click();
    expect(opened).not.toBe("");
  });

  it("column headers sort three-state (asc → desc → shelf order) and hide group rows while sorted", () => {
    mount(root, new WordStore());
    const th = root.querySelector<HTMLElement>('.catalog-sec th[data-key="len"]')!;
    const tbody = root.querySelector<HTMLElement>(".catalog-sec tbody")!;
    const lens = (): number[] => [...rows(root)].map((r) => Number((r as HTMLElement).dataset.len));

    th.click(); // ascending
    expect(tbody.classList.contains("sorted")).toBe(true);
    expect(th.getAttribute("aria-sort")).toBe("ascending");
    const asc = lens();
    expect(asc).toEqual([...asc].sort((a, b) => a - b));

    th.click(); // descending
    expect(th.getAttribute("aria-sort")).toBe("descending");
    const desc = lens();
    expect(desc).toEqual([...desc].sort((a, b) => b - a));

    th.click(); // back to shelf order
    expect(tbody.classList.contains("sorted")).toBe(false);
    expect(th.getAttribute("aria-sort")).toBe("none");
  });

  it("renders a 卡 Card studies placeholder section with picture cards", () => {
    mount(root, new WordStore());
    const cards = root.querySelectorAll(".cards-sec .pcard");
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(4);
    expect(root.querySelector(".cards-sec .pcard .obi")).not.toBeNull();
  });

  it("renders a loading skeleton state while the manifest is in flight", () => {
    mountCatalogView(root, {
      catalog: [] as CatalogEntry[],
      getStatus: () => "1",
      onOpen: () => {},
      loading: true,
      isDemo: false,
    });
    expect(root.querySelector(".lib-skeleton")).not.toBeNull();
    expect(root.querySelectorAll(".lib-skeleton .sk").length).toBeGreaterThan(0);
  });

  it("renders an empty-catalog state (with cause line) for an empty manifest", () => {
    mountCatalogView(root, {
      catalog: [] as CatalogEntry[],
      getStatus: () => "1",
      onOpen: () => {},
      isDemo: false,
    });
    expect(root.querySelector(".lib-empty-catalog")).not.toBeNull();
    expect(root.querySelector(".lib-empty-catalog")?.textContent).toMatch(/published|readings/i);
  });
});
