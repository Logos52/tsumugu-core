import { describe, expect, it } from "vitest";
import { importVocabJson, importVocabList, type VocabImportStore } from "@tsumugu/vocab-import";

const store: VocabImportStore = {
  all: () => [],
  get: () => undefined,
  setStatus: () => {
    throw new Error("wrote");
  },
};

describe("empty vocab import", () => {
  it("writes nothing for an empty word-store and an empty list", () => {
    const json = importVocabJson('{"schema":"tsumugu/word-store@2","entries":[]}', store);
    const list = importVocabList("", store);
    expect(json).toEqual({ applied: 0, unchanged: 0 });
    expect(list).toEqual({ applied: 0, unchanged: 0 });
  });
});
