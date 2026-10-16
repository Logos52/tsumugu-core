

import { lookupPrebaked, type PrebakedEntry, type BridgeInfo } from "@tsumugu/engine";
import type { ReaderState } from "../app/state.js";
import { dictUrlFor, readRailParams } from "../dict/dictLink.js";
import { resolveKind, lookupShardEntry, type ShardDictEntry } from "../dict/dictResolve.js";
import { glossForEntry, readingForEntry } from "../reader/reading.js";
import { clear, el } from "../ui/dom.js";
import { CLS } from "../ui/classes.js";

export interface WordPopupController {
  open(word: string, anchor: HTMLElement): void;
  close(): void;
  destroy(): void;
}

function dictTitle(gloss: "en" | "vi"): string {
  return gloss === "vi"
    ? "Mở trang chữ đầy đủ → tsumugu-ed"
    : "Open full entry → tsumugu-ed";
}

function positionCard(anchor: HTMLElement, card: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  let top = rect.bottom + 10;
  const left = Math.min(rect.left, window.innerWidth - card.offsetWidth - 12);
  if (top + card.offsetHeight > window.innerHeight - 12) {
    top = Math.max(12, rect.top - card.offsetHeight - 10);
  }
  card.style.top = `${Math.max(12, top)}px`;
  card.style.left = `${Math.max(12, left)}px`;
}

function renderBridgeCogs(
  host: HTMLElement,
  bridge: BridgeInfo,
  headword: string,
): void {
  clear(host);
  const morphemes = bridge.morphemes ?? [];
  for (const m of morphemes) {
    const row = el("div", { class: "cog" });
    const zh = el("span", { class: "zh" });
    const chars = [...(m.etymon || headword)];
    for (const ch of chars) {
      if (ch === headword || ch === m.etymon) {
        zh.append(el("span", { class: "shared", text: ch }));
      } else {
        zh.append(ch);
      }
    }
    const vi = el("span", { class: "vi" });
    if (m.surface) {
      const shared = m.reading ?? m.surface;
      vi.innerHTML = `<span class="faint"></span><span class="shared">${shared}</span>`;
    }
    const en = el("span", { class: "en", text: m.gloss ?? "" });
    row.append(zh, vi, en);
    host.append(row);
  }
}

function renderEnNote(host: HTMLElement, bridge: BridgeInfo, headword: string): void {
  const etymon = bridge.etymon ?? "";
  const meaning = bridge.meaning ?? bridge.bridgeReading ?? "";
  host.innerHTML = etymon
    ? `<span class="lbl">Phonetic series</span><span class="ser"><span class="ph">${etymon}</span> → <b>${headword}</b>. ${meaning}</span>`
    : `<span class="lbl">Component note</span><span class="ser">${meaning || headword}</span>`;
}

