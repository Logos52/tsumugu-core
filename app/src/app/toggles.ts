import type { ReaderSettings } from "./settings.js";
import { applySettingsToRoot } from "./settings.js";

export function applySettings(settings: ReaderSettings): void {
  applySettingsToRoot(settings);
}

export function wireSeg(
  container: HTMLElement,
  attr: keyof Pick<
    ReaderSettings,
    "rail" | "script" | "reading" | "gloss" | "theme" | "palette"
  >,
  onChange: (value: string) => void,
): void {
  const buttons = container.querySelectorAll<HTMLButtonElement>("button");
  for (const btn of buttons) {
    const value = btn.dataset[attr];
    if (!value) continue;
    btn.addEventListener("click", () => {
      for (const b of buttons) b.classList.remove("on");
      btn.classList.add("on");
      document.documentElement.dataset[attr] = value;
      onChange(value);
    });
  }
}

export function wirePaletteSwatches(
  onChange: (palette: ReaderSettings["palette"]) => void,
): void {
  const swatches = document.querySelectorAll<HTMLElement>(".sw");
  for (const sw of swatches) {
    sw.addEventListener("click", () => {
      for (const s of swatches) s.classList.remove("on");
      sw.classList.add("on");
      const palette = sw.dataset.p as ReaderSettings["palette"];
      if (palette) {
        document.documentElement.dataset.palette = palette;
        onChange(palette);
      }
    });
  }
}