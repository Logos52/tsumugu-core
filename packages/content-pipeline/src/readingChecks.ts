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

/**
 * Fail-closed prose QA gate — checks A–H per WO-CORE-1 / PRD §6.4.
 * Collects ALL failure reasons; does not short-circuit.
 */
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

  let achievedLevel = target.ceiling;
  let ciMeasured = 0;
  let newTargetRecycle: { word: string; count: number; ok: boolean }[] = [];

  // ── A. In-band coverage (mechanical majority at-or-below target) ──────────
  if (opts.defLevelIndex) {
    const defResult = checkDefLevel({
      text: prose,
      ceiling: target.ceiling,
      index: opts.defLevelIndex,
      field: "prose",
      segmenter: () => wordTokens.map((t) => t.text),
    });
    achievedLevel = defResult.achievedLevel;

    const uncredited = defResult.violations.filter((v) => !newVocabSet.has(v.word));
    for (const v of uncredited) {
      aboveBandTokens.push({ word: v.word, band: v.band });
    }

    const excess = uncredited.length - config.ABOVE_BAND_ALLOWANCE;
    if (excess > 0) {
      const sample = uncredited
        .slice(0, 3)
        .map((v) => `${v.word}(${v.band})`)
        .join(", ");
      reasons.push(
        `prose: ${excess} token(s) above ceiling ${target.ceiling} beyond allowance ` +
          `(got ${uncredited.length}, allowance ${config.ABOVE_BAND_ALLOWANCE}): ${sample}`,
      );
    }

    // Explicit majority check (in addition to allowance): majority of words must be at-or-below
    const total = wordTokens.length || 1;
    const aboveRatio = uncredited.length / total;
    if (aboveRatio > 0.15) {
      reasons.push(
        `prose: only ${((1 - aboveRatio) * 100).toFixed(0)}% words at-or-below target level ` +
          `(majority-at-or-below requirement; ${uncredited.length}/${total} above)`,
      );
    }

    // TODO(WO-CORE-2): fail tokens outside cumulativeVocab ∪ newVocab once the
    // reconciled lesson index is authoritative.
  } else {
    reasons.push("prose: defLevelIndex not provided — cannot verify in-band coverage");
  }

  // ── B. Features the new items (touches, not necessarily all in one reading) ──
  // Each reading must touch at least MIN_NEW_VOCAB_TOUCHED of the chapter's new vocab.
  // Multiple readings per lesson can cover different subsets (variety of choices).
  let touchedNew = 0;
  for (const word of target.newVocab) {
    const count = wordTokens.filter((t) => t.text === word).length;
    if (count >= 1) touchedNew++;
  }
  if (touchedNew < config.MIN_NEW_VOCAB_TOUCHED) {
    reasons.push(
      `newVocab: reading touches only ${touchedNew} of ${target.newVocab.length} chapter new-vocab items ` +
        `(need ≥${config.MIN_NEW_VOCAB_TOUCHED})`,
    );
  }

  const ciForRecycle = scoreCI({
    lang: content.lang,
    tokens: content.tokens,
    getStatus: (w) => store.getStatus(content.lang, w),
    target: config.CI_BAND_TARGET,
    targetWords: target.newVocab,
  });

  newTargetRecycle = (ciForRecycle.targetRecycle ?? []).map((r) => ({
    word: r.word,
    count: r.count,
    ok: r.count >= config.NEW_TARGET_RECYCLE_MIN,
  }));

  for (const r of newTargetRecycle) {
    if (!r.ok && r.count > 0) {  // only complain about low recycle on words the reading actually touches
      reasons.push(
        `newVocab: ${r.word} recurs ${r.count}×, need ≥${config.NEW_TARGET_RECYCLE_MIN}`,
      );
    }
  }

  // TODO(WO-CORE-2): grammar-marker matcher keyed to reconciled grammar representation.
  for (const marker of target.newGrammar) {
    if (!prose.includes(marker)) {
      reasons.push(`newGrammar: missing marker ${marker}`);
    }
  }

  // (OpenCC script guard is performed via verifyContent below — see G)

  // ── D. Sentence completeness + length spread ─────────────────────────
  const sentences = splitSentences(prose);
  if (sentences.length < config.MIN_SENTENCES) {
    reasons.push(
      `prose: need ≥${config.MIN_SENTENCES} sentences, got ${sentences.length}`,
    );
  }

  const hanCounts: number[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]!;
    if (!isCompleteSentence(s)) {
      reasons.push(`prose: sentences[${i}] not complete (no 。！？): ${s}`);
    }
    const hc = hanCount(s);
    hanCounts.push(hc);
    if (hc < config.SENTENCE_MIN_HAN) {
      reasons.push(
        `prose: sentences[${i}] Han count ${hc} < min ${config.SENTENCE_MIN_HAN}: ${s}`,
      );
    }
    if (hc > config.SENTENCE_MAX_HAN) {
      reasons.push(
        `prose: sentences[${i}] Han count ${hc} > max ${config.SENTENCE_MAX_HAN}: ${s}`,
      );
    }
  }

  if (hanCounts.length >= 2) {
    const spread = Math.max(...hanCounts) - Math.min(...hanCounts);
    if (spread < config.READING_LENGTH_SPREAD_MIN) {
      reasons.push(
        `prose: length spread ${spread} < min ${config.READING_LENGTH_SPREAD_MIN} ` +
          `(Han counts ${JSON.stringify(hanCounts)})`,
      );
    }
  }

  // ── E. Paragraph repetition / distinct openers ─────────────────────────
  const paragraphs = splitParagraphs(prose);
  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p]!;
    const paraWords = wordTokensInParagraph(para, content);
    const { total, byWord } = paragraphWordCounts(paraWords);
    const offender = topRepetitionOffender(byWord, total);
    if (offender && offender.ratio > config.PARA_REPETITION_MAX_RATIO) {
      reasons.push(
        `paragraph[${p}]: ${offender.word} is ${(offender.ratio * 100).toFixed(0)}% of ` +
          `content words (max ${(config.PARA_REPETITION_MAX_RATIO * 100).toFixed(0)}%)`,
      );
    }

    const paraSentences = splitSentences(para);
    if (paraSentences.length > 0) {
      const openers = new Set(paraSentences.map((s) => sentenceOpenerBigram(s)));
      const ratio = openers.size / paraSentences.length;
      if (ratio < config.DISTINCT_OPENER_MIN_RATIO) {
        reasons.push(
          `paragraph[${p}]: distinct opener ratio ${ratio.toFixed(2)} < ` +
            `min ${config.DISTINCT_OPENER_MIN_RATIO}`,
        );
      }
    }
  }

  // ── F. CI band (informational by default) ──────────────────────────────
  const ci = scoreCI({
    lang: content.lang,
    tokens: content.tokens,
    getStatus: (w) => store.getStatus(content.lang, w),
    target: config.CI_BAND_TARGET,
    targetWords: target.newVocab,
  });
  ciMeasured = ci.coverage;
  if (config.CI_FAIL_CLOSED && !ci.meetsTarget) {
    reasons.push(
      `ci: coverage ${ciMeasured.toFixed(3)} below target ${config.CI_BAND_TARGET}`,
    );
  }

  // ── G. Dual-rail integrity (reuse verifyContent missing-glossary + OpenCC path) ─
  const verifyReport: VerifyReport = await verifyContent({
    lang: content.lang,
    pack,
    store,
    content,
    targetWords: target.newVocab,
    ciTarget: config.CI_BAND_TARGET,
    ...(opts.defLevelIndex ? { defLevelIndex: opts.defLevelIndex } : {}),
  });

  for (const word of verifyReport.missingGlossary) {
    reasons.push(`glossary: missing usable gloss for unknown word ${word}`);
  }

  // OpenCC s2twp via verifyContent (reuses its full normalize walk over tokens+glossary+bridge)
  for (const change of verifyReport.openccChanges) {
    if (scriptLeakUncovered(change.before, change.after, allowChars)) {
      scriptLeaks.push(change);
      reasons.push(
        `script: Simplified/non-TW variant leak: ${change.before} → ${change.after}`,
      );
    }
  }

  const hasAnyBridge = Object.values(content.glossary).some(
    (e) => (e.bridge?.morphemes?.length ?? 0) > 0,
  );
  if (!hasAnyBridge) {
    reasons.push("vi-rail: no verified VI bridge entries in glossary");
  }

  for (const t of wordTokens) {
    if (isKnown(store.getStatus(content.lang, t.text))) continue;
    const entry = content.glossary[t.text];
    if (!entry?.bridge?.morphemes?.length) {
      reasons.push(`vi-rail: unknown word ${t.text} missing bridge morphemes`);
    }
  }

  const hasBridgeGlossary = Object.values(content.glossary).some(
    (e) => (e.bridge?.morphemes?.length ?? 0) > 0,
  );
  if (hasBridgeGlossary && !opts.charVi) {
    reasons.push("bridge: charVi index required but not provided");
  }
  if (hasBridgeGlossary && !opts.hanviet) {
    reasons.push("polyphone: hanviet index required but not provided");
  }

  if (opts.charVi) {
    for (const [word, entry] of Object.entries(content.glossary)) {
      const morphemes = entry.bridge?.morphemes;
      if (!morphemes) continue;
      for (const m of morphemes) {
        for (const ch of m.etymon) {
          if (!charViHas(opts.charVi, ch)) {
            bridgeFailures.push({
              word,
              etymon: ch,
              reason: `morpheme etymon ${ch} not in char_vi`,
            });
            reasons.push(
              `bridge: ${word} asserts ungrounded cognate char ${ch} (absent from char_vi)`,
            );
          }
        }
      }
    }
  }

  // ── H. Polyphone safety (byReading silent-drop) ────────────────────────
  if (opts.hanviet) {
    for (const [word, entry] of Object.entries(content.glossary)) {
      const morphemes = entry.bridge?.morphemes;
      if (!morphemes) continue;
      for (const m of morphemes) {
        for (const ch of m.etymon) {
          const hv = opts.hanviet.get(ch);
          if (!hv || hv.hanViets.length <= 1) continue;
          const reading = m.reading?.trim();
          if (!reading) {
            polyphoneRisks.push({
              word,
              char: ch,
              reason: "polyphone char missing asserted reading",
            });
            reasons.push(
              `polyphone: ${word}/${ch} is polyphone (${hv.hanViets.join(", ")}) ` +
                "but bridge morpheme has no reading",
            );
            continue;
          }
          const mapValues = new Set(Object.values(hv.pinyinMap));
          if (!mapValues.has(reading)) {
            polyphoneRisks.push({
              word,
              char: ch,
              reason: `reading "${reading}" matches no pinyinMap value`,
            });
            reasons.push(
              `polyphone: ${word}/${ch} reading "${reading}" would silently drop ` +
                `(pinyinMap values: ${[...mapValues].join(", ")})`,
            );
          }
        }
      }
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    achievedLevel,
    aboveBandTokens,
    ciMeasured,
    newTargetRecycle,
    scriptLeaks,
    bridgeFailures,
    polyphoneRisks,
  };
}