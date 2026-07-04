import { describe, expect, it } from "vitest";
import { WordStore, buildApkg } from "@tsumugu/engine";
import { buildKnownDeck } from "./ankiExport.js";

describe("ankiExport", () => {
  it("buildKnownDeck includes known and learning words with context", () => {
    const store = new WordStore();
    store.upsert({
      lang: "zh-Hant",
      word: "望",
      status: "known",
      custom: {
        term: "望",
        gloss: "to gaze",
        reading: "wàng",
        examples: [{ text: "他望向那座高山。", translation: "He gazed toward that tall mountain." }],
      },
    });
    store.upsert({ lang: "zh-Hant", word: "山", status: "2" });

    const deck = buildKnownDeck(store, "zh-Hant");
    expect(deck.notes).toHaveLength(2);
    expect(deck.notes[0]?.front).toContain("望");
    expect(deck.notes[0]?.front).toContain("他望向那座高山");
    expect(deck.notes[0]?.back).toContain("to gaze");
  });

  it("buildApkg returns non-empty bytes for a known deck", async () => {
    const store = new WordStore();
    store.upsert({ lang: "zh-Hant", word: "你好", status: "known" });

    const deck = buildKnownDeck(store, "zh-Hant");
    const bytes = await buildApkg(deck);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
  });
});