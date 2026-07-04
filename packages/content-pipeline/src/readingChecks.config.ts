// CLAUDE-OWNED THRESHOLDS — adjudicate with Wedge before first production wave.
// These are starting proposals seeded from example_checks.py + PRD §6.4; not yet production-approved.
// CI_FAIL_CLOSED remains false (in-band via checkDefLevel is the binding band check; CI vs anonymous store is informational).
// See handoff WO-CORE-1 and PRD §6.4.

/** Coverage floor for the CI band metric (engine DEFAULT_CI_TARGET). */
export const CI_BAND_TARGET = 0.95;

/** Tokens above ceiling beyond declared new-target that still PASS (0 = fail-closed). */
export const ABOVE_BAND_ALLOWANCE = 0;

/** Each lesson NEW word must recur at least this many times (scoreCI recycle threshold). */
export const NEW_TARGET_RECYCLE_MIN = 3;

/** Minimum number of the lesson's newVocab words that a single reading must "touch" (appear ≥1×). 
 * Relaxed from "all" so multiple readings per lesson can cover different subsets of the chapter's new vocab.
 * 1 = touches the set (at least one); higher for stricter per-reading coverage. */
export const MIN_NEW_VOCAB_TOUCHED = 1;

/** Shortest acceptable sentence, Han characters. */
export const SENTENCE_MIN_HAN = 4;

/** Longest sentence Han count before a run-on flag. */
export const SENTENCE_MAX_HAN = 60;

/** max − min sentence Han-count across the reading. */
export const READING_LENGTH_SPREAD_MIN = 8;

/** Max share of any single content word within a paragraph. */
export const PARA_REPETITION_MAX_RATIO = 0.3;

/** Distinct sentence-opening bigrams / sentences. */
export const DISTINCT_OPENER_MIN_RATIO = 0.6;

/** A reading must have at least this many sentences. */
export const MIN_SENTENCES = 3;

/**
 * When true, a CI score below {@link CI_BAND_TARGET} fails the gate.
 * Default false: (A) in-band coverage is the binding band check; CI against an
 * anonymous empty store is structurally low and informational only.
 */
export const CI_FAIL_CLOSED = false;

export interface ReadingChecksConfig {
  CI_BAND_TARGET: number;
  ABOVE_BAND_ALLOWANCE: number;
  NEW_TARGET_RECYCLE_MIN: number;
  MIN_NEW_VOCAB_TOUCHED: number;
  SENTENCE_MIN_HAN: number;
  SENTENCE_MAX_HAN: number;
  READING_LENGTH_SPREAD_MIN: number;
  PARA_REPETITION_MAX_RATIO: number;
  DISTINCT_OPENER_MIN_RATIO: number;
  MIN_SENTENCES: number;
  CI_FAIL_CLOSED: boolean;
}

export const DEFAULT_READING_CHECKS_CONFIG: ReadingChecksConfig = {
  CI_BAND_TARGET,
  ABOVE_BAND_ALLOWANCE,
  NEW_TARGET_RECYCLE_MIN,
  MIN_NEW_VOCAB_TOUCHED,
  SENTENCE_MIN_HAN,
  SENTENCE_MAX_HAN,
  READING_LENGTH_SPREAD_MIN,
  PARA_REPETITION_MAX_RATIO,
  DISTINCT_OPENER_MIN_RATIO,
  MIN_SENTENCES,
  CI_FAIL_CLOSED,
};