import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { WordStore, buildApkg } from "@tsumugu/engine";
import { buildKnownDeck } from "./ankiExport.js";

const apkgTzChild = `
import { WordStore, buildApkg } from "@tsumugu/engine";
import { buildKnownDeck } from "./app/src/account/ankiExport.js";

const store = new WordStore();
store.upsert({ lang: "zh-Hant", word: "你好", status: "known" });
const bytes = await buildApkg(buildKnownDeck(store, "zh-Hant"));
if (!(bytes instanceof Uint8Array) || bytes.byteLength <= 100) {
  throw new Error("expected non-empty apkg bytes");
}
`;

const apkgWestOfUtcBug = [
  "buildApkg under America/New_York.",
  "Bug: buildApkg dates Anki zip entries 1980-01-01 UTC.",
  "fflate reads that instant in local time, so west of UTC the year is 1979",
  'and zip throws "date not in range 1980-2099".',
  "Fix: use a zip date later than 1980-01-01, for example 1980-01-02.",
].join(" ");

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

  it.fails(apkgWestOfUtcBug, () => {
    const env = { ...process.env, TZ: "America/New_York" };
    Reflect.deleteProperty(env, "NODE_OPTIONS");
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "--eval", apkgTzChild],
      { cwd: process.cwd(), env, encoding: "utf8" },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(result.status, output).toBe(0);
  });
});
