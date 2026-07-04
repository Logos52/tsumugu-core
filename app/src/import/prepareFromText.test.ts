import { describe, expect, it } from "vitest";
import {
  parsePreparedContent,
  PREPARED_CONTENT_SCHEMA_V2,
  type LanguagePack,
  type DictEntry,
} from "@tsumugu/engine";
import { prepareFromText } from "./prepareFromText.js";
import { createZhHantBrowserPack } from "../packs/zhHant.js";

function stubPack(dict: Record<string, DictEntry | undefined> = {}): LanguagePack {
  const base = createZhHantBrowserPack();
  return {
    ...base,
    dictionaryProvider: (word) => dict[word],
  };
}

describe("prepareFromText", () => {
  it("returns schema-conformant PreparedContent", async () => {
    const pack = stubPack({ 今天: { term: "今天", gloss: "today" } });
    const out = await prepareFromText("今天天氣很好。", { pack });
    expect(out.schema).toBe(PREPARED_CONTENT_SCHEMA_V2);
    expect(out.source).toBe("imported");
    expect(out.lang).toBe("zh-Hant");
    expect(() => parsePreparedContent(JSON.stringify(out))).not.toThrow();
  });

  it("segments in document order with punctuation as non-words", async () => {
    const pack = stubPack();
    const out = await prepareFromText("你好！", { pack });
    const tokens = out.tokens.map((t) => [t.text, t.isWord]);
    expect(tokens.at(-1)).toEqual(["！", false]);
    expect(tokens.filter(([, isWord]) => isWord).length).toBeGreaterThan(0);
    expect(tokens.map(([text]) => text).join("")).toBe("你好！");
  });

  it("glosses distinct words with stub when pack misses", async () => {
    const pack = stubPack({ 你好: { term: "你好", gloss: "hello" } });
    const out = await prepareFromText("你好", { pack });
    const wordTokens = out.tokens.filter((t) => t.isWord).map((t) => t.text);
    for (const word of new Set(wordTokens)) {
      expect(out.glossary[word]).toBeDefined();
      expect(out.glossary[word]?.term).toBe(word);
    }
    expect(Object.values(out.glossary).some((e) => e.gloss === "hello")).toBe(true);
    expect(Object.values(out.glossary).every((e) => typeof e.gloss === "string")).toBe(true);
  });

  it("rejects text over maxChars", async () => {
    const pack = stubPack();
    await expect(
      prepareFromText("x".repeat(21), { pack, maxChars: 20 }),
    ).rejects.toThrow(/maxChars/);
  });
});