export function createWordPopup(
  state: ReaderState,
  opts?: { onCapture?: (word: string) => void },
): WordPopupController {
  const card = document.getElementById("card");
  const scrim = document.getElementById("scrim");
  if (!card || !scrim) {
    throw new Error("wordPopup: #card and #scrim must exist in the document");
  }

  let anchorEl: HTMLElement | null = null;

  const glyphEl = document.getElementById("cGlyph");
  const readingEl = document.getElementById("cReading");
  const ipaEl = document.getElementById("cIpa");
  const posEl = document.getElementById("cPos");
  const glossEl = document.getElementById("cGloss");
  const bridgeEl = document.getElementById("cBridge");
  const cogsEl = document.getElementById("cCogs");
  const closeEl = document.getElementById("cClose");
  const enNoteEl = document.getElementById("cEnNote");
  const exEl = document.getElementById("cEx");
  const aAdd = document.getElementById("aAdd");
  const aKnown = document.getElementById("aKnown");
  const aDict = document.getElementById("aDict");
  let encBtn: HTMLButtonElement | null = null;
  if (aDict?.parentElement) {
    encBtn = el("button", {
      class: "dict enc",
      text: "E",
      title: "Encoding / mnemonic (modal)",
    });
    encBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const modal = (window as { __tsgEnc?: { open: (w: string, c: unknown) => void } }).__tsgEnc;
      if (modal?.open) modal.open("", (state as { content?: unknown }).content);
      else alert("Encoding (demo; local notes only)");
    });
    aDict.parentElement.appendChild(encBtn);
  }
  let revealBtn: HTMLButtonElement | null = null;

  function close(): void {
    card!.style.display = "none";
    scrim!.style.display = "none";
    card!.classList.remove("is-bridge");
    document.querySelectorAll(`.${CLS.word}.${CLS.sel}`).forEach((n) => n.classList.remove(CLS.sel));
    anchorEl = null;
    revealBtn?.remove();
    revealBtn = null;
    if (glossEl) glossEl.classList.remove(CLS.popupHidden);
  }

  function paintEntry(word: string, entry: PrebakedEntry | undefined, anchor: HTMLElement): void {
    const { settings } = state;
    const glossLang = settings.gloss;
    
    const shardPromise = lookupShardEntry(word);
    const reading = readingForEntry(entry, settings.reading);
    const preGloss = glossForEntry(entry, glossLang);

    if (glyphEl) glyphEl.textContent = word;
    if (readingEl) readingEl.textContent = reading;
    
    if (ipaEl) ipaEl.textContent = "";
    if (posEl) posEl.textContent = "";

    revealBtn?.remove();
    revealBtn = null;
    if (glossEl) {
      glossEl.textContent = preGloss || "—";
      glossEl.classList.remove(CLS.popupHidden);
      if (state.settings.guessFirst && preGloss) {
        glossEl.classList.add(CLS.popupHidden);
        revealBtn = el("button", {
          class: "dict reveal",
          text: "Reveal",
          title: "Reveal gloss (guess-first)",
        });
        revealBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          glossEl.classList.remove(CLS.popupHidden);
          revealBtn?.remove();
          revealBtn = null;
        });
        glossEl.parentElement?.insertBefore(revealBtn, glossEl.nextSibling);
      }
    }

    
    
    const bridge = entry?.bridge;
    const showBridge = !!bridge && settings.rail === "vi";
    card!.classList.toggle("is-bridge", showBridge);

    if (bridgeEl && cogsEl && closeEl && enNoteEl) {
      if (showBridge) {
        bridgeEl.style.display = "";
        enNoteEl.style.display = "none";
        renderBridgeCogs(cogsEl, bridge!, word);
        closeEl.textContent = bridge!.meaning ?? bridge!.bridgeReading ?? "";
        bridgeEl.classList.remove("draw");
        void bridgeEl.offsetWidth;
        bridgeEl.classList.add("draw");
      } else if (bridge && settings.rail === "en") {
        bridgeEl.style.display = "none";
        enNoteEl.style.display = "";
        renderEnNote(enNoteEl, bridge, word);
      } else {
        bridgeEl.style.display = "none";
        enNoteEl.style.display = "none";
      }
    }
    if (exEl) exEl.style.display = "none";

    if (aAdd) {
      
      aAdd.onclick = (ev) => {
        ev.stopPropagation();
        state.recordSeen(word);
        if (settings.knownStateOn) state.gradeWord(word, "known");
        close();
      };
    }
    if (aKnown) {
      aKnown.style.display = settings.knownStateOn ? "" : "none";
      aKnown.onclick = (ev) => {
        ev.stopPropagation();
        state.gradeWord(word, "known");
        close();
      };
    }

    if (aDict) {
      aDict.textContent = "字 →";
      aDict.title = dictTitle(glossLang);
      void resolveKind(word).then((kind) => {
        const href = dictUrlFor(word, kind, readRailParams());
        aDict.setAttribute("href", href);
      });
    }

    if (encBtn) {
      encBtn.textContent = "Form";
      encBtn.title = "Form / encoding / components (modal)";
      encBtn.onclick = (ev) => {
        ev.stopPropagation();
        const modal = (window as { __tsgEnc?: { open: (w: string, c: unknown) => void } }).__tsgEnc;
        if (modal?.open) modal.open(word, (state as { content?: unknown }).content);
        else alert(`Form/encoding for ${word} (demo; local notes only)`);
      };
    }

    
    
    void shardPromise.then((shard) => {
      if (!shard || !card || !glossEl) return;
      
      const useG = glossLang === "vi" && shard.gv ? shard.gv : (shard.g || preGloss);
      if (useG && (!glossEl.textContent || glossEl.textContent === "—" || glossEl.textContent === preGloss)) {
        glossEl.textContent = useG;
      }
      glossEl.title = shard.g || shard.gv || "Definition from tsumugu-ed";

      
      
      const formText = shard.form || shard.components || shard.encoding || shard.hve || "";
      
      const priorForm = card.querySelector(".tsg-form");
      if (priorForm) priorForm.remove();
      
      
      
      if (formText) {
        const formHost = el("div", { class: "tsg-form", style: { margin: "8px 0", padding: "8px 10px", border: "1px solid var(--tsg-border)", borderRadius: "8px", background: "var(--tsg-sunk)", fontSize: "13px" } as any });
        const lbl = el("span", { class: "form-lbl", text: "Form: ", style: { fontWeight: "600", color: "var(--tsg-accent)" } as any });
        const val = el("span", { class: "form-val", text: formText });
        formHost.append(lbl, val);
        
        formHost.style.cursor = "pointer";
        formHost.addEventListener("click", (e) => {
          e.stopPropagation();
          const modal = (window as { __tsgEnc?: { open: (w: string, c: unknown) => void } }).__tsgEnc;
          if (modal?.open) modal.open(word, (state as { content?: unknown }).content);
        });
        
        glossEl.parentElement?.insertBefore(formHost, glossEl.nextSibling);
      }
      
    });

    
    if (aAdd) {
      
      aAdd.onclick = (ev) => {
        ev.stopPropagation();
        state.recordSeen(word);
        if (settings.knownStateOn) state.gradeWord(word, "known");
        close();
      };
    }
    if (aKnown) {
      aKnown.style.display = settings.knownStateOn ? "" : "none";
      aKnown.onclick = (ev) => {
        ev.stopPropagation();
        state.gradeWord(word, "known");
        close();
      };
    }

    card!.style.display = "block";
    scrim!.style.display = "block";
    positionCard(anchor, card!);
  }

  function open(word: string, anchor: HTMLElement): void {
    state.recordSeen(word);
    opts?.onCapture?.(word);

    document.querySelectorAll(`.${CLS.word}.${CLS.sel}`).forEach((n) => n.classList.remove(CLS.sel));
    anchor.classList.add(CLS.sel);
    anchorEl = anchor;

    const entry = state.content ? lookupPrebaked(state.content, word) : undefined;
    paintEntry(word, entry, anchor);
  }

  function onDocPointerDown(ev: PointerEvent): void {
    if (card!.style.display === "none") return;
    const t = ev.target;
    if (t instanceof Node && (card!.contains(t) || scrim!.contains(t))) return;
    if (t instanceof Element && t.closest(`.${CLS.word}`)) return;
    close();
  }

  function onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === "Escape") close();
  }

  function onReposition(): void {
    if (card!.style.display !== "none" && anchorEl) positionCard(anchorEl, card!);
  }

  scrim.addEventListener("click", close);
  document.addEventListener("pointerdown", onDocPointerDown);
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("scroll", onReposition, true);
  window.addEventListener("resize", onReposition);

  return {
    open,
    close,
    destroy() {
      close();
      scrim.removeEventListener("click", close);
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    },
  };
}