import { Converter } from "opencc-js";
import type { LanguagePack } from "@tsumugu/engine";

let cachedPack: LanguagePack | undefined;

/** zh-Hant pack with OpenCC s2twp script normalizer (Taiwan idioms). */
export function createZhHantPack(): LanguagePack {
  if (cachedPack) return cachedPack;
  const cn2tw = Converter({ from: "cn", to: "twp" });
  cachedPack = {
    id: "zh-Hant",
    name: "Chinese (Traditional)",
    direction: "ltr",
    segmenter: (text) =>
      [...text].map((ch, i) => ({
        text: ch,
        start: i,
        end: i + 1,
        isWord: /\p{Script=Han}/u.test(ch),
      })),
    dictionaryProvider: async () => undefined,
    phoneticLayer: { id: "none", reading: () => undefined },
    levelingModel: async () => undefined,
    scriptNormalizer: (text) => cn2tw(text),
    ttsVoice: { lang: "zh-TW" },
  };
  return cachedPack;
}

/** Deterministic fake normalizer for unit tests (subset of Simplified→Traditional). */
export function createFakeZhPack(
  s2t: Record<string, string> = { 学: "學", 发: "發", 电: "電", 脑: "腦" },
): LanguagePack {
  return {
    id: "zh-Hant",
    name: "Fake zh-Hant",
    direction: "ltr",
    segmenter: async (text) =>
      [...text].map((ch, i) => ({
        text: ch,
        start: i,
        end: i + 1,
        isWord: /\p{Script=Han}/u.test(ch),
      })),
    dictionaryProvider: async () => undefined,
    phoneticLayer: { id: "none", reading: () => undefined },
    levelingModel: async () => undefined,
    scriptNormalizer: async (text) => [...text].map((c) => s2t[c] ?? c).join(""),
  };
}