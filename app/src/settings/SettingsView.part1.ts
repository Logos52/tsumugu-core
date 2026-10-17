import { el, clear } from "../ui/dom.js";

import type { ReaderSettings } from "../app/settings.js";

import { writePrefsMirror } from "../prefs/prefsMirror.js";

import { applyI18n, getCurrentLocale, tKey as t } from "../i18n/strings.js";

import { applySettingsToRoot } from "../app/settings.js";

import { PALETTE_CATALOG, makeSeg } from "./SettingsView.part2.js";

import type { SettingsViewController, SettingsViewOpts } from "./SettingsView.part2.js";

export function mountSettingsView(host: HTMLElement, opts: SettingsViewOpts): SettingsViewController {
  const panel = el("section", { class: "tsg-settings", id: "settings-surface" });
  host.appendChild(panel);

  
  
  
  function applyChange(patch: Partial<ReaderSettings>): void {
    opts.onChange(patch);
    writePrefsMirror({ ...opts.getSettings(), ...patch });
  }

  function render(): void {
    clear(panel);
    const locale = getCurrentLocale();
    const s = opts.getSettings();

    panel.append(el("h2", { class: "tsg-settings-title", text: t("settings.title", locale) }));

    
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
