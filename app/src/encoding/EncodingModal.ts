/**
 * Encoding / review surface (in-app modal or depth, data-free, using engine).
 * Form+story+components from prebaked or encoding page doc.
 * Flag for authoring, personal notes local-only.
 * Inert w/o deep data; hooks from reader hover.
 */

import { el } from "../ui/dom.js";
import { isEncodingPageDoc, parseEncodingPage, type EncodingPageDoc } from "@tsumugu/engine";
import type { CorePreparedContent } from "../types/corePrepared.js";

export interface EncodingModal {
  open(word: string, prepared?: CorePreparedContent | null): void;
  close(): void;
  destroy(): void;
}

export function createEncodingModal(host: HTMLElement = document.body): EncodingModal {
  let overlay: HTMLElement | null = null;

  function close() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function open(word: string, prepared?: CorePreparedContent | null) {
    close();
    overlay = el("div", { class: "tsg-encoding-overlay" });
    const card = el("div", { class: "tsg-encoding-card card" });
    const closeBtn = el("button", { text: "✕", class: "close" });
    closeBtn.onclick = close;

    // Use engine encodingPage if available on prepared glossary (or stub)
    let enc: EncodingPageDoc | null = null;
    if (prepared) {
      try {
        const entry = (prepared as any).glossary?.[word];
        if (entry && entry.encoding) {
          enc = parseEncodingPage(entry.encoding) || (isEncodingPageDoc(entry.encoding) ? entry.encoding : null);
        }
      } catch {}
    }

    const title = el("h3", { text: `Encoding: ${word}` });
    const body = el("div", { class: "enc-body" });

    if (enc) {
      const e: any = enc;
      const mnem = e.mnemonic?.text || e.etymology?.payoff || e.form || e.story || "Mnemonic / story...";
      const comps = (e.etymology?.parts || e.components || []).map((c: any) => c?.char || c || "").filter(Boolean).join(" · ") || "";
      body.append(
        el("div", { text: e.term || e.form || word }),
        el("p", { text: mnem }),
        el("div", { class: "components", text: comps })
      );
    } else {
      body.append(
        el("p", { text: "Form / story / components (local notes only)." }),
        el("textarea", { attrs: { placeholder: "Your mnemonic notes (saved local)", rows: "4" } })
      );
    }

    const flag = el("button", { text: "Flag for authoring", class: "flag" });
    flag.onclick = () => {
      // local only flag
      try { localStorage.setItem(`tsg-flag-${word}`, "1"); } catch {}
      flag.textContent = "Flagged ✓";
    };

    card.append(closeBtn, title, body, flag);
    overlay.append(card);
    host.append(overlay);
    // esc close
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); } };
    document.addEventListener("keydown", onEsc, { once: true });
  }

  return { open, close, destroy: close };
}
