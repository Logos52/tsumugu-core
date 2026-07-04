import { describe, expect, it } from "vitest";
import {
  PREPARED_CONTENT_SCHEMA_V2,
  WordStore,
  parsePreparedContent,
  statusColorClass,
} from "@tsumugu/engine";

describe("@tsumugu/engine import", () => {
  it("loads core symbols", () => {
    expect(PREPARED_CONTENT_SCHEMA_V2).toBe("tsumugu/prepared-content@2");
    expect(statusColorClass("1")).toBe("tsg-status-1");

    const store = new WordStore();
    expect(store.getStatus("zh-Hant", "你好")).toBe("1");

    const parsed = parsePreparedContent({
      schema: PREPARED_CONTENT_SCHEMA_V2,
      lang: "zh-Hant",
      tokens: [{ text: "你", isWord: true }],
      glossary: {
        你: { term: "你", gloss: "you" },
      },
    });
    expect(parsed.lang).toBe("zh-Hant");
  });
});

// hygiene: public pack + LRU test (11.5)
import { LRU, packForLang } from "./packs/index.js";
it("LRU bounded cache works for hygiene", () => {
  const l = new LRU<string, number>(2);
  l.set("a", 1); l.set("b", 2); l.set("c", 3);
  expect(l.has("a")).toBe(false);
  expect(l.get("b")).toBe(2);
});
it("packForLang returns zhHant pack (public)", () => {
  const p = packForLang("zh-Hant");
  expect(p).toBeTruthy();
  expect(p?.segmenter).toBeTypeOf("function");
});