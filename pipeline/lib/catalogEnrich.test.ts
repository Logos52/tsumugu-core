import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { enrichCatalogEntry } from "./catalogEnrich.js";
import { PREPARED_CONTENT_SCHEMA_V2 } from "@tsumugu/engine";

const FIXTURE_DIR = join(import.meta.dirname, "../test/fixtures/publisher");

const VALID_PREPARED = {
  schema: PREPARED_CONTENT_SCHEMA_V2,
  lang: "zh-Hant",
  title: "測試閱讀",
  tokens: [
    { text: "今天", isWord: true },
    { text: "天氣", isWord: true },
    { text: "很", isWord: true },
    { text: "好", isWord: true },
    { text: "。", isWord: false },
  ],
  glossary: {
    今天: { term: "今天", gloss: "today" },
    天氣: { term: "天氣", gloss: "weather" },
    很: { term: "很", gloss: "very" },
    好: { term: "好", gloss: "good" },
  },
  core: {
    band: "A2",
    tocfl: 2,
    kind: "story",
    newWords: 3,
    binding: { textbook: "accc", book: 4, lesson: 3 },
  },
};

describe("catalogEnrich + publisher", () => {
  beforeAll(async () => {
    await mkdir(FIXTURE_DIR, { recursive: true });
    await writeFile(
      join(FIXTURE_DIR, "valid.prepared.json"),
      JSON.stringify(VALID_PREPARED, null, 2),
      "utf8",
    );
    const missingCore = { ...VALID_PREPARED, core: undefined };
    await writeFile(
      join(FIXTURE_DIR, "missing-core.prepared.json"),
      JSON.stringify(missingCore, null, 2),
      "utf8",
    );
  });

  afterAll(async () => {
    await rm(FIXTURE_DIR, { recursive: true, force: true });
  });

  it("builds a generated CatalogEntry from core metadata", async () => {
    const entry = await enrichCatalogEntry(
      join(FIXTURE_DIR, "valid.prepared.json"),
      "readings/zh-Hant/valid.prepared.json",
    );
    expect(entry.origin).toBe("generated");
    expect(entry.kind).toBe("story");
    expect(entry.band).toBe("A2");
    expect(entry.binding).toEqual({ textbook: "accc", book: 4, lesson: 3 });
    expect(entry.hasAudio).toBe(false);
    expect(entry.totalWords).toBe(4);
    expect(entry.wordCounts).toEqual({ 今天: 1, 天氣: 1, 很: 1, 好: 1 });
    expect(entry).not.toHaveProperty("source");
  });

  it("fails loud when doc.core is missing", async () => {
    await expect(
      enrichCatalogEntry(
        join(FIXTURE_DIR, "missing-core.prepared.json"),
        "readings/zh-Hant/missing-core.prepared.json",
      ),
    ).rejects.toThrow(/Missing doc.core metadata/);
  });

  it("emits deterministic sorted output", async () => {
    const entry = await enrichCatalogEntry(
      join(FIXTURE_DIR, "valid.prepared.json"),
      "readings/zh-Hant/valid.prepared.json",
    );
    const manifestPath = join(FIXTURE_DIR, "__readings.json");
    const body = JSON.stringify([entry], null, 2) + "\n";
    await writeFile(manifestPath, body, "utf8");

    const again = await readFile(manifestPath, "utf8");
    expect(again).toBe(body);
    const parsed = JSON.parse(again) as unknown[];
    expect(parsed[0]).toMatchObject({ origin: "generated", kind: "story" });
  });
});