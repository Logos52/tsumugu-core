import { paintEntryFromPart } from "./wordPopup.fns.js";


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
const ctx: any = {};

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
  const revealBtn: HTMLButtonElement | null = null;
ctx.revealBtn = revealBtn;

  function close(): void {
    card!.style.display = "none";
    scrim!.style.display = "none";
    card!.classList.remove("is-bridge");
    document.querySelectorAll(`.${CLS.word}.${CLS.sel}`).forEach((n) => n.classList.remove(CLS.sel));
    anchorEl = null;
    ctx.revealBtn?.remove();
    ctx.revealBtn = null;
    if (glossEl) glossEl.classList.remove(CLS.popupHidden);
  }

  ctx.state = state; ctx.lookupShardEntry = lookupShardEntry; ctx.readingForEntry = readingForEntry; ctx.glossForEntry = glossForEntry; ctx.glyphEl = glyphEl; ctx.readingEl = readingEl; ctx.ipaEl = ipaEl; ctx.posEl = posEl; ctx.glossEl = glossEl; ctx.CLS = CLS; ctx.el = el; ctx.card = card; ctx.bridgeEl = bridgeEl; ctx.cogsEl = cogsEl; ctx.closeEl = closeEl; ctx.enNoteEl = enNoteEl; ctx.renderBridgeCogs = renderBridgeCogs; ctx.renderEnNote = renderEnNote; ctx.exEl = exEl; ctx.aAdd = aAdd; ctx.close = close; ctx.aKnown = aKnown; ctx.aDict = aDict; ctx.dictTitle = dictTitle; ctx.resolveKind = resolveKind; ctx.dictUrlFor = dictUrlFor; ctx.readRailParams = readRailParams; ctx.encBtn = encBtn; ctx.scrim = scrim; ctx.positionCard = positionCard;
const paintEntry = (word: string, entry: PrebakedEntry | undefined, anchor: HTMLElement) => paintEntryFromPart(ctx, word, entry, anchor);

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