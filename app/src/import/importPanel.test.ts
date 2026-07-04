// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, vi } from "vitest";
import { createReaderState } from "../app/state.js";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import { createZhHantBrowserPack } from "../packs/zhHant.js";
import { mountImportPanel } from "./importPanel.js";
import { mountReader } from "../reader/reader.js";
import { createWordPopup } from "../hover/wordPopup.js";
import { mountCardShell } from "../test/fixtures.js";
import { __setTestEntries } from "../dict/dictResolve.js";
import type { CorePreparedContent } from "../types/corePrepared.js";
import { WordStore } from "@tsumugu/engine";

describe("importPanel", () => {
  let root: HTMLElement;
  let state: ReturnType<typeof createReaderState>;

  const stubContent = {
    schema: "tsumugu/prepared-content@2",
    lang: "zh-Hant",
    tokens: [{ text: "你", isWord: true }],
    glossary: { 你: { term: "你", gloss: "you" } },
  } as CorePreparedContent;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.append(root);
    localStorage.clear();
    sessionStorage.clear();
    state = createReaderState(stubContent, new WordStore(), DEFAULT_SETTINGS);
  });

  it("rejects over-maxChars paste without calling setContent", async () => {
    const setContent = vi.spyOn(state, "setContent");
    const panel = mountImportPanel(root, { state });
    panel.open();

    const textarea = document.querySelector(".tsg-import-textarea") as HTMLTextAreaElement;
    const submit = document.querySelector(".tsg-import-submit") as HTMLButtonElement;
    textarea.value = "字".repeat(20_001);
    submit.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(document.querySelector(".tsg-import-error")?.textContent).toContain("too long");
    expect(setContent).not.toHaveBeenCalled();
    panel.destroy();
  });

  it("does not persist pasted text in storage", async () => {
    const paste = "秘密測試文字不要留存";
    const panel = mountImportPanel(root, { state });
    panel.open();

    const textarea = document.querySelector(".tsg-import-textarea") as HTMLTextAreaElement;
    const submit = document.querySelector(".tsg-import-submit") as HTMLButtonElement;
    textarea.value = paste;
    submit.click();
    await new Promise((r) => setTimeout(r, 3000));

    const allStorage = [
      ...Object.values(localStorage),
      ...Object.values(sessionStorage),
    ].join("\n");
    expect(allStorage).not.toContain(paste);
    panel.destroy();
  });

  it("renders imported content in reader with empty WordStore", async () => {
    const panel = mountImportPanel(root, { state });
    panel.open();

    const textarea = document.querySelector(".tsg-import-textarea") as HTMLTextAreaElement;
    const submit = document.querySelector(".tsg-import-submit") as HTMLButtonElement;
    textarea.value = "你好";
    submit.click();
    await new Promise((r) => setTimeout(r, 3000));

    expect(state.content).not.toBeNull();
    mountCardShell();
    __setTestEntries([]);
    const host = document.getElementById("prose")!;
    const popup = createWordPopup(state);
    mountReader(host, state, popup, null);
    expect(host.querySelectorAll(".tsg-word, .w").length).toBeGreaterThan(0);
    panel.destroy();
  });
});