// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { WordStore } from "@tsumugu/engine";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import { emptyUserDoc, toUserDoc } from "../store/userDoc.js";
import { encodeSyncCode, decodeSyncCode } from "./syncCode.js";

function sampleDoc() {
  const store = new WordStore();
  store.upsert({ lang: "zh-Hant", word: "朋友", status: "known", notes: "friend", tags: ["core"] });
  store.upsert({ lang: "zh-Hant", word: "山", status: "4" });
  return toUserDoc(store, emptyUserDoc("u", "", DEFAULT_SETTINGS), "2026-06-24T10:00:00.000Z");
}

describe("syncCode (C1)", () => {
  it("encode → decode is symmetric and lossless for words/notes/tags", async () => {
    const doc = sampleDoc();
    const code = await encodeSyncCode(doc);
    expect(typeof code).toBe("string");
    expect(code.length).toBeGreaterThan(1);

    const back = await decodeSyncCode(code);
    const ws = WordStore.fromDoc(back.store);
    expect(ws.getStatus("zh-Hant", "朋友")).toBe("known");
    expect(ws.getStatus("zh-Hant", "山")).toBe("4");
    expect(ws.get("zh-Hant", "朋友")?.notes).toBe("friend");
    expect(ws.get("zh-Hant", "朋友")?.tags).toEqual(["core"]);
  });

  it("decoded doc is normalized (zero-PII, current schema)", async () => {
    const doc = sampleDoc();
    const back = await decodeSyncCode(await encodeSyncCode(doc));
    expect(back.profile.email).toBe("");
  });

  it("rejects a malformed code", async () => {
    await expect(decodeSyncCode("")).rejects.toThrow();
    await expect(decodeSyncCode("Xnot-a-code")).rejects.toThrow();
  });
});
