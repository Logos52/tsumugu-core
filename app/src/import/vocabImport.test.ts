import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  VocabImportError,
  importVocabJson,
  importVocabList,
  type VocabEntryView,
  type VocabImportStore,
  type VocabStatus,
} from "./vocabImport.js";
const examples = join(dirname(fileURLToPath(import.meta.url)), "../../../spec/examples");
const clock = { now: () => new Date("2026-07-01T00:00:00.000Z") };
function readExample(name: string): string {
  return readFileSync(join(examples, name), "utf8");
}
function memory(seed: VocabEntryView[] = []): VocabImportStore & { rows(): VocabEntryView[] } {
  const map = new Map<string, VocabEntryView & { notes?: string }>();
  for (const entry of seed) map.set(`${entry.lang}\u0000${entry.word}`, { ...entry });
  return {
    all: () => [...map.values()],
    rows: () => [...map.values()],
    get: (lang, word) => map.get(`${lang}\u0000${word}`),
    setStatus: (lang, word, status: VocabStatus, atClock, prov) => {
      const key = `${lang}\u0000${word}`;
      const prev = map.get(key) ?? { lang, word, status };
      prev.lang = lang;
      prev.word = word;
      prev.status = status;
      prev.statusUpdatedAt = prov?.at ?? (atClock ?? clock).now().toISOString();
      map.set(key, prev);
    },
  };
}

function statusOf(store: ReturnType<typeof memory>, word: string, lang = "zh-Hant"): string | undefined {
  return store.get(lang, word)?.status;
}

