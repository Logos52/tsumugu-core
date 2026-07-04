// @vitest-environment happy-dom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  bookParts,
  partRange,
  readingId,
  fmtClass,
  mountLibraryPage,
  SHELF_LEVELS,
  type TitlesMap,
} from "./libraryPage.js";
import type { CatalogEntry } from "../catalog/types.js";

function entry(book: number, lesson: number, id: string, kind: CatalogEntry["kind"] = "story"): CatalogEntry {
  return {
    path: `readings/zh-Hant/${id}.prepared.json`,
    title: `B${book}L${lesson} · 對話一`, kind, origin: "generated", band: book === 1 ? "A1" : book === 2 ? "A2" : "B1",
    tocfl: 1, binding: { textbook: "accc", book, lesson }, sentences: 3, minutes: 2, totalWords: 40,
    wordCounts: { 學: 1 }, newWords: 2, hasAudio: false, dateAdded: "2026-01-01", topic: "work",
  };
}

// Books 1 (lessons 1, 2, 6) and 3 (lesson 1) — parts + level fan-out both exercised.
const CATALOG: CatalogEntry[] = [
  entry(1, 1, "b1l01-r1", "dialogue"), entry(1, 1, "b1l01-r2"), entry(1, 1, "b1l01-r3"),
  entry(1, 2, "b1l02-r1", "dialogue"),
  entry(1, 6, "b1l06-r1"),
  entry(3, 1, "b3l01-r1", "dialogue"),
];

const TITLES: TitlesMap = {
  "b1l01-r1": { zh: "接機的第一杯烏龍茶", en: "The First Cup of Oolong", vi: "Tách trà Ô Long đầu tiên", format: "對話" },
  "b1l01-r2": { zh: "一個日本人愛上烏龍茶", en: "A Japanese Student Falls for Oolong", vi: "Du học sinh Nhật yêu trà Ô Long", format: "自述" },
  "b1l01-r3": { zh: "周先生第一次來臺灣", en: "Mr. Zhou's First Day in Taiwan", vi: "Ngày đầu tiên của ông Chu ở Đài Loan", format: "短文" },
  "b1l02-r1": { zh: "照片牆上的人是誰", en: "Who's in the Photo?", vi: "Người trong bức ảnh là ai?", format: "對話" },
  "b1l06-r1": { zh: "前面海後面山", en: "Sea in Front, Mountain Behind", vi: "Trước biển, sau núi", format: "對話" },
  "b3l01-r1": { zh: "開學週的選課煩惱", en: "Course Selection Chaos", vi: "Rối ren chọn môn tuần đầu học", format: "對話" },
};

describe("libraryPage pure helpers", () => {
  it("splits volumes into three parts by length (15→5·5·5, 12→4·4·4, 10→4·3·3)", () => {
    expect(bookParts(15)).toEqual([5, 10, 15]);
    expect(bookParts(12)).toEqual([4, 8, 12]);
    expect(bookParts(10)).toEqual([4, 7, 10]);
    expect(partRange(bookParts(15), 0)).toEqual([1, 5]);
    expect(partRange(bookParts(15), 2)).toEqual([11, 15]);
    expect(partRange(bookParts(10), 1)).toEqual([5, 7]);
  });

  it("derives the titles.json key from a vault path", () => {
    expect(readingId("readings/zh-Hant/b1l02-r2.prepared.json")).toBe("b1l02-r2");
    expect(readingId("b2l07-2.json")).toBe("b2l07-2");
  });

  it("maps zh and en format strings to signifier classes", () => {
    expect(fmtClass("對話")).toBe("dlg");
    expect(fmtClass("story")).toBe("sty");
    expect(fmtClass("日記")).toBe("dia");
    expect(fmtClass(undefined)).toBe("sty");
  });

  it("levels overlap the volumes (B1 fans out to books 3–5)", () => {
    expect(SHELF_LEVELS.find((l) => l.code === "B1")?.books).toEqual([3, 4, 5]);
  });
});

