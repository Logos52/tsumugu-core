/**
 * Settings panel — palette, theme, rail default, reading prefs, known-state toggle.
 * Reuses ReaderSettings from app/settings.ts.
 */

import { el, clear } from "../ui/dom.js";
import { applyI18n, getCurrentLocale, tKey as t } from "../i18n/strings.js";
import type { ReaderSettings } from "../app/settings.js";
import { applySettingsToRoot } from "../app/settings.js";
import { writePrefsMirror } from "../prefs/prefsMirror.js";

/**
 * Palette catalog. `seal` + `mist` are added per the Palette-type extension Lane
 * B owns (seal default) with CSS from Lane A. Values are kept as plain strings
 * and cast to `ReaderSettings["palette"]` at the change seam so this file
 * compiles whether or not Lane B's type bump has landed yet.
 */
const PALETTE_CATALOG: Array<{ value: string; label: string; forcesDark?: boolean }> = [
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

function makeSeg(
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

export function mountSettingsView(host: HTMLElement, opts: SettingsViewOpts): SettingsViewController {
  const panel = el("section", { class: "tsg-settings", id: "settings-surface" });
  host.appendChild(panel);

  // Persist through the host (app/settings.ts) AND mirror the federation-facing
  // prefs (WO-UNIFY-C C6). The mirror reflects the intended post-change state so
  // it is correct regardless of when the host commits.
  function applyChange(patch: Partial<ReaderSettings>): void {
    opts.onChange(patch);
    writePrefsMirror({ ...opts.getSettings(), ...patch });
  }

  function render(): void {
    clear(panel);
    const locale = getCurrentLocale();
    const s = opts.getSettings();

    panel.append(el("h2", { class: "tsg-settings-title", text: t("settings.title", locale) }));

    // Palette
    const paletteBlock = el("div", { class: "tsg-settings-block" });
    paletteBlock.append(el("div", { class: "tsg-settings-label", text: t("settings.palette", locale) }));
    const paletteRow = el("div", { class: "palettes settings-palettes" });
    for (const pal of PALETTE_CATALOG) {
      const p = pal.value;
      const sw = el("span", {
        class: `sw${s.palette === p ? " on" : ""}`,
        dataset: { p },
        attrs: { title: pal.label },
      });
      sw.addEventListener("click", () => {
        paletteRow.querySelectorAll(".sw").forEach((x) => x.classList.remove("on"));
        sw.classList.add("on");
        document.documentElement.dataset.palette = p;
        applyChange({ palette: p as ReaderSettings["palette"] });
        if (pal.forcesDark && s.theme !== "dark") {
          applyChange({ theme: "dark" });
        }
      });
      paletteRow.append(sw);
    }
    paletteBlock.append(paletteRow);
    panel.append(paletteBlock);

    // Light / dark
    const themeBlock = el("div", { class: "tsg-settings-block" });
    themeBlock.append(el("div", { class: "tsg-settings-label", text: t("settings.theme", locale) }));
    const themeSeg = el("div", { class: "seg settings-seg" });
    for (const theme of ["light", "dark"] as const) {
      const btn = el("button", {
        class: s.theme === theme ? "on" : "",
        type: "button",
        text: t(theme === "light" ? "settings.light" : "settings.dark", locale),
      });
      btn.addEventListener("click", () => {
        themeSeg.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
        document.documentElement.dataset.theme = theme;
        applyChange({ theme });
      });
      themeSeg.append(btn);
    }
    themeBlock.append(themeSeg);
    panel.append(themeBlock);

    // Rail default
    panel.append(
      makeSeg(
        "settings.railDefault",
        "rail",
        [
          { value: "vi", label: t("rail.vi", locale) },
          { value: "en", label: t("rail.en", locale) },
        ],
        s.rail,
        (rail) => {
          const r = rail as ReaderSettings["rail"];
          const patch: Partial<ReaderSettings> = {
            rail: r,
            ...(r === "vi" ? { reading: "hv", gloss: "vi" } : { reading: "py", gloss: "en" }),
          };
          applySettingsToRoot({ ...s, ...patch });
          applyChange(patch);
          render();
        },
      ),
    );

    // Reading prefs header
    panel.append(el("h3", { class: "tsg-settings-sub", text: t("settings.readingPrefs", locale) }));

    panel.append(
      makeSeg(
        "settings.script",
        "script",
        [
          { value: "trad", label: "繁" },
          { value: "simp", label: "简" },
        ],
        s.script,
        (script) => applyChange({ script: script as ReaderSettings["script"] }),
      ),
      makeSeg(
        "settings.reading",
        "reading",
        [
          { value: "hv", label: "Hán-Việt" },
          { value: "py", label: "Pinyin" },
          { value: "zh", label: "注音" },
        ],
        s.reading,
        (reading) => applyChange({ reading: reading as ReaderSettings["reading"] }),
      ),
      makeSeg(
        "settings.gloss",
        "gloss",
        [
          { value: "vi", label: "VI" },
          { value: "en", label: "EN" },
        ],
        s.gloss,
        (gloss) => applyChange({ gloss: gloss as ReaderSettings["gloss"] }),
      ),
    );

    // Known-state toggle
    const knownBlock = el("div", { class: "tsg-settings-block tsg-settings-toggle" });
    const knownLabel = el("label", { class: "tsg-settings-check" });
    const knownInput = el("input", {
      attrs: { type: "checkbox" },
    });
    knownInput.checked = s.knownStateOn;
    knownInput.addEventListener("change", () => {
      applyChange({ knownStateOn: knownInput.checked });
    });
    knownLabel.append(
      knownInput,
      el("span", { text: t("settings.knownState", locale) }),
    );
    knownBlock.append(
      knownLabel,
      el("p", { class: "tsg-settings-hint", text: t("settings.knownStateHint", locale) }),
    );
    panel.append(knownBlock);

    applyI18n(panel, locale);
  }

  render();

  return {
    el: panel,
    render,
    destroy() {
      panel.remove();
    },
  };
}