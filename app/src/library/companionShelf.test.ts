// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from "vitest";
import { buildCompanionSpine, grammarHref, mountCompanionShelf, type CompanionLesson } from "./companionShelf.js";
import type { CatalogEntry } from "../catalog/types.js";

function entry(book: number, lesson: number, path: string): CatalogEntry {
  return {
    path, title: `B${book}L${lesson}`, kind: "story", origin: "generated", band: "A1", tocfl: 1,
    binding: { textbook: "accc", book, lesson }, sentences: 3, minutes: 2, totalWords: 40,
    wordCounts: { 學: 1 }, newWords: 2, hasAudio: false, dateAdded: "2026-01-01", topic: "work",
  };
}

const CATALOG: CatalogEntry[] = [
  entry(1, 2, "b1l2-a"), entry(1, 2, "b1l2-b"), entry(1, 2, "b1l2-c"),
  entry(1, 3, "b1l3-a"),
  entry(2, 1, "b2l1-a"),
];

const LESSONS: CompanionLesson[] = [
  { unit: "B1L02", book: 1, lesson: 2, title: "早市", theme: "Markets", grammar: [{ name: "把 construction", edSlug: "ba" }, { name: "了 aspect" }] },
];

describe("buildCompanionSpine", () => {
  it("groups by book → lesson and counts articles + union coverage", () => {
    const spine = buildCompanionSpine(CATALOG, LESSONS);
    expect(spine.map((b) => b.book)).toEqual([1, 2]);
    const b1l2 = spine[0]!.lessons.find((l) => l.lesson === 2)!;
    expect(b1l2.articles).toBe(3);
    expect(b1l2.unionCoverage).toBe(100);
    expect(b1l2.title).toBe("早市");
    expect(b1l2.grammar).toHaveLength(2);
  });

  it("degrades to bindings when lesson metadata is absent", () => {
    const spine = buildCompanionSpine(CATALOG, []);
    const b2l1 = spine[1]!.lessons[0]!;
    expect(b2l1.unit).toBe("B2L01");
    expect(b2l1.grammar).toEqual([]);
  });
});

describe("grammarHref", () => {
  it("links to the tsumugu-ed g/ page when a slug exists, null otherwise", () => {
    expect(grammarHref({ name: "把", edSlug: "ba" }, "https://tsumugu.cc")).toBe("https://tsumugu.cc/g/ba");
    expect(grammarHref({ name: "了" }, "https://tsumugu.cc")).toBeNull();
  });
});

describe("mountCompanionShelf", () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = document.createElement("div");
    document.body.append(root);
    document.documentElement.removeAttribute("data-rail");
  });

  it("renders the 課本架 shelf with B1–B5 spines (open = first book) + lesson set-cards", () => {
    mountCompanionShelf(root, { catalog: CATALOG, lessons: LESSONS, onOpen: () => {} });
    expect(root.querySelector(".comp-shelf")).not.toBeNull();
    expect(root.querySelectorAll(".shelf .spines .spine").length).toBe(5);
    const open = root.querySelector(".spine.open")!;
    expect(open.textContent).toContain("B1");
    const cards = root.querySelectorAll(".lessons .lcard");
    expect(cards.length).toBe(2); // B1L2, B1L3
    const row = cards[0]!.querySelector(".lrow")!;
    expect(row.querySelector(".fmtg")?.textContent).toBeTruthy();
    expect(row.textContent).toContain("字");
    expect(cards[0]!.querySelector(".obi")?.textContent).toContain("詞彙與語法 100%");
  });

  it("switches the open book (and its lessons) when another spine is clicked", () => {
    mountCompanionShelf(root, { catalog: CATALOG, lessons: LESSONS, onOpen: () => {} });
    const b2 = root.querySelector<HTMLElement>('.spine[data-book="2"]')!;
    b2.click();
    expect(root.querySelector(".spine.open")?.textContent).toContain("B2");
    expect(root.querySelectorAll(".lessons .lcard").length).toBe(1); // B2L1 only
  });

  it("shows a not-yet-published note for an empty book spine", () => {
    mountCompanionShelf(root, { catalog: CATALOG, lessons: LESSONS, onOpen: () => {} });
    root.querySelector<HTMLElement>('.spine[data-book="4"]')?.click();
    expect(root.querySelector(".lessons .lib-empty")).not.toBeNull();
  });

  it("navigates via onOpen when a lesson article row is clicked", () => {
    let opened = "";
    mountCompanionShelf(root, { catalog: CATALOG, lessons: LESSONS, onOpen: (p) => (opened = p) });
    root.querySelector<HTMLElement>(".lessons .lcard .lrow")?.click();
    expect(opened).toBe("b1l2-a");
  });
});
