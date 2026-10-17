import { verifyReadingTail1 } from "./readingChecks.fns1.js";
import { verifyReadingTail2 } from "./readingChecks.fns2.js";
import {
  isKnown,
  scoreCI,
  WordStore,
  type LanguagePack,
  type PreparedContent,
  type PrebakedEntry,
} from "@tsumugu/engine";

import {
  checkDefLevel,
  verifyContent,
  type DefLevelIndex,
  type VerifyReport,
} from "./genQa.js";
import {
  DEFAULT_READING_CHECKS_CONFIG,
  MIN_NEW_VOCAB_TOUCHED,
  type ReadingChecksConfig,
} from "./readingChecks.config.js";
import {
  charViHas,
  type CharViIndex,
  type HanVietIndex,
} from "./hanviet.js";
import type { LessonTarget } from "./lessonTarget.js";
import { createZhHantPack } from "./pack.js";
import {
  hanCount,
  isCompleteSentence,
  paragraphWordCounts,
  sentenceOpenerBigram,
  splitParagraphs,
  splitSentences,
  topRepetitionOffender,
} from "./proseUtils.js";

export type { ReadingChecksConfig } from "./readingChecks.config.js";
export {
  CI_BAND_TARGET,
  ABOVE_BAND_ALLOWANCE,
  NEW_TARGET_RECYCLE_MIN,
  SENTENCE_MIN_HAN,
  SENTENCE_MAX_HAN,
  READING_LENGTH_SPREAD_MIN,
  PARA_REPETITION_MAX_RATIO,
  DISTINCT_OPENER_MIN_RATIO,
  MIN_SENTENCES,
  CI_FAIL_CLOSED,
  DEFAULT_READING_CHECKS_CONFIG,
} from "./readingChecks.config.js";

export interface ReadingCheckOptions {
  content: PreparedContent;
  target: LessonTarget;
  store?: WordStore;
  defLevelIndex?: DefLevelIndex;
  hanviet?: HanVietIndex;
  charVi?: CharViIndex;
  pack?: LanguagePack;
  config?: Partial<ReadingChecksConfig>;
}

export interface ReadingCheckReport {
  pass: boolean;
  reasons: string[];
  achievedLevel: string;
  aboveBandTokens: { word: string; band: string }[];
  ciMeasured: number;
  newTargetRecycle: { word: string; count: number; ok: boolean }[];
  scriptLeaks: { before: string; after: string }[];
  bridgeFailures: { word: string; etymon?: string; reason: string }[];
  polyphoneRisks: { word: string; char: string; reason: string }[];
}

function resolveConfig(partial?: Partial<ReadingChecksConfig>): ReadingChecksConfig {
  return { ...DEFAULT_READING_CHECKS_CONFIG, ...partial };
}

function proseFromTokens(content: PreparedContent): string {
  return content.tokens.map((t) => t.text).join("");
}

function newVocabCharAllow(target: LessonTarget): Set<string> {
  const allow = new Set<string>();
  for (const word of target.newVocab) {
    for (const ch of word) allow.add(ch);
  }
  return allow;
}

function scriptLeakUncovered(
  before: string,
  after: string,
  allow: Set<string>,
): boolean {
  if (before === after) return false;
  if (before.length !== after.length) return true;
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i] && !allow.has(before[i]!)) return true;
  }
  return false;
}

function wordTokensInParagraph(paragraph: string, content: PreparedContent): string[] {
  const words: string[] = [];
  let cursor = 0;
  for (const tok of content.tokens) {
    if (!tok.isWord) continue;
    const idx = paragraph.indexOf(tok.text, cursor);
    if (idx >= 0) {
      words.push(tok.text);
      cursor = idx + tok.text.length;
    }
  }
  if (words.length > 0) return words;

  for (const tok of content.tokens) {
    if (tok.isWord && paragraph.includes(tok.text)) words.push(tok.text);
  }
  return words;
}


function buildGateStore(
  base: WordStore,
  lang: string,
  cumulative: Set<string>,
): WordStore {
  const gateStore = WordStore.fromJSON(base.toJSON());
  for (const word of cumulative) {
    gateStore.setStatus(lang, word, "known");
  }
  return gateStore;
}

export async function verifyReading(opts: ReadingCheckOptions): Promise<ReadingCheckReport> {
const ctx: any = {};

  const config = resolveConfig(opts.config);
  const reasons: string[] = [];
  const baseStore = opts.store ?? new WordStore();
  const store = buildGateStore(baseStore, opts.content.lang, opts.target.cumulativeVocab);
  const pack = opts.pack ?? createZhHantPack();
  const content = opts.content;
  const target = opts.target;
  const prose = proseFromTokens(content);
  const wordTokens = content.tokens.filter((t) => t.isWord);
  const newVocabSet = new Set(target.newVocab);
  const allowChars = newVocabCharAllow(target);

  const aboveBandTokens: { word: string; band: string }[] = [];
  const scriptLeaks: { before: string; after: string }[] = [];
  const bridgeFailures: { word: string; etymon?: string; reason: string }[] = [];
  const polyphoneRisks: { word: string; char: string; reason: string }[] = [];

  const achievedLevel = target.ceiling;
ctx.achievedLevel = achievedLevel;
  const ciMeasured = 0;
ctx.ciMeasured = ciMeasured;
  const newTargetRecycle: { word: string; count: number; ok: boolean }[] = [];
ctx.newTargetRecycle = newTargetRecycle;

  
  ctx.opts = opts; ctx.checkDefLevel = checkDefLevel; ctx.prose = prose; ctx.target = target; ctx.wordTokens = wordTokens; ctx.newVocabSet = newVocabSet; ctx.aboveBandTokens = aboveBandTokens; ctx.config = config; ctx.reasons = reasons; ctx.scoreCI = scoreCI; ctx.content = content; ctx.store = store; ctx.splitSentences = splitSentences; ctx.isCompleteSentence = isCompleteSentence; ctx.hanCount = hanCount; ctx.splitParagraphs = splitParagraphs; ctx.wordTokensInParagraph = wordTokensInParagraph; ctx.paragraphWordCounts = paragraphWordCounts; ctx.topRepetitionOffender = topRepetitionOffender; ctx.sentenceOpenerBigram = sentenceOpenerBigram; ctx.verifyContent = verifyContent; ctx.pack = pack; ctx.scriptLeakUncovered = scriptLeakUncovered; ctx.allowChars = allowChars; ctx.scriptLeaks = scriptLeaks; ctx.isKnown = isKnown; ctx.charViHas = charViHas; ctx.bridgeFailures = bridgeFailures; ctx.polyphoneRisks = polyphoneRisks;
return verifyReadingTail2(ctx);
}