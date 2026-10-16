

import { getPrefs, type ReaderSettings } from "../app/settings.js";

export const PREFS_MIRROR_KEY = "tsumugu.prefs.v1";
export const PREFS_MIRROR_VERSION = 1 as const;

export interface PrefsMirror {
  v: typeof PREFS_MIRROR_VERSION;
  updatedAt: string;
  script: ReaderSettings["script"];
  reading: ReaderSettings["reading"];
  gloss: ReaderSettings["gloss"];
  theme: ReaderSettings["theme"];
  palette: ReaderSettings["palette"];
}


export function toPrefsMirror(
  s: ReaderSettings,
  nowIso: string = new Date().toISOString(),
): PrefsMirror {
  return {
    v: PREFS_MIRROR_VERSION,
    updatedAt: nowIso,
    script: s.script,
    reading: s.reading,
    gloss: s.gloss,
    theme: s.theme,
    palette: s.palette,
  };
}


export function writePrefsMirror(
  settings: ReaderSettings = getPrefs(),
  nowIso: string = new Date().toISOString(),
): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(PREFS_MIRROR_KEY, JSON.stringify(toPrefsMirror(settings, nowIso)));
  } catch {
    
  }
}
