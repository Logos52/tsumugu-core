import { FEATURES } from "../config/features.js";

import { el } from "../ui/dom.js";

import type { UserStore } from "../store/userStore.js";

import { encodeSyncCode, decodeSyncCode } from "../sync/syncCode.js";

import { downloadBytes, exportAnki } from "../host/anki.js";

import { count, getStore, renderFileSection, section, status, tt, ttN } from "./accountView.part2.js";

import type { AccountViewOpts, SyncController, SyncPanelOpts } from "./accountView.part2.js";

let mounted = false;

let backdrop: HTMLDivElement | null = null;

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

function mountAccountView(root: HTMLElement = document.body, opts: AccountViewOpts = {}): SyncController {
  return mountSyncPanel(root, opts);
}

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
