/**
 * Sync panel (WO-UNIFY-C C1, item 47) — was the simulated-account surface.
 *
 * Sync Stage 1 is 100% LOCAL: no server, no accounts, no PII. The panel offers
 *   - file export of the UserDoc (download JSON)
 *   - file import (picker + drag/drop) → clock-aware merge (never demotes)
 *   - Web Share API handoff where supported
 *   - a copy/paste "sync code" = base64url(deflate(UserDoc)) (QR is CUT)
 *   - BYO-URL pull (Stage-1 pull-only; writes stay manual export)
 *   - Anki `.apkg` export (built deck)
 *
 * Everything here is gated behind `VITE_FEATURE_SYNC` (default OFF). With the
 * flag off, {@link mountSyncPanel} renders NOTHING — zero sync surface ships.
 *
 * The simulated magic-link login UI has been removed; `auth/session.ts` stays
 * (dev-force-login + `tsumugu-session` auth semantics live there).
 */

import { el } from "../ui/dom.js";
import { resolveUiLocale, tFormat, tKey, type Strings } from "../i18n/strings.js";
import { getUserStoreForAccount } from "./session.js";
import type { UserStore } from "../store/userStore.js";
import type { ReaderSettings } from "../app/settings.js";
import { downloadBytes, exportAnki } from "../host/anki.js";
import { encodeSyncCode, decodeSyncCode } from "../sync/syncCode.js";
import { FEATURES } from "../config/features.js";
import { trackEvent } from "../build/analytics.js";

/**
 * Kept name/shape so `main.ts` (Lane B) compiles unchanged. Settings were pulled
 * OUT of this surface (C2) into the 設 popover, so these fields are unused here —
 * accepted only for call-site compatibility.
 */
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

let mounted = false;
let backdrop: HTMLDivElement | null = null;

function getStore(): UserStore {
  return getUserStoreForAccount();
}

/** Panel copy — resolved per call so rail/uiLang switches take effect live. */
function tt(key: keyof Strings): string {
  return tKey(key, resolveUiLocale());
}

/** Panel copy with a `{n}` count. */
function ttN(key: keyof Strings, n: number): string {
  return tFormat(key, resolveUiLocale(), { n });
}

/** GoatCounter kill-gate counters for the Stage-2 decision (2026-07-02 sign-off). */
function count(event: "sync-export" | "sync-import"): void {
  try { trackEvent(event); } catch { /* analytics is best-effort */ }
}

/**
 * Mount the Sync panel. NO-OP when `VITE_FEATURE_SYNC` is off — nothing is added
 * to the DOM and the returned controller is inert.
 */
export function mountSyncPanel(root: HTMLElement = document.body, _opts: SyncPanelOpts = {}): SyncController {
  if (!FEATURES.sync) {
    return { open() {}, close() {}, destroy() {} };
  }
  if (mounted && backdrop) {
    const bd = backdrop;
    return {
      open: () => bd.classList.remove("tsg-account-hidden"),
      close: () => bd.classList.add("tsg-account-hidden"),
      destroy: () => {},
    };
  }

  const bd = el("div", { class: "tsg-account-backdrop tsg-account-hidden" });
  backdrop = bd;
  const panel = el("div", { class: "tsg-account-panel" });

  const head = el("div", { class: "tsg-account-head" });
  const title = el("h2", { class: "tsg-account-title", text: tt("sync.title") });
  const closeBtn = el("button", { class: "tsg-account-close", text: "×", attrs: { "aria-label": tt("close") } });
  closeBtn.addEventListener("click", () => bd.classList.add("tsg-account-hidden"));
  head.append(title, closeBtn);

  const body = buildSyncPanelContent();
  panel.append(head, body);
  bd.append(panel);
  root.append(bd);
  mounted = true;

  bd.addEventListener("click", (e) => {
    if (e.target === bd) bd.classList.add("tsg-account-hidden");
  });

  return {
    open: () => bd.classList.remove("tsg-account-hidden"),
    close: () => bd.classList.add("tsg-account-hidden"),
    destroy: () => {
      if (bd.parentNode) bd.parentNode.removeChild(bd);
      backdrop = null;
      mounted = false;
    },
  };
}

/** Backwards-compatible alias — `main.ts` still imports `mountAccountView`. */
export function mountAccountView(root: HTMLElement = document.body, opts: AccountViewOpts = {}): SyncController {
  return mountSyncPanel(root, opts);
}

/**
 * Build the (ungated) Sync panel body. Exported for tests so the "on" surface
 * can be exercised without flipping the build-time flag.
 */
export function buildSyncPanelContent(): HTMLElement {
  const body = el("div", { class: "tsg-account-body tsg-sync-body" });
  const st = getStore();

  const intro = el("p", {
    class: "tsg-sync-intro",
    text: tt("sync.intro"),
  });

  body.append(
    intro,
    renderFileSection(st),
    renderSyncCodeSection(st),
    renderUrlPullSection(st),
    renderAnkiSection(st),
  );
  return body;
}

function section(titleText: string): HTMLElement {
  const s = el("section", { class: "tsg-sync-section" });
  s.append(el("h3", { class: "tsg-sync-h", text: titleText }));
  return s;
}

