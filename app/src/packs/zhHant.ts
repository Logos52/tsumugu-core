import { Converter } from "opencc-js";
import type { LanguagePack, Token } from "@tsumugu/engine";
import type { BrowserDict } from "./index.js";
import { toneClassesFromZhuyin } from "./tones.js";

const WORD_RE = /\p{Script=Han}|\p{L}|\p{N}/u;
const HAN_RE = /\p{Script=Han}/u;
const SPACE_RE = /\s/u;

function fallbackSegment(text: string): Token[] {
  const tokens: Token[] = [];
  const chars = [...text];
  let offset = 0;
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i]!;
    if (HAN_RE.test(ch)) {
      tokens.push({ text: ch, start: offset, end: offset + 1, isWord: true });
      offset += 1;
      i += 1;
      continue;
    }
    const isWordChar = (c: string): boolean => WORD_RE.test(c) && !HAN_RE.test(c);
    const isSpace = (c: string): boolean => SPACE_RE.test(c);
    const start = offset;
    let run = "";
    if (isWordChar(ch)) {
      while (i < chars.length && isWordChar(chars[i]!)) {
        run += chars[i];
        i += 1;
        offset += 1;
      }
      tokens.push({ text: run, start, end: offset, isWord: true });
    } else if (isSpace(ch)) {
      while (i < chars.length && isSpace(chars[i]!)) {
        run += chars[i];
        i += 1;
        offset += 1;
      }
      tokens.push({ text: run, start, end: offset, isWord: false });
    } else {
      while (
        i < chars.length &&
        !isWordChar(chars[i]!) &&
        !isSpace(chars[i]!) &&
        !HAN_RE.test(chars[i]!)
      ) {
        run += chars[i];
        i += 1;
        offset += 1;
      }
      tokens.push({ text: run, start, end: offset, isWord: false });
    }
  }
  return tokens;
}

export function createZhHantBrowserPack(opts?: { dict?: BrowserDict }): LanguagePack {
  const dict = opts?.dict;
  const cn2tw = Converter({ from: "cn", to: "twp" });

  return {
    id: "zh-Hant",
    name: "Chinese (Traditional)",
    direction: "ltr",
    segmenter: fallbackSegment,
    dictionaryProvider: (word) => dict?.lookup(word),
    phoneticLayer: {
      id: "zhuyin",
      reading: (_word, entry) => entry?.reading,
      toneClasses: (_word, reading) =>
        reading ? toneClassesFromZhuyin(reading) : undefined,
    },
    levelingModel: () => undefined,
    scriptNormalizer: (text) => cn2tw(text),
    ttsVoice: { lang: "zh-TW" },
  };
}