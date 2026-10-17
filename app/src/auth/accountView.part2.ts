import type { ReaderSettings } from "../app/settings.js";

import type { UserStore } from "../store/userStore.js";

import { getUserStoreForAccount } from "./session.js";

import { resolveUiLocale, tFormat, tKey, type Strings } from "../i18n/strings.js";

import { trackEvent } from "../build/analytics.js";

import { el } from "../ui/dom.js";

export interface AccountViewOpts {
  getSettings?: () => ReaderSettings;
  onSettingsChange?: (patch: Partial<ReaderSettings>) => void;
}

export type SyncPanelOpts = AccountViewOpts;

export interface SyncController {
  open(): void;
  close(): void;
  destroy(): void;
}

export function getStore(): UserStore {
  return getUserStoreForAccount();
}

export function tt(key: keyof Strings): string {
  return tKey(key, resolveUiLocale());
}

export function ttN(key: keyof Strings, n: number): string {
  return tFormat(key, resolveUiLocale(), { n });
}

export function count(event: "sync-export" | "sync-import"): void {
  try { trackEvent(event); } catch {  }
}

export function section(titleText: string): HTMLElement {
  const s = el("section", { class: "tsg-sync-section" });
  s.append(el("h3", { class: "tsg-sync-h", text: titleText }));
  return s;
}

export function status(): HTMLElement {
  return el("p", { class: "tsg-sync-status", attrs: { role: "status", "aria-live": "polite" } });
}

export function renderFileSection(st: UserStore): HTMLElement {
  const wrap = section(tt("sync.fileTitle"));
  const msg = status();

  const exp = el("button", { class: "tsg-btn", type: "button", text: tt("sync.exportFile") });
  exp.addEventListener("click", () => {
    const json = st.exportJSON();
    const name = `tsumugu-known-words-${Date.now()}.json`;
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    count("sync-export");
    msg.textContent = tt("sync.exported");
  });

  
  const share = el("button", { class: "tsg-btn", type: "button", text: tt("sync.share") });
  share.addEventListener("click", () => {
    void (async () => {
      try {
        const json = st.exportJSON();
        const file = new File([json], `tsumugu-known-words-${Date.now()}.json`, { type: "application/json" });
        const nav = navigator as Navigator & {
          canShare?: (d?: ShareData) => boolean;
          share?: (d: ShareData) => Promise<void>;
        };
        const data: ShareData = { files: [file], title: "Tsumugu known words" };
        if (nav.share && (!nav.canShare || nav.canShare(data))) {
          await nav.share(data);
          count("sync-export");
          msg.textContent = tt("sync.shared");
        } else {
          msg.textContent = tt("sync.shareUnsupported");
        }
      } catch {
        msg.textContent = tt("sync.shareCancelled");
      }
    })();
  });

  
  const fileInput = el("input", { class: "tsg-sync-file", attrs: { type: "file", accept: "application/json,.json" } });
  fileInput.style.display = "none";
  const imp = el("button", { class: "tsg-btn", type: "button", text: tt("sync.importFile") });
  imp.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (f) void importFromFile(f, st, msg);
    fileInput.value = "";
  });

  
  const drop = el("div", { class: "tsg-sync-drop", text: tt("sync.drop") });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    const f = e.dataTransfer?.files?.[0];
    if (f) void importFromFile(f, st, msg);
  });

  const actions = el("div", { class: "tsg-account-actions" });
  actions.append(exp, share, imp);
  wrap.append(actions, drop, fileInput, msg);
  return wrap;
}

async function importFromFile(file: File, st: UserStore, msg: HTMLElement): Promise<void> {
  try {
    const text = await file.text();
    const { report } = st.importUserDoc(JSON.parse(text));
    count("sync-import");
    msg.textContent = report.hadConflict
      ? ttN("sync.importedMergedConflict", report.wordsTouched)
      : ttN("sync.importedMerged", report.wordsTouched);
  } catch (e) {
    msg.textContent = e instanceof Error ? `${tt("sync.importFailed")}: ${e.message}` : `${tt("sync.importFailed")}.`;
  }
}