function status(): HTMLElement {
  return el("p", { class: "tsg-sync-status", attrs: { role: "status", "aria-live": "polite" } });
}

// ── File export / import / share ───────────────────────────────────────────
function renderFileSection(st: UserStore): HTMLElement {
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

  // Web Share API (files) where supported.
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

  // Import via picker.
  const fileInput = el("input", { class: "tsg-sync-file", attrs: { type: "file", accept: "application/json,.json" } });
  fileInput.style.display = "none";
  const imp = el("button", { class: "tsg-btn", type: "button", text: tt("sync.importFile") });
  imp.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (f) void importFromFile(f, st, msg);
    fileInput.value = "";
  });

  // Drag/drop target.
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

// ── Sync code (copy/paste) ─────────────────────────────────────────────────
function renderSyncCodeSection(st: UserStore): HTMLElement {
  const wrap = section(tt("sync.codeTitle"));
  const msg = status();

  const out = el("textarea", {
    class: "tsg-sync-ta",
    attrs: { rows: "3", readonly: "true", placeholder: tt("sync.codeOutPh") },
  });
  const gen = el("button", { class: "tsg-btn", type: "button", text: tt("sync.generate") });
  gen.addEventListener("click", () => {
    void (async () => {
      try {
        const code = await encodeSyncCode(st.exportDoc());
        out.value = code;
        try { await navigator.clipboard?.writeText(code); msg.textContent = tt("sync.copied"); }
        catch { msg.textContent = tt("sync.generated"); }
        count("sync-export");
      } catch (e) {
        msg.textContent = e instanceof Error ? `${tt("sync.failed")}: ${e.message}` : `${tt("sync.failed")}.`;
      }
    })();
  });

  const inp = el("textarea", {
    class: "tsg-sync-ta",
    attrs: { rows: "3", placeholder: tt("sync.codeInPh") },
  });
  const apply = el("button", { class: "tsg-btn", type: "button", text: tt("sync.apply") });
  apply.addEventListener("click", () => {
    void (async () => {
      const code = inp.value.trim();
      if (!code) { msg.textContent = tt("sync.pasteFirst"); return; }
      try {
        const doc = await decodeSyncCode(code);
        const { report } = st.importUserDoc(doc);
        count("sync-import");
        msg.textContent = ttN("sync.merged", report.wordsTouched);
        inp.value = "";
      } catch (e) {
        msg.textContent = e instanceof Error ? `${tt("sync.applyFailed")}: ${e.message}` : `${tt("sync.applyFailed")}.`;
      }
    })();
  });

  const outRow = el("div", { class: "tsg-account-actions" });
  outRow.append(gen);
  const inRow = el("div", { class: "tsg-account-actions" });
  inRow.append(apply);
  wrap.append(outRow, out, inRow, inp, msg);
  return wrap;
}

// ── BYO-URL pull (Stage-1 pull-only) ───────────────────────────────────────
function renderUrlPullSection(st: UserStore): HTMLElement {
  const wrap = section(tt("sync.pullTitle"));
  const msg = status();
  const hint = el("p", {
    class: "tsg-sync-hint",
    text: tt("sync.pullHint"),
  });
  const url = el("input", { class: "tsg-auth-input", attrs: { type: "url", placeholder: "https://…/tsumugu-known-words.json" } });
  const pull = el("button", { class: "tsg-btn", type: "button", text: tt("sync.pull") });
  pull.addEventListener("click", () => {
    void (async () => {
      const u = url.value.trim();
      if (!u) { msg.textContent = tt("sync.enterUrl"); return; }
      pull.disabled = true;
      msg.textContent = tt("sync.pulling");
      try {
        const { report } = await st.pullFromUrl(u);
        count("sync-import");
        msg.textContent = report.note ?? ttN("sync.merged", report.wordsTouched);
      } catch (e) {
        msg.textContent = e instanceof Error ? `${tt("sync.pullFailed")}: ${e.message}` : `${tt("sync.pullFailed")}.`;
      } finally {
        pull.disabled = false;
      }
    })();
  });
  const row = el("div", { class: "tsg-account-actions" });
  row.append(pull);
  wrap.append(hint, url, row, msg);
  return wrap;
}

// ── Anki export ────────────────────────────────────────────────────────────
function renderAnkiSection(st: UserStore): HTMLElement {
  const wrap = section(tt("sync.ankiTitle"));
  const msg = status();
  const btn = el("button", { class: "tsg-btn", type: "button", text: tt("sync.exportApkg") });
  btn.addEventListener("click", () => {
    void (async () => {
      try {
        const bytes = await exportAnki(st.getWordStore(), "zh-Hant");
        downloadBytes(bytes, `tsumugu-known-words-${Date.now()}.apkg`);
        count("sync-export");
        msg.textContent = tt("sync.deckExported");
      } catch (e) {
        msg.textContent = e instanceof Error ? e.message : tt("sync.ankiFailed");
      }
    })();
  });
  const row = el("div", { class: "tsg-account-actions" });
  row.append(btn);
  wrap.append(row, msg);
  return wrap;
}
