import type { ReaderState } from "../app/state.js";
import { packForLang } from "../packs/index.js";
import type { CorePreparedContent } from "../types/corePrepared.js";
import { DEFAULT_MAX_CHARS, prepareFromText } from "./prepareFromText.js";
import { importCaption, importPrivacyNotice } from "./copy.js";
import { el } from "../ui/dom.js";

export interface ImportPanelOpts {
  state: ReaderState;
  vault?: import("@tsumugu/engine").VaultIO | null;
  onLoaded?: () => void;
}

export interface ImportPanelController {
  open(): void;
  close(): void;
  destroy(): void;
}

export function mountImportPanel(
  root: HTMLElement,
  opts: ImportPanelOpts,
): ImportPanelController {
  const backdrop = el("div", { class: "tsg-import-backdrop tsg-import-hidden" });
  const panel = el("div", { class: "tsg-import-panel" });
  const title = el("h2", { class: "tsg-import-title", text: "Paste a reading" });
  const notice = el("p", { class: "tsg-import-notice", text: importPrivacyNotice() });
  const caption = el("p", { class: "tsg-import-caption", text: importCaption() });
  const textarea = el("textarea", {
    class: "tsg-import-textarea",
    attrs: { rows: "10", placeholder: "Paste Traditional or Simplified Chinese here… (drag .txt, .md or .epub too)" },
  });
  const fileInput = el("input", {
    attrs: { type: "file", accept: ".txt,.md,.epub,text/*,application/epub+zip" },
  });
  fileInput.style.display = "none";
  const pickBtn = el("button", { class: "tsg-import-btn", type: "button", text: "Choose file / EPUB" });
  const error = el("p", { class: "tsg-import-error tsg-import-error-hidden" });
  const actions = el("div", { class: "tsg-import-actions" });
  const clearBtn = el("button", { class: "tsg-import-btn", type: "button", text: "Clear" });
  const submitBtn = el("button", {
    class: "tsg-import-btn tsg-import-submit",
    type: "button",
    text: "Read it",
  });

  let loading = false;

  actions.append(clearBtn, pickBtn, submitBtn);
  panel.append(title, notice, caption, textarea, fileInput, error, actions);

  // Drag + drop support (paste UI polish)
  const dropTarget = textarea;
  ["dragenter", "dragover"].forEach((ev) => dropTarget.addEventListener(ev, (e) => { e.preventDefault(); dropTarget.style.borderColor = "var(--tsg-accent)"; }));
  dropTarget.addEventListener("dragleave", () => { dropTarget.style.borderColor = ""; });
  dropTarget.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropTarget.style.borderColor = "";
    const file = e.dataTransfer?.files?.[0];
    if (file) await loadFileIntoTextarea(file, textarea, setError);
  });

  // File picker + EPUB/text support (client-side only, no MT, no network)
  pickBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    if (f) await loadFileIntoTextarea(f, textarea, setError);
    fileInput.value = "";
  });
  backdrop.append(panel);
  root.append(backdrop);

  const setError = (msg: string | null): void => {
    if (!msg) {
      error.textContent = "";
      error.classList.add("tsg-import-error-hidden");
      return;
    }
    error.textContent = msg;
    error.classList.remove("tsg-import-error-hidden");
  };

  const setLoading = (on: boolean): void => {
    loading = on;
    submitBtn.disabled = on;
    clearBtn.disabled = on;
    textarea.disabled = on;
    submitBtn.textContent = on ? "Preparing…" : "Read it";
  };

  const close = (): void => {
    backdrop.classList.add("tsg-import-hidden");
    setError(null);
  };

  const open = (): void => {
    // Refresh rail-dependent copy (EN/VI) at open time.
    notice.textContent = importPrivacyNotice();
    caption.textContent = importCaption();
    backdrop.classList.remove("tsg-import-hidden");
    textarea.focus();
  };

  clearBtn.addEventListener("click", () => {
    textarea.value = "";
    setError(null);
  });

  // Client-side file/EPUB loader (no network, no MT). .txt/.md direct; .epub basic text extraction (spine html text).
  async function loadFileIntoTextarea(file: File, ta: HTMLTextAreaElement, setErr: (m: string | null) => void): Promise<void> {
    setErr(null);
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".epub")) {
        // Minimal client EPUB text extraction: read zip-ish bytes, decode html parts as utf8 text.
        // (Full zip central-dir parse would be longer; this grabs readable text chunks for polish.)
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let text = "";
        // Scan for common epub html/xhtml content markers and decode segments (best-effort, pure browser)
        for (let i = 0; i < bytes.length - 20; i++) {
          if (bytes[i] === 0x3C && (bytes[i+1] === 0x68 || bytes[i+1] === 0x78)) { // <h or <x
            // take a window and decode
            const slice = bytes.slice(i, Math.min(i + 4096, bytes.length));
            try {
              const dec = new TextDecoder("utf-8", { fatal: false }).decode(slice);
              const stripped = dec.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              if (stripped.length > 20 && /[\u4e00-\u9fff]/.test(stripped)) { text += stripped + "\n\n"; }
            } catch {}
          }
        }
        if (!text) text = "[EPUB: client-side text extraction (no upload). Paste extracted or convert to txt for full.]";
        ta.value = text.slice(0, 18000);
        return;
      }
      // txt / md / plain
      const txt = await file.text();
      ta.value = txt;
    } catch (e) {
      setErr("Could not read file (client only). Try paste or smaller txt.");
    }
  }

  submitBtn.addEventListener("click", async () => {
    if (loading) return;
    const raw = textarea.value.trim();
    if (!raw) {
      setError("Paste some text first.");
      return;
    }
    if (raw.length > DEFAULT_MAX_CHARS) {
      setError("Paste is too long — trim to ~20,000 characters");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const pack = packForLang("zh-Hant", { vault: opts.vault ?? null });
      if (!pack) throw new Error("zh-Hant pack unavailable");
      const content = await prepareFromText(raw, { pack });
      opts.state.setContent(content);
      textarea.value = "";
      close();
      opts.onLoaded?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      if (msg.includes("maxChars")) {
        setError("Paste is too long — trim to ~20,000 characters");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  return {
    open,
    close,
    destroy: () => {
      backdrop.remove();
    },
  };
}