describe("spec/examples", () => {
  it("imports known-vocab.json aliases onto an empty store", () => {
    const store = memory();
    const report = importVocabJson(readExample("known-vocab.json"), store, { clock });
    expect(report.applied).toBe(3);
    expect(statusOf(store, "朋友")).toBe("known");
    expect(store.get("zh-Hant", "朋友")?.statusUpdatedAt).toBe("2026-06-24T10:00:00.000Z");
    expect(statusOf(store, "學習")).toBe("3");
    expect(store.get("zh-Hant", "學習")?.statusUpdatedAt).toBe("2026-07-01T00:00:00.000Z");
    expect(statusOf(store, "今天")).toBe("1");
    expect(store.get("zh-Hant", "今天")?.statusUpdatedAt).toBe("2026-06-20T08:00:00.000Z");
  });

  it("rejects unknown-status.json and writes nothing", () => {
    const store = memory([{ lang: "zh-Hant", word: "水", status: "known", statusUpdatedAt: "2026-01-01T00:00:00.000Z" }]);
    expect(() => importVocabJson(readExample("unknown-status.json"), store, { clock })).toThrow(VocabImportError);
    try {
      importVocabJson(readExample("unknown-status.json"), store, { clock });
    } catch (error) {
      expect(error).toMatchObject({ word: "山", statusText: '"new"' });
      expect((error as Error).message).toContain("山");
      expect((error as Error).message).toContain("new");
    }
    expect(store.rows()).toEqual([
      { lang: "zh-Hant", word: "水", status: "known", statusUpdatedAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("rejects bad-json.txt and writes nothing", () => {
    const store = memory([{ lang: "zh-Hant", word: "水", status: "2", statusUpdatedAt: "2026-01-01T00:00:00.000Z" }]);
    expect(() => importVocabJson(readExample("bad-json.txt"), store)).toThrow(SyntaxError);
    expect(statusOf(store, "水")).toBe("2");
    expect(store.rows()).toHaveLength(1);
  });

  it("imports learning-list.txt as status 1", () => {
    const store = memory();
    importVocabList(readExample("learning-list.txt"), store, { clock });
    expect(store.rows().map((entry) => entry.word)).toEqual(["朋友", "學習", "今天", "明天", "你好", "謝謝", "看見", "聽見"]);
    expect(store.rows().every((entry) => entry.status === "1" && entry.lang === "zh-Hant")).toBe(true);
  });

  it("does not downgrade a pasted word at 4 or known", () => {
    const store = memory([
      { lang: "zh-Hant", word: "朋友", status: "known", statusUpdatedAt: "2026-01-01T00:00:00.000Z" },
      { lang: "zh-Hant", word: "學習", status: "4", statusUpdatedAt: "2026-01-02T00:00:00.000Z" },
      { lang: "zh-Hant", word: "今天", status: "ignored", statusUpdatedAt: "2026-01-03T00:00:00.000Z" },
      { lang: "zh-Hant", word: "明天", status: "2", statusUpdatedAt: "2026-01-04T00:00:00.000Z" },
    ]);
    importVocabList(readExample("learning-list.txt"), store, { clock });
    expect(statusOf(store, "朋友")).toBe("known");
    expect(store.get("zh-Hant", "朋友")?.statusUpdatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(statusOf(store, "學習")).toBe("4");
    expect(store.get("zh-Hant", "學習")?.statusUpdatedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(statusOf(store, "今天")).toBe("1");
    expect(statusOf(store, "明天")).toBe("1");
    expect(statusOf(store, "你好")).toBe("1");
  });
});

describe("vocab import rules", () => {
  it("keeps the later clock, and the later line on a tie", () => {
    const store = memory();
    importVocabJson(
      JSON.stringify({
        schema: "tsumugu/word-store@2",
        entries: [
          { word: "朋友", status: "1", updatedAt: "2026-06-24T09:00:00.000Z" },
          { word: "朋友", status: "known", updatedAt: "2026-06-24T10:00:00.000Z" },
          { word: "學習", status: "2" },
          { word: "學習", status: "3" },
          { word: "今天", status: "l2", updatedAt: "2026-06-01T00:00:00.000Z" },
          { word: "今天", status: "learning-4", updatedAt: "2026-06-01T00:00:00.000Z" },
        ],
      }),
      store,
      { clock },
    );
    expect(statusOf(store, "朋友")).toBe("known");
    expect(statusOf(store, "學習")).toBe("3");
    expect(statusOf(store, "今天")).toBe("4");
  });

  it("reads a schema 3 user document and leaves stored schema 2 alone", () => {
    const store = memory();
    importVocabJson(
      JSON.stringify({
        schema: 3,
        profile: { email: "skip@example.com" },
        store: { schema: "tsumugu/word-store@2", entries: [{ word: "水", status: "ignored" }] },
      }),
      store,
      { clock },
    );
    expect(statusOf(store, "水")).toBe("ignored");
    expect(() =>
      importVocabJson(
        JSON.stringify({ schema: 2, store: { schema: "tsumugu/word-store@2", entries: [{ word: "山", status: "1" }] } }),
        store,
      ),
    ).toThrow(/schema 2 is not 3/);
    expect(statusOf(store, "山")).toBeUndefined();
    expect(statusOf(store, "水")).toBe("ignored");
  });

  it("defaults a missing lang to the document lang, then the store lang", () => {
    const declared = memory();
    importVocabJson(
      JSON.stringify({
        schema: "tsumugu/word-store@2",
        lang: "zh-Hans",
        entries: [{ word: "朋友", status: "known" }, { word: "山", status: "1", lang: "zh-Hant" }],
      }),
      declared,
      { clock },
    );
    expect(declared.get("zh-Hans", "朋友")?.status).toBe("known");
    expect(declared.get("zh-Hant", "山")?.status).toBe("1");

    const fromStore = memory([{ lang: "zh-Hans", word: "水", status: "2" }]);
    importVocabList("學習", fromStore, { clock });
    expect(fromStore.get("zh-Hans", "學習")?.status).toBe("1");
    expect(fromStore.get("zh-Hans", "水")?.status).toBe("2");
  });

  it("does not let an older import replace a newer stored status", () => {
    const store = memory([
      { lang: "zh-Hant", word: "朋友", status: "known", statusUpdatedAt: "2026-08-01T00:00:00.000Z", notes: "keep" } as VocabEntryView & { notes?: string },
    ]);
    importVocabJson(
      JSON.stringify({
        schema: "tsumugu/word-store@2",
        entries: [{ word: "朋友", status: "1", updatedAt: "2026-06-01T00:00:00.000Z" }],
      }),
      store,
    );
    expect(statusOf(store, "朋友")).toBe("known");
    expect(store.get("zh-Hant", "朋友")?.statusUpdatedAt).toBe("2026-08-01T00:00:00.000Z");
    importVocabJson(
      JSON.stringify({
        schema: "tsumugu/word-store@2",
        entries: [{ word: "朋友", status: "2", updatedAt: "2026-09-01T00:00:00.000Z" }],
      }),
      store,
    );
    expect(statusOf(store, "朋友")).toBe("2");
    expect((store.get("zh-Hant", "朋友") as { notes?: string } | undefined)?.notes).toBe("keep");
  });

  it("rejects a numeric status and a tab-joined paste stays one word", () => {
    const store = memory();
    expect(() =>
      importVocabJson(JSON.stringify({ schema: "tsumugu/word-store@2", entries: [{ word: "山", status: 1 }] }), store),
    ).toThrow(/unknown status for 山: 1/);
    expect(store.rows()).toHaveLength(0);
    importVocabList("看見\t聽見", store, { clock });
    expect(store.rows().map((entry) => entry.word)).toEqual(["看見\t聽見"]);
  });
});
