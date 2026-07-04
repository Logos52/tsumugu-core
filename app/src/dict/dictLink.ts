import { SITE } from "../config/site.js";

/**
 * Published tsumugu-ed origin. Env-driven via {@link SITE.dictOrigin}
 * (`VITE_DICT_ORIGIN`, default `https://tsumugu-ed.com`). At federation cutover
 * the deploy env flips this to same-origin (`https://tsumugu.cc`).
 */
export const DICT_ORIGIN = SITE.dictOrigin;

/**
 * Canonical dict-URL axis vocabulary (see docs/PRD-Dict-Handoff-Axes.md §2).
 * These are the exact param VALUES emitted onto the `?s=&r=&g=` query and read
 * by tsumugu-ed's pre-paint param reader. The core app's internal axes
 * (`data-reading = py|zh|zy|hv`) are mapped INTO this vocabulary at read time.
 */
export interface DictRailParams {
  /** `s` — script axis. */
  script: "trad" | "simp";
  /** `r` — reading axis. `hv` = Hán-Việt ruby (ed must ship that mode). */
  reading: "pinyin" | "zhuyin" | "hv";
  /** `g` — gloss axis. */
  gloss: "en" | "vi";
}

const SCRIPT_DEFAULT: DictRailParams["script"] = "trad";
const READING_DEFAULT: DictRailParams["reading"] = "hv";
const GLOSS_DEFAULT: DictRailParams["gloss"] = "vi";

/** Map the core app's internal reading axis onto the canonical dict-URL vocabulary. */
function toDictReading(internal: string | undefined): DictRailParams["reading"] {
  switch (internal) {
    case "py":
      return "pinyin";
    case "zh":
    case "zy":
      return "zhuyin";
    case "hv":
      return "hv";
    default:
      return READING_DEFAULT;
  }
}

/** Read the live rail axes off `<html>` (the `data-*` substrate) as canonical dict axes. */
export function readRailParams(root: HTMLElement = document.documentElement): DictRailParams {
  const script = root.dataset.script;
  const gloss = root.dataset.gloss;
  return {
    script: script === "simp" ? "simp" : SCRIPT_DEFAULT,
    reading: toDictReading(root.dataset.reading),
    gloss: gloss === "en" ? "en" : GLOSS_DEFAULT,
  };
}

/**
 * Build the tsumugu-ed deep-link for a headword.
 * Path: `{kind}/{headword}.html` with rail axes as `?s=&r=&g=`.
 */
export function dictUrlFor(
  word: string,
  kind: "c" | "w" | "g",
  p: DictRailParams,
): string {
  const encoded = encodeURIComponent(word);
  const path = `${DICT_ORIGIN}/${kind}/${encoded}.html`;
  const qs = new URLSearchParams({ s: p.script, r: p.reading, g: p.gloss });
  return `${path}?${qs.toString()}`;
}

/** First CJK character in a string (for char-page fallback). */
export function firstCjkChar(word: string): string {
  for (const ch of word) {
    if (/[\u4e00-\u9fff]/.test(ch)) return ch;
  }
  return word.charAt(0) || word;
}
