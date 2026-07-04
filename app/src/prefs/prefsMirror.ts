/**
 * Prefs mirror for cross-site federation (WO-UNIFY-C C6, item 31).
 *
 * Mirrors the display prefs (script / reading / gloss / theme / palette) into
 * `localStorage["tsumugu.prefs.v1"]` whenever they change. The dictionary site
 * (separate repo) reads this as its default when its own `ted-*` keys are unset.
 *
 * Reads canonical values from `app/settings.ts` (read-only). This is a NEW
 * module — NOT the deprecated `prefs/prefs.ts` shim (Lane B's).
 */

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

/** Project the federation-facing subset out of full reader settings. */
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

/**
 * Write the prefs mirror. Reads current canonical settings from `app/settings.ts`
 * unless an explicit snapshot is supplied. Best-effort; never throws.
 */
export function writePrefsMirror(
  settings: ReaderSettings = getPrefs(),
  nowIso: string = new Date().toISOString(),
): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(PREFS_MIRROR_KEY, JSON.stringify(toPrefsMirror(settings, nowIso)));
  } catch {
    /* ignore */
  }
}
