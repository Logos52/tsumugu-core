import {
  PREPARED_CONTENT_SCHEMA_V2,
  type PrebakedEntry,
  type PreparedContent,
} from "@tsumugu/engine";
import type { CorePreparedContent } from "../types/corePrepared.js";

function entry(term: string, over: Partial<PrebakedEntry> = {}): PrebakedEntry {
  return {
    term,
    gloss: `${term}-gloss`,
    reading: "vọng / wàng / ㄨㄤˋ",
    ...over,
  };
}

export const SAMPLE_CONTENT: CorePreparedContent = {
  schema: PREPARED_CONTENT_SCHEMA_V2,
  lang: "zh-Hant",
  title: "山中的客棧",
  tokens: [
    { text: "他", isWord: true },
    { text: "望", isWord: true },
    { text: "客棧", isWord: true },
    { text: "。", isWord: false },
  ],
  glossary: {
    他: entry("他", { reading: "tha / tā" }),
    望: entry("望", {
      definitions: {
        en: { gloss: "to gaze" },
        zh: { gloss: "nhìn ra xa", level: "A2", monolingual: true },
      },
      bridge: {
        bridgeLang: "vi",
        etymon: "亡",
        meaning: "shared vọng morpheme",
        morphemes: [
          { surface: "hy vọng", etymon: "希望", reading: "vọng", gloss: "to hope" },
        ],
      },
    }),
    客棧: entry("客棧", { reading: "khách sạn / kèzhàn" }),
  },
  core: {
    band: "B1",
    tocfl: 3,
    kind: "story",
    newWords: 2,
    binding: { textbook: "accc", book: 4, lesson: 3 },
    newWordList: ["望", "客棧"],
  },
};

export function mountCardShell(doc: Document = document): void {
  doc.body.innerHTML = `
    <p class="prose" id="prose"></p>
    <div id="scrim"></div>
    <div id="card" role="dialog">
      <div class="top">
        <div class="glyph" id="cGlyph"></div>
        <div class="head">
          <div class="hv" id="cReading"></div>
          <div class="ipa" id="cIpa"></div>
          <div class="pos" id="cPos"></div>
        </div>
      </div>
      <div class="body">
        <div class="gloss" id="cGloss"></div>
        <div class="bridge vi-only" id="cBridge"><div class="cogs" id="cCogs"></div><div class="close" id="cClose"></div></div>
        <div class="ennote en-only" id="cEnNote"></div>
        <div class="ex" id="cEx"></div>
        <div class="acts">
          <button class="known" id="aKnown" type="button">✓</button>
          <a class="dict" id="aDict" href="#" target="_blank" rel="noopener">字 →</a>
        </div>
      </div>
    </div>
  `;
}

export type { PreparedContent };