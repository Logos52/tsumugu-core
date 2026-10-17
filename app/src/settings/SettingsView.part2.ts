import type { ReaderSettings } from "../app/settings.js";

import { el, clear } from "../ui/dom.js";

import { applyI18n, getCurrentLocale, tKey as t } from "../i18n/strings.js";

export const PALETTE_CATALOG: Array<{ value: string; label: string; forcesDark?: boolean }> = [
  { value: "seal", label: "印 Seal" },
  { value: "silk", label: "絹 Silk-Seam" },
  { value: "celadon", label: "青磁 Celadon" },
  { value: "mist", label: "霧 Mist" },
  { value: "sumi", label: "墨 Sumi-Slate" },
  { value: "loom", label: "燈 Loom" },
  { value: "navy", label: "House Dark-navy", forcesDark: true },
  { value: "mauve", label: "Mauve Spool", forcesDark: true },
];

export interface SettingsViewOpts {
  getSettings: () => ReaderSettings;
  onChange: (patch: Partial<ReaderSettings>) => void;
}

export interface SettingsViewController {
  el: HTMLElement;
  render(): void;
  destroy(): void;
}

export function makeSeg(
  labelKey: string,
  attr: "rail" | "script" | "reading" | "gloss",
  options: Array<{ value: string; label: string }>,
  current: string,
  onPick: (value: string) => void,
): HTMLElement {
  const seg = el("div", { class: "seg settings-seg" });
  seg.append(el("span", { class: "lbl", text: t(labelKey, getCurrentLocale()) }));
  for (const opt of options) {
    const btn = el("button", {
      class: opt.value === current ? "on" : "",
      type: "button",
      text: opt.label,
    });
    btn.dataset[attr] = opt.value;
    btn.addEventListener("click", () => {
      seg.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      document.documentElement.dataset[attr] = opt.value;
      onPick(opt.value);
    });
    seg.append(btn);
  }
  return seg;
}
