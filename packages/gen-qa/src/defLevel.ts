import { tokenize, add_word } from "jieba-wasm";
import {
  type DefLevelIndex,
  buildAllowList,
  resolveTokenBand,
  tocflBandFromOrdinal,
  tocflOrdinal,
} from "./defLevelData.js";

const WORD_RE = /[\p{Script=Han}\p{L}\p{N}]/u;

export interface DefLevelViolation {
  word: string;
  band: string;
  ceiling: string;
  field: string;
}

export interface CheckDefLevelResult {
  violations: DefLevelViolation[];
  achievedLevel: string;
  levelEscalated: boolean;
  tokens: string[];
}

export interface CheckDefLevelOptions {
  text: string;
  ceiling: string;
  index: DefLevelIndex;
  field?: string;
  segmenter?: (text: string, index: DefLevelIndex) => string[];
}

let jiebaSeededFor: DefLevelIndex | undefined;

function seedJieba(index: DefLevelIndex): void {
  if (jiebaSeededFor === index) return;
  const words = index.cedictWords ?? Object.keys(index.tocfl);
  for (const word of words) {
    if (word.length >= 2) add_word(word, index.freq[word] ?? undefined, undefined);
  }
  jiebaSeededFor = index;
}

export function segmentDefText(text: string, index: DefLevelIndex): string[] {
  if (text === "") return [];
  seedJieba(index);
  const raw = tokenize(text, "default", false);
  return raw.filter((t) => WORD_RE.test(t.word)).map((t) => t.word);
}

export function decomposesIntoAllowList(
  token: string,
  allowList: Set<string>,
  maxLen = 12,
): boolean {
  if (allowList.has(token)) return true;
  if (token.length < 2) return false;

  let i = 0;
  while (i < token.length) {
    let matched = 0;
    for (let len = Math.min(maxLen, token.length - i); len >= 1; len--) {
      if (allowList.has(token.slice(i, i + len))) {
        matched = len;
        break;
      }
    }
    if (matched === 0) return false;
    i += matched;
  }
  return true;
}

export function checkDefLevel(opts: CheckDefLevelOptions): CheckDefLevelResult {
  const { text, ceiling, index, field = "text" } = opts;
  const segment = opts.segmenter ?? segmentDefText;
  const tokens = segment(text, index);
  const allowList = buildAllowList(ceiling, index);
  const ceilingOrd = tocflOrdinal(ceiling);

  const violations: DefLevelViolation[] = [];
  let maxOrd = 0;

  for (const token of tokens) {
    const band = resolveTokenBand(token, index);
    const ord = tocflOrdinal(band);
    if (ord !== 99) maxOrd = Math.max(maxOrd, ord);
    else maxOrd = Math.max(maxOrd, 7);

    const withinCeiling = ord !== 99 && ord <= ceilingOrd;
    const credited =
      !withinCeiling && decomposesIntoAllowList(token, allowList);

    if (!withinCeiling && !credited) {
      violations.push({ word: token, band, ceiling, field });
    }
  }

  const achievedLevel = tocflBandFromOrdinal(maxOrd === 0 ? ceilingOrd : maxOrd);
  const levelEscalated = tocflOrdinal(achievedLevel) > ceilingOrd || violations.length > 0;

  return { violations, achievedLevel, levelEscalated, tokens };
}

export function resetDefLevelSegmenter(): void {
  jiebaSeededFor = undefined;
}