import type { ReaderState } from "./state.js";
import { newTargetCount } from "../types/corePrepared.js";

// The chrome never narrates itself (DESIGN-PRINCIPLES §11): no provenance
// chip, no status legend, no how-to hint — the marks teach by being used.
const VI = {
  // `core` key retained for shape compatibility; the brand tag is now the
  // "Beta" pill in the shell header (no longer painted into chrome).
  core: "Beta",
  newSuffix: " từ mới",
  aAdd: "+ Thêm thẻ",
  aKnown: "✓ Đã biết",
};

const EN = {
  // `core` key retained for shape compatibility; the brand tag is now the
  // "Beta" pill in the shell header (no longer painted into chrome).
  core: "Beta",
  newSuffix: " new",
  aAdd: "+ Add card",
  aKnown: "✓ I know it",
};

export function applyChromeLang(state: ReaderState): void {
  const vi = state.settings.gloss === "vi";
  const t = vi ? VI : EN;
  const content = state.content;

  const titleRom = document.getElementById("titleRom");
  const newChip = document.getElementById("newChip");

  if (titleRom && content?.title) titleRom.textContent = content.title;
  if (newChip) {
    const n = content ? newTargetCount(content) : 0;
    newChip.textContent = `${n}${t.newSuffix}`;
  }

  const map: Record<string, string> = {
    aAdd: t.aAdd,
    aKnown: t.aKnown,
  };

  for (const [id, text] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  const aDict = document.getElementById("aDict");
  if (aDict) {
    aDict.title = vi
      ? "Mở trang chữ đầy đủ → tsumugu-ed"
      : "Open full entry → tsumugu-ed";
  }
}

export function paintReadHead(state: ReaderState): void {
  const content = state.content;
  if (!content) return;

  const titleZh = document.getElementById("titleZh");
  if (titleZh) titleZh.textContent = content.title ?? "";

  const bandChip = document.getElementById("bandChip");
  if (bandChip && content.core?.band) {
    bandChip.textContent = `${content.core.band} · TOCFL ${content.core.tocfl}`;
  }

  const bindChip = document.getElementById("bindChip");
  if (bindChip) {
    if (content.core?.binding) {
      const b = content.core.binding;
      bindChip.textContent = `當代中文課程 · B${b.book} L${b.lesson}`;
      bindChip.hidden = false;
    } else {
      bindChip.hidden = true;
    }
  }

  const tagrow = document.getElementById("tagrow");
  if (tagrow && content.core?.newWordList) {
    tagrow.replaceChildren();
    for (const w of content.core.newWordList) {
      tagrow.append(Object.assign(document.createElement("span"), { className: "tg", textContent: w }));
    }
  }

  applyChromeLang(state);
}