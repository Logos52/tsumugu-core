import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { parsePreparedContent, PREPARED_CONTENT_SCHEMA_V2 } from "@tsumugu/engine";

import type { CatalogEntry } from "../../app/src/catalog/types.js";
import { enrichCatalogEntry } from "../../pipeline/lib/catalogEnrich.js";
import { resolveLessonTarget, parseCsvRow } from "../accc/lib/lesson-target.js";
import { populateDualRail } from "../gen/lib/dualRail.js";

const REPO_ROOT = join(__dirname, "..", "..");
const VOCAB_CSV = join(REPO_ROOT, "private", "dangdai-vocab", "dangdai.csv");
const DRAFTS_DIR = join(REPO_ROOT, "mockups", "drafts");

function loadVocab(): {
  lookup: Map<string, { pinyin?: string; meaning?: string }>;
  names: Set<string>;
} {
  const raw = readFileSync(VOCAB_CSV, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const lookup = new Map<string, { pinyin?: string; meaning?: string }>();
  const names = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvRow(lines[i]!);
    if (f.length < 2) continue;
    const trad = (f[1] ?? "").trim();
    if (!trad) continue;
    if (!lookup.has(trad)) {
      lookup.set(trad, {
        pinyin: (f[3] ?? "").trim() || undefined,
        meaning: (f[5] ?? "").trim() || undefined,
      });
    }
    if (/Character Name/i.test((f[8] ?? "").trim())) names.add(trad);
  }
  return { lookup, names };
}

describe("convert-drafts", () => {
  it("converts one real lesson reading into schema-valid prepared@2 with an app-shaped core", async () => {
    const draft = JSON.parse(readFileSync(join(DRAFTS_DIR, "B1L01.json"), "utf8")) as {
      readings: { id: string; format: string; text: string }[];
    };
    const r = draft.readings[0]!;
    const { lookup, names } = loadVocab();
    const target = resolveLessonTarget("B1L01");
    const filtered = { ...target, newVocab: target.newVocab.filter((w) => !names.has(w)) };

    const { prepared } = await populateDualRail({
      draft: r.text,
      lessonTarget: filtered,
      band: "A1",
      kind: "dialogue",
      title: `Welcome to Taiwan! · ${r.format}一`,
      vocabLookup: lookup,
    });

    const appPrepared = {
      ...prepared,
      core: {
        band: "A1" as const,
        tocfl: 1 as const,
        kind: "dialogue" as const,
        newWords: 1,
        binding: { textbook: "accc" as const, book: 1, lesson: 1 },
        topic: "Introducing Myself",
      },
    };

    // parsePreparedContent round-trip (the reader's validation gate).
    const parsed = parsePreparedContent(JSON.stringify(appPrepared));
    expect(parsed.schema).toBe(PREPARED_CONTENT_SCHEMA_V2);
    expect(parsed.lang).toBe("zh-Hant");
    expect(parsed.tokens.length).toBeGreaterThan(0);

    // Round-trip through the on-disk enrichment path → CatalogEntry with all fields.
    const outPath = join(tmpdir(), `companion-test-${Date.now()}.prepared.json`);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(outPath, JSON.stringify(appPrepared, null, 2), "utf8");
    const entry: CatalogEntry = await enrichCatalogEntry(
      outPath,
      "readings/zh-Hant/b1l01-r1.prepared.json",
    );

    // Every required CatalogEntry field is present + well-typed.
    expect(entry.path).toBe("readings/zh-Hant/b1l01-r1.prepared.json");
    expect(entry.kind).toBe("dialogue");
    expect(entry.origin).toBe("generated");
    expect(entry.band).toBe("A1");
    expect(entry.tocfl).toBe(1);
    expect(entry.binding).toEqual({ textbook: "accc", book: 1, lesson: 1 });
    expect(entry.sentences).toBeGreaterThanOrEqual(1);
    expect(entry.minutes).toBeGreaterThanOrEqual(1);
    expect(entry.totalWords).toBeGreaterThan(0);
    expect(Object.keys(entry.wordCounts).length).toBeGreaterThan(0);
    expect(typeof entry.newWords).toBe("number");
    expect(entry.hasAudio).toBe(false);
    expect(typeof entry.dateAdded).toBe("string");
    expect(entry.topic).toBe("Introducing Myself");
  });
});