describe("mountLibraryPage", () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = document.createElement("div");
    document.body.append(root);
    document.documentElement.removeAttribute("data-rail");
  });
  afterEach(() => {
    root.remove();
  });

  const mount = (onOpen = (_: string): void => {}) =>
    mountLibraryPage(root, { catalog: CATALOG, titles: TITLES, onOpen });

  it("renders the two shelf tabs, five volume spines, and three part columns", () => {
    mount();
    const tabs = root.querySelectorAll(".lp-tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.classList.contains("on")).toBe(true);
    expect(root.querySelectorAll(".lp-shelf .lp-cover")).toHaveLength(5);
    expect(root.querySelector(".lp-cover.on .vt")?.textContent).toBe("第一冊");
    expect(root.querySelectorAll(".lp-cols .lp-colh")).toHaveLength(3);
    expect(root.querySelector(".lp-colh .pn")?.textContent).toBe("第一部分");
  });

  it("leads lesson rows and table rows with the reader-language title", () => {
    mount();
    const firstLesson = root.querySelector(".lp-les .ltitle");
    expect(firstLesson?.textContent).toBe("The First Cup of Oolong");
    const lead = root.querySelector(".lp-cat .lp-title .lead");
    expect(lead?.textContent).toBe("The First Cup of Oolong");
    expect(root.querySelector(".lp-cat .lp-zh")?.textContent).toBe("接機的第一杯烏龍茶");
  });

  it("flips titles to Vietnamese on the VI rail", () => {
    document.documentElement.setAttribute("data-rail", "vi");
    const page = mount();
    page.render();
    expect(root.querySelector(".lp-les .ltitle")?.textContent).toBe("Tách trà Ô Long đầu tiên");
  });

  it("scopes the table: lesson click narrows to that lesson, header click to the part, re-click widens", () => {
    mount();
    // whole book: 5 readings of book 1
    expect(root.querySelectorAll(".lp-cat tbody tr[data-path]")).toHaveLength(5);
    // click 課1 → 3 readings
    (root.querySelector(".lp-les") as HTMLElement).click();
    expect(root.querySelectorAll(".lp-cat tbody tr[data-path]")).toHaveLength(3);
    expect(root.querySelector(".lp-les.on")).not.toBeNull();
    // re-click → widens to its column (part 1 = lessons 1,2 → 4 readings)
    (root.querySelector(".lp-les") as HTMLElement).click();
    expect(root.querySelectorAll(".lp-cat tbody tr[data-path]")).toHaveLength(4);
    // part-2 header (L6–10, has lesson 6) → 1 reading
    (root.querySelectorAll(".lp-colh")[1] as HTMLElement).click();
    expect(root.querySelectorAll(".lp-cat tbody tr[data-path]")).toHaveLength(1);
    // header re-click → whole book again
    (root.querySelectorAll(".lp-colh")[1] as HTMLElement).click();
    expect(root.querySelectorAll(".lp-cat tbody tr[data-path]")).toHaveLength(5);
  });

  it("suppresses repeated 課 labels in lesson order (ledger convention)", () => {
    mount();
    const cells = Array.from(root.querySelectorAll(".lp-cat .lp-lesson")).map((c) => c.textContent);
    expect(cells[0]).toBe("課1");
    expect(cells[1]).toBe("");
    expect(cells[2]).toBe("");
    expect(cells[3]).toBe("課2");
  });

  it("filters the table in place across EN, VI, and zh titles", () => {
    mount();
    const input = root.querySelector<HTMLInputElement>(".lp-filter input")!;
    input.value = "oolong";
    input.dispatchEvent(new Event("input"));
    expect(root.querySelectorAll(".lp-cat tbody tr[data-path]")).toHaveLength(2);
    input.value = "照片";
    input.dispatchEvent(new Event("input"));
    expect(root.querySelectorAll(".lp-cat tbody tr[data-path]")).toHaveLength(1);
    input.value = "zzz-no-match";
    input.dispatchEvent(new Event("input"));
    expect(root.querySelector(".lp-empty")?.textContent).toBe("No matches.");
  });

  it("switches to the 級別架 shelf; B1 fans out to volume columns with 冊-disambiguated 課 labels", () => {
    mount();
    (root.querySelectorAll(".lp-tab")[1] as HTMLElement).click();
    const spines = root.querySelectorAll(".lp-shelf .lp-cover");
    expect(spines).toHaveLength(6); // A1 A2 B1 B2 C1 C2
    expect(spines[0]!.textContent).toContain("A1");
    // select B1 (index 2): columns are 第三/四/五冊
    (spines[2] as HTMLElement).click();
    const heads = Array.from(root.querySelectorAll(".lp-colh .pn")).map((h) => h.textContent);
    expect(heads).toEqual(["第三冊", "第四冊", "第五冊"]);
    // its one published reading shows a 冊-prefixed lesson label
    expect(root.querySelector(".lp-cat .lp-lesson")?.textContent).toBe("三·課1");
    // empty volumes show the coming-soon note
    expect(root.querySelectorAll(".lp-soon").length).toBeGreaterThanOrEqual(1);
  });

  it("marks unpublished volumes dim and shows not-yet-published for their table", () => {
    mount();
    const spine5 = root.querySelectorAll(".lp-shelf .lp-cover")[4] as HTMLElement;
    expect(spine5.classList.contains("dim")).toBe(true);
    spine5.click();
    expect(root.querySelector(".lp-empty")?.textContent).toBe("Not yet published.");
  });

  it("opens a reading via onOpen when a table row is clicked", () => {
    const onOpen = vi.fn();
    mount(onOpen);
    (root.querySelector(".lp-cat tbody tr[data-path]") as HTMLElement).click();
    expect(onOpen).toHaveBeenCalledWith("readings/zh-Hant/b1l01-r1.prepared.json");
  });

  it("sorts by title and format on demand", () => {
    mount();
    (root.querySelectorAll(".lp-sortbar .sb")[2] as HTMLElement).click(); // Title
    const leads = Array.from(root.querySelectorAll(".lp-title .lead")).map((l) => l.textContent);
    expect(leads).toEqual([...leads].sort((a, b) => a!.localeCompare(b!)));
  });

  it("shows the catalog-empty note when nothing is published", () => {
    const page = mountLibraryPage(root, { catalog: [], onOpen: () => {} });
    expect(root.querySelector(".lib-empty")).not.toBeNull();
    page.destroy();
  });
});
