

import { writePrefsMirror } from "../prefs/prefsMirror.js";

export const DEFAULT_RAIL = "en" as const;

type Palette = "seal" | "mist" | "silk" | "celadon" | "sumi" | "loom" | "navy" | "mauve";
type Theme = "light" | "dark";
export type Rail = "en" | "vi";
export type Reading = "py" | "zh" | "hv" | "zy";
type Script = "trad" | "simp";
type Gloss = "en" | "vi";
type HoverMode = "shift" | "all";

export interface ReaderSettings {
  rail: Rail;
  script: Script;
  reading: Reading;
  gloss: Gloss;
  theme: Theme;
  palette: Palette;
  knownStateOn: boolean;
  guessFirst: boolean;
  toneColoring: boolean;
  
  hoverMode: HoverMode;
  
  audioOnly: boolean;
}

const STORAGE_KEY = "tsumugu.core.prefs";
const LEGACY_STORAGE_KEY = "tsumugu-core/settings";

export const DEFAULT_SETTINGS: ReaderSettings = {
  rail: DEFAULT_RAIL,
  script: "trad",
  reading: "py",
  gloss: "en",
  theme: "light",
  palette: "seal",
  knownStateOn: false,
  guessFirst: false,
  toneColoring: false,
  hoverMode: "shift",
  audioOnly: false,
};

function railDefaults(rail: Rail): Pick<ReaderSettings, "reading" | "gloss"> {
  return rail === "vi"
    ? { reading: "hv", gloss: "vi" }
    : { reading: "py", gloss: "en" };
}

function normalizeStored(raw: Partial<ReaderSettings>): ReaderSettings {
  const rail = raw.rail ?? DEFAULT_SETTINGS.rail;
  return {
    ...DEFAULT_SETTINGS,
    ...railDefaults(rail),
    ...raw,
    rail,
  };
}

function readRaw(): Partial<ReaderSettings> | undefined {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (!raw) return undefined;
    return JSON.parse(raw) as Partial<ReaderSettings>;
  } catch {
    return undefined;
  }
}

function writeStored(settings: ReaderSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  
  
  
  writePrefsMirror(settings);
}

let current: ReaderSettings = { ...DEFAULT_SETTINGS };

export function loadSettings(): ReaderSettings {
  const stored = readRaw();
  current = stored ? normalizeStored(stored) : { ...DEFAULT_SETTINGS };
  return { ...current };
}

export function saveSettings(settings: ReaderSettings): void {
  current = normalizeStored(settings);
  writeStored(current);
}

export function applySettingsToRoot(
  settings: ReaderSettings,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset.rail = settings.rail;
  root.dataset.script = settings.script;
  root.dataset.reading = settings.reading;
  root.dataset.gloss = settings.gloss;
  root.dataset.theme = settings.theme;
  root.dataset.palette = settings.palette;
}

export function getPrefs(): ReaderSettings {
  return { ...current };
}

function commit(root: HTMLElement, settings: ReaderSettings): ReaderSettings {
  current = normalizeStored(settings);
  applySettingsToRoot(current, root);
  writeStored(current);
  return getPrefs();
}

export function restore(root: HTMLElement = document.documentElement): ReaderSettings {
  const stored = readRaw();
  const merged = stored ? normalizeStored(stored) : { ...DEFAULT_SETTINGS };
  return commit(root, merged);
}

export function setPalette(
  palette: Palette,
  root: HTMLElement = document.documentElement,
): ReaderSettings {
  return commit(root, { ...current, palette });
}

export function setTheme(
  theme: Theme,
  root: HTMLElement = document.documentElement,
): ReaderSettings {
  return commit(root, { ...current, theme });
}

function setRail(
  rail: Rail,
  root: HTMLElement = document.documentElement,
): ReaderSettings {
  return commit(root, { ...current, rail, ...railDefaults(rail) });
}

function setReading(
  reading: Reading,
  root: HTMLElement = document.documentElement,
): ReaderSettings {
  return commit(root, { ...current, reading });
}

function setScript(
  script: Script,
  root: HTMLElement = document.documentElement,
): ReaderSettings {
  return commit(root, { ...current, script });
}

function setGloss(
  gloss: Gloss,
  root: HTMLElement = document.documentElement,
): ReaderSettings {
  return commit(root, { ...current, gloss });
}

function enableThemeExperiment(
  flag: boolean,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset.themeExp = flag ? "warm" : "control";
}