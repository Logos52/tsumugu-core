import { verifyReadingTail1 } from "./readingChecks.fns1.js";
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
export function verifyReadingTail2(ctx: any): any {
if (ctx.opts.defLevelIndex) {
    const defResult = ctx.checkDefLevel({
      text: ctx.prose,
      ceiling: ctx.target.ceiling,
      index: ctx.opts.defLevelIndex,
      field: "prose",
      segmenter: () => ctx.wordTokens.map((t: any) => t.text),
    });
    ctx.achievedLevel = defResult.achievedLevel;

    const uncredited = defResult.violations.filter((v: any) => !ctx.newVocabSet.has(v.word));
    for (const v of uncredited) {
      ctx.aboveBandTokens.push({ word: v.word, band: v.band });
    }

    const excess = uncredited.length - ctx.config.ABOVE_BAND_ALLOWANCE;
    if (excess > 0) {
      const sample = uncredited
        .slice(0, 3)
        .map((v: any) => `${v.word}(${v.band})`)
        .join(", ");
      ctx.reasons.push(
        `prose: ${excess} token(s) above ceiling ${ctx.target.ceiling} beyond allowance ` +
          `(got ${uncredited.length}, allowance ${ctx.config.ABOVE_BAND_ALLOWANCE}): ${sample}`,
      );
    }


    const total = ctx.wordTokens.length || 1;
    const aboveRatio = uncredited.length / total;
    if (aboveRatio > 0.15) {
      ctx.reasons.push(
        `prose: only ${((1 - aboveRatio) * 100).toFixed(0)}% words at-or-below target level ` +
          `(majority-at-or-below requirement; ${uncredited.length}/${total} above)`,
      );
    }



  } else {
    ctx.reasons.push("prose: defLevelIndex not provided — cannot verify in-band coverage");
  }




  let touchedNew = 0;
  for (const word of ctx.target.newVocab) {
    const count = ctx.wordTokens.filter((t: any) => t.text === word).length;
    if (count >= 1) touchedNew++;
  }
  if (touchedNew < ctx.config.MIN_NEW_VOCAB_TOUCHED) {
    ctx.reasons.push(
      `newVocab: reading touches only ${touchedNew} of ${ctx.target.newVocab.length} chapter new-vocab items ` +
        `(need ≥${ctx.config.MIN_NEW_VOCAB_TOUCHED})`,
    );
  }

  const ciForRecycle = ctx.scoreCI({
    lang: ctx.content.lang,
    tokens: ctx.content.tokens,
    getStatus: (w: any) => ctx.store.getStatus(ctx.content.lang, w),
    target: ctx.config.CI_BAND_TARGET,
    targetWords: ctx.target.newVocab,
  });

  ctx.newTargetRecycle = (ciForRecycle.targetRecycle ?? []).map((r: any) => ({
    word: r.word,
    count: r.count,
    ok: r.count >= ctx.config.NEW_TARGET_RECYCLE_MIN,
  }));

  for (const r of ctx.newTargetRecycle) {
    if (!r.ok && r.count > 0) {  
      ctx.reasons.push(
        `newVocab: ${r.word} recurs ${r.count}×, need ≥${ctx.config.NEW_TARGET_RECYCLE_MIN}`,
      );
    }
  }


  for (const marker of ctx.target.newGrammar) {
    if (!ctx.prose.includes(marker)) {
      ctx.reasons.push(`newGrammar: missing marker ${marker}`);
    }
  }




  const sentences = ctx.splitSentences(ctx.prose);
  if (sentences.length < ctx.config.MIN_SENTENCES) {
    ctx.reasons.push(
      `prose: need ≥${ctx.config.MIN_SENTENCES} sentences, got ${sentences.length}`,
    );
  }

  const hanCounts: number[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]!;
    if (!ctx.isCompleteSentence(s)) {
      ctx.reasons.push(`prose: sentences[${i}] not complete (no 。！？): ${s}`);
    }
    const hc = ctx.hanCount(s);
    hanCounts.push(hc);
    if (hc < ctx.config.SENTENCE_MIN_HAN) {
      ctx.reasons.push(
        `prose: sentences[${i}] Han count ${hc} < min ${ctx.config.SENTENCE_MIN_HAN}: ${s}`,
      );
    }
    if (hc > ctx.config.SENTENCE_MAX_HAN) {
      ctx.reasons.push(
        `prose: sentences[${i}] Han count ${hc} > max ${ctx.config.SENTENCE_MAX_HAN}: ${s}`,
      );
    }
  }

  if (hanCounts.length >= 2) {
    const spread = Math.max(...hanCounts) - Math.min(...hanCounts);
    if (spread < ctx.config.READING_LENGTH_SPREAD_MIN) {
      ctx.reasons.push(
        `prose: length spread ${spread} < min ${ctx.config.READING_LENGTH_SPREAD_MIN} ` +
          `(Han counts ${JSON.stringify(hanCounts)})`,
      );
    }
  }


  const paragraphs = ctx.splitParagraphs(ctx.prose);
  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p]!;
    const paraWords = ctx.wordTokensInParagraph(para, ctx.content);
    const { total, byWord } = ctx.paragraphWordCounts(paraWords);
    const offender = ctx.topRepetitionOffender(byWord, total);
    if (offender && offender.ratio > ctx.config.PARA_REPETITION_MAX_RATIO) {
      ctx.reasons.push(
        `paragraph[${p}]: ${offender.word} is ${(offender.ratio * 100).toFixed(0)}% of ` +
          `content words (max ${(ctx.config.PARA_REPETITION_MAX_RATIO * 100).toFixed(0)}%)`,
      );
    }

    const paraSentences = ctx.splitSentences(para);
    if (paraSentences.length > 0) {
      const openers = new Set(paraSentences.map((s: any) => ctx.sentenceOpenerBigram(s)));
      const ratio = openers.size / paraSentences.length;
      if (ratio < ctx.config.DISTINCT_OPENER_MIN_RATIO) {
        ctx.reasons.push(
          `paragraph[${p}]: distinct opener ratio ${ratio.toFixed(2)} < ` +
            `min ${ctx.config.DISTINCT_OPENER_MIN_RATIO}`,
        );
      }
    }
  }
return verifyReadingTail1(ctx);
}
