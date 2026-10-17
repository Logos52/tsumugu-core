import { SITE } from "../config/site.js";

export const DICT_ORIGIN = SITE.dictOrigin;

interface DictRailParams {
  
  script: "trad" | "simp";
  
  reading: "pinyin" | "zhuyin" | "hv";
  
  gloss: "en" | "vi";
}

const SCRIPT_DEFAULT: DictRailParams["script"] = "trad";
const READING_DEFAULT: DictRailParams["reading"] = "hv";
const GLOSS_DEFAULT: DictRailParams["gloss"] = "vi";

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

export function readRailParams(root: HTMLElement = document.documentElement): DictRailParams {
  const script = root.dataset.script;
  const gloss = root.dataset.gloss;
  return {
    script: script === "simp" ? "simp" : SCRIPT_DEFAULT,
    reading: toDictReading(root.dataset.reading),
    gloss: gloss === "en" ? "en" : GLOSS_DEFAULT,
  };
}

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

export function firstCjkChar(word: string): string {
  for (const ch of word) {
    if (/[\u4e00-\u9fff]/.test(ch)) return ch;
  }
  return word.charAt(0) || word;
}
