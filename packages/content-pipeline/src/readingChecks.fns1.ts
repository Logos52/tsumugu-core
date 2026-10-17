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
export async function verifyReadingTail1(ctx: any): Promise<any> {
const ci = ctx.scoreCI({
    lang: ctx.content.lang,
    tokens: ctx.content.tokens,
    getStatus: (w: any) => ctx.store.getStatus(ctx.content.lang, w),
    target: ctx.config.CI_BAND_TARGET,
    targetWords: ctx.target.newVocab,
  });
  ctx.ciMeasured = ci.coverage;
  if (ctx.config.CI_FAIL_CLOSED && !ci.meetsTarget) {
    ctx.reasons.push(
      `ci: coverage ${ctx.ciMeasured.toFixed(3)} below target ${ctx.config.CI_BAND_TARGET}`,
    );
  }

  
  const verifyReport: VerifyReport = await ctx.verifyContent({
    lang: ctx.content.lang,
    pack: ctx.pack,
    store: ctx.store,
    content: ctx.content,
    targetWords: ctx.target.newVocab,
    ciTarget: ctx.config.CI_BAND_TARGET,
    ...(ctx.opts.defLevelIndex ? { defLevelIndex: ctx.opts.defLevelIndex } : {}),
  });

  for (const word of verifyReport.missingGlossary) {
    ctx.reasons.push(`glossary: missing usable gloss for unknown word ${word}`);
  }

  
  for (const change of verifyReport.openccChanges) {
    if (ctx.scriptLeakUncovered(change.before, change.after, ctx.allowChars)) {
      ctx.scriptLeaks.push(change);
      ctx.reasons.push(
        `script: Simplified/non-TW variant leak: ${change.before} → ${change.after}`,
      );
    }
  }

  const hasAnyBridge = Object.values(ctx.content.glossary).some(
    (e: any) => (e.bridge?.morphemes?.length ?? 0) > 0,
  );
  if (!hasAnyBridge) {
    ctx.reasons.push("vi-rail: no verified VI bridge entries in glossary");
  }

  for (const t of ctx.wordTokens) {
    if (ctx.isKnown(ctx.store.getStatus(ctx.content.lang, t.text))) continue;
    const entry = ctx.content.glossary[t.text];
    if (!entry?.bridge?.morphemes?.length) {
      ctx.reasons.push(`vi-rail: unknown word ${t.text} missing bridge morphemes`);
    }
  }

  const hasBridgeGlossary = Object.values(ctx.content.glossary).some(
    (e: any) => (e.bridge?.morphemes?.length ?? 0) > 0,
  );
  if (hasBridgeGlossary && !ctx.opts.charVi) {
    ctx.reasons.push("bridge: charVi index required but not provided");
  }
  if (hasBridgeGlossary && !ctx.opts.hanviet) {
    ctx.reasons.push("polyphone: hanviet index required but not provided");
  }

  if (ctx.opts.charVi) {
    for (const [word, entry] of Object.entries(ctx.content.glossary)) {
      const morphemes = (entry as any).bridge?.morphemes;
      if (!morphemes) continue;
      for (const m of morphemes) {
        for (const ch of m.etymon) {
          if (!ctx.charViHas(ctx.opts.charVi, ch)) {
            ctx.bridgeFailures.push({
              word,
              etymon: ch,
              reason: `morpheme etymon ${ch} not in char_vi`,
            });
            ctx.reasons.push(
              `bridge: ${word} asserts ungrounded cognate char ${ch} (absent from char_vi)`,
            );
          }
        }
      }
    }
  }

  
  if (ctx.opts.hanviet) {
    for (const [word, entry] of Object.entries(ctx.content.glossary)) {
      const morphemes = (entry as any).bridge?.morphemes;
      if (!morphemes) continue;
      for (const m of morphemes) {
        for (const ch of m.etymon) {
          const hv = ctx.opts.hanviet.get(ch);
          if (!hv || hv.hanViets.length <= 1) continue;
          const reading = m.reading?.trim();
          if (!reading) {
            ctx.polyphoneRisks.push({
              word,
              char: ch,
              reason: "polyphone char missing asserted reading",
            });
            ctx.reasons.push(
              `polyphone: ${word}/${ch} is polyphone (${hv.hanViets.join(", ")}) ` +
                "but bridge morpheme has no reading",
            );
            continue;
          }
          const mapValues = new Set(Object.values(hv.pinyinMap));
          if (!mapValues.has(reading)) {
            ctx.polyphoneRisks.push({
              word,
              char: ch,
              reason: `reading "${reading}" matches no pinyinMap value`,
            });
            ctx.reasons.push(
              `polyphone: ${word}/${ch} reading "${reading}" would silently drop ` +
                `(pinyinMap values: ${[...mapValues].join(", ")})`,
            );
          }
        }
      }
    }
  }

  return {
    pass: ctx.reasons.length === 0,
    reasons: ctx.reasons,
    achievedLevel: ctx.achievedLevel,
    aboveBandTokens: ctx.aboveBandTokens,
    ciMeasured: ctx.ciMeasured,
    newTargetRecycle: ctx.newTargetRecycle,
    scriptLeaks: ctx.scriptLeaks,
    bridgeFailures: ctx.bridgeFailures,
    polyphoneRisks: ctx.polyphoneRisks,
  };
}
