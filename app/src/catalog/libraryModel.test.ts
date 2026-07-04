import { describe, expect, it } from "vitest";
import {
  bandNum,
  defaultLibState,
  descriptiveTitle,
  formatLabel,
  groupCatalogByLesson,
  hanNum,
  libStateFromHash,
  libStateToHash,
  normalizeTopic,
  passRecord,
  rankRecords,
  sortRecords,
  toReadingRecord,
  type LibState,
  type ReadingRecord,
} from "./libraryModel.js";
import type { CatalogEntry } from "./types.js";

function rec(partial: Partial<ReadingRecord>): ReadingRecord {
  return {
    path: "p", zh: "", rom: "", romVi: "", topic: "city", band: "A1", tocfl: "TOCFL 1",
    bind: "", mins: 3, audio: false, cov: 90, covReal: false, newN: 3, status: "in",
    rec: true, added: 0, nw: [], ex: "", fmt: "短文", len: 100, book: null, lesson: null,
    descTitle: "", ...partial,
  };
}

describe("normalizeTopic", () => {
  it("maps aliases + unknowns to canonical keys", () => {
    expect(normalizeTopic("daily-life")).toBe("city");
    expect(normalizeTopic("social")).toBe("family");
    expect(normalizeTopic("food")).toBe("food");
    expect(normalizeTopic("totally-unknown")).toBe("city");
    expect(normalizeTopic(undefined)).toBe("city");
  });

  it("keyword-buckets free-text companion themes (EN + zh)", () => {
    expect(normalizeTopic("Food and Drink")).toBe("food");
    expect(normalizeTopic("Food Culture 飲食文化")).toBe("food");
    expect(normalizeTopic("Shopping")).toBe("food");
    expect(normalizeTopic("Family Members")).toBe("family");
    expect(normalizeTopic("人際關係 Inter-personal Relationships")).toBe("family");
    expect(normalizeTopic("Introducing Myself")).toBe("family");
    expect(normalizeTopic("交通 Transportation")).toBe("travel");
    expect(normalizeTopic("Traveling 旅行")).toBe("travel");
    expect(normalizeTopic("學習 Studying")).toBe("work");
    expect(normalizeTopic("教育 Education")).toBe("work");
    expect(normalizeTopic("天氣 The Weather")).toBe("nature");
    expect(normalizeTopic("台灣農業 Taiwan's Agricultural Industry")).toBe("nature");
    // no keyword hit → default bucket
    expect(normalizeTopic("Hobbies")).toBe("city");
  });
});

describe("rankRecords (Task A4: exact title > prefix > word match)", () => {
  const list = [
    rec({ path: "exact", zh: "海邊", rom: "seaside" }),
    rec({ path: "prefix", zh: "海邊的早晨", rom: "seaside morning" }),
    rec({ path: "word", zh: "去海邊玩", rom: "trip", nw: [["海邊", "hải biên", "hǎibiān"]] }),
    rec({ path: "miss", zh: "山中", rom: "mountains" }),
  ];
  it("orders exact-title first, then prefix, then word-hit; drops misses", () => {
    const ranked = rankRecords(list, "海邊");
    expect(ranked.map((r) => r.path)).toEqual(["exact", "prefix", "word"]);
  });
  it("matches romanization prefixes too", () => {
    const ranked = rankRecords(list, "seaside");
    expect(ranked[0]?.path).toBe("exact");
  });
  it("returns full sorted list when query is empty", () => {
    expect(rankRecords(list, "").length).toBe(list.length);
  });
});

describe("passRecord filters", () => {
  const s = (o: Partial<LibState> = {}): LibState => ({ ...defaultLibState(), ...o });
  it("audio-only drops silent readings", () => {
    expect(passRecord(rec({ audio: false }), s({ audio: true }))).toBe(false);
    expect(passRecord(rec({ audio: true }), s({ audio: true }))).toBe(true);
  });
  it("for-my-level drops stretch readings", () => {
    expect(passRecord(rec({ status: "stretch" }), s({ forLevel: true }))).toBe(false);
    expect(passRecord(rec({ status: "stretch" }), s({ forLevel: false }))).toBe(true);
  });
  it("topic filter is skipped for ignoreTopic (stable counts)", () => {
    const r = rec({ topic: "food" });
    expect(passRecord(r, s({ topic: "family" }))).toBe(false);
    expect(passRecord(r, s({ topic: "family" }), true)).toBe(true);
  });
});

describe("sortRecords", () => {
  it("best-fit puts in-range before stretch, then coverage desc", () => {
    const list = [
      rec({ path: "a", status: "stretch", cov: 99 }),
      rec({ path: "b", status: "in", cov: 80 }),
      rec({ path: "c", status: "in", cov: 95 }),
    ];
    expect(sortRecords(list, "fit").map((r) => r.path)).toEqual(["c", "b", "a"]);
  });
  it("shortest sorts by minutes asc", () => {
    const list = [rec({ path: "a", mins: 6 }), rec({ path: "b", mins: 2 })];
    expect(sortRecords(list, "short")[0]?.path).toBe("b");
  });
});

describe("toReadingRecord degrades gracefully", () => {
  const entry: CatalogEntry = {
    path: "r1", title: "夜市", titleRom: "night market", kind: "story", origin: "generated",
    band: "A2", tocfl: 2, binding: { textbook: "accc", book: 2, lesson: 4 },
    sentences: 5, minutes: 3, totalWords: 100, wordCounts: { 夜市: 2, 小吃: 1 },
    newWords: 4, hasAudio: true, dateAdded: "2026-03-01", topic: "culture",
  };
  it("maps binding to an ACCC label + normalizes topic + derives nw from wordCounts", () => {
    const r = toReadingRecord(entry, () => "1");
    expect(r.bind).toBe("ACCC B2 L4");
    expect(r.topic).toBe("family");
    expect(r.nw.length).toBe(2);
    expect(r.nw[0]?.[0]).toBe("夜市");
    expect(r.covReal).toBe(false);
  });
  it("uses real coverage once words are known", () => {
    const r = toReadingRecord(entry, (_l, w) => (w === "夜市" ? "known" : "1"));
    expect(r.covReal).toBe(true);
    expect(r.cov).toBeGreaterThan(0);
  });
  it("carries the spreadsheet fields (fmt, len, book/lesson, descTitle)", () => {
    const r = toReadingRecord(entry, () => "1");
    expect(r.fmt).toBe("短文"); // kind=story fallback (no "·" suffix in title)
    expect(r.len).toBe(100);
    expect(r.book).toBe(2);
    expect(r.lesson).toBe(4);
    expect(r.descTitle).toBe("夜市");
  });
});

describe("formatLabel / descriptiveTitle (companion title parsing)", () => {
  const e = (title: string, kind: CatalogEntry["kind"] = "story"): CatalogEntry => ({
    path: "p", title, kind, origin: "generated", band: "A1", tocfl: 1, sentences: 1,
    minutes: 1, totalWords: 10, wordCounts: {}, newWords: 0, hasAudio: false, dateAdded: "2026-01-01",
  });
  it("takes the format from the '·' suffix and strips the ordinal", () => {
    expect(formatLabel(e("What Are You Doing? · 對話一", "dialogue"))).toBe("對話");
    expect(formatLabel(e("My Family · 自述二"))).toBe("自述");
    expect(formatLabel(e("… · 廣播三", "explainer"))).toBe("廣播");
  });
  it("falls back to the kind when no suffix is present", () => {
    expect(formatLabel(e("夜市", "story"))).toBe("短文");
    expect(formatLabel(e("聊天", "dialogue"))).toBe("對話");
  });
  it("descriptiveTitle drops the format suffix", () => {
    expect(descriptiveTitle(e("What Are You Doing? · 對話一"))).toBe("What Are You Doing?");
    expect(descriptiveTitle(e("夜市"))).toBe("夜市");
  });
});

describe("bandNum + hanNum", () => {
  it("orders A1<A2<B1", () => {
    expect(bandNum("A1")).toBeLessThan(bandNum("A2"));
    expect(bandNum("A2")).toBeLessThan(bandNum("B1"));
  });
  it("renders small Chinese numerals", () => {
    expect(hanNum(1)).toBe("一");
    expect(hanNum(7)).toBe("七");
    expect(hanNum(10)).toBe("十");
    expect(hanNum(12)).toBe("十二");
    expect(hanNum(20)).toBe("二十");
    expect(hanNum(23)).toBe("二十三");
  });
});

describe("groupCatalogByLesson", () => {
  it("clusters bound readings by 冊/課 in shelf order, unbound bands last", () => {
    const list = [
      rec({ path: "b2l7", book: 2, lesson: 7, band: "A2" }),
      rec({ path: "b1l3-b", book: 1, lesson: 3, band: "A1" }),
      rec({ path: "b1l3-a", book: 1, lesson: 3, band: "A1" }),
      rec({ path: "free", book: null, lesson: null, band: "A1" }),
    ];
    const groups = groupCatalogByLesson(list);
    expect(groups.map((g) => g.key)).toEqual(["b1l3", "b2l7", "free-A1"]);
    // items sorted by path within the lesson
    expect(groups[0]!.items.map((r) => r.path)).toEqual(["b1l3-a", "b1l3-b"]);
    expect(groups[2]!.free).toBe(true);
  });
});

describe("library state ↔ URL hash round-trip (Task A10)", () => {
  it("is lossless for a fully-specified state", () => {
    const s: LibState = { topic: "food", forLevel: false, audio: true, sort: "new", view: "table", q: "海邊" };
    expect(libStateFromHash(libStateToHash(s))).toEqual(s);
  });
  it("defaults round-trip to an empty hash", () => {
    expect(libStateToHash(defaultLibState())).toBe("");
    expect(libStateFromHash("")).toEqual(defaultLibState());
  });
  it("preserves coexisting facet params in the base hash", () => {
    const h = libStateToHash({ ...defaultLibState(), topic: "work" }, "#band=A2&book=4");
    expect(h).toContain("band=A2");
    expect(h).toContain("book=4");
    expect(h).toContain("lt=work");
  });
});
