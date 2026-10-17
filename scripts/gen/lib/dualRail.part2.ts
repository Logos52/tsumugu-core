import type { Band, LessonBinding, ReadingKind } from "../../../app/src/catalog/types.js";

import {
  PREPARED_CONTENT_SCHEMA_V2,
  type BridgeInfo,
  type PreparedContent,
  type PrebakedEntry,
} from "@tsumugu/engine";

import {
  grammarMarkers,
  type LessonTarget as AcccLessonTarget,
} from "../../accc/lib/lesson-target.js";

import {
  charViHas,
  hanVietReadings,
  loadCharVi,
  loadHanViet,
  type CharViIndex,
  type HanVietIndex,
} from "content-pipeline/hanviet";

import { bridgeSkeleton, loadDefLevelIndex, type DefLevelIndex } from "@tsumugu/gen-qa";

import { verifyReading } from "content-pipeline";

import { segmentDraftAsync, segmentDraftGreedy } from "./jiebaSegment.js";

export const HAN_RE = /\p{Script=Han}/u;

export interface PolyphoneCandidate {
  word: string;
  char: string;
  readings: string[];
  chosen?: string;
  hvAmbiguous: boolean;
  
  g2pwStatus: "candidate / to-integrate";
}

export interface CoreMetadata {
  band: Band;
  tocfl: 1 | 2 | 3;
  kind: ReadingKind;
  newWords: number;
  binding?: LessonBinding;
  topic?: string;
}

const VALID_BANDS: readonly Band[] = ["A1", "A2", "B1"];

const VALID_KINDS: readonly ReadingKind[] = ["story", "dialogue", "explainer", "byo"];

export function toBand(s: string): Band {
  return (VALID_BANDS as readonly string[]).includes(s) ? (s as Band) : "A1";
}

export function toKind(s: string): ReadingKind {
  return (VALID_KINDS as readonly string[]).includes(s) ? (s as ReadingKind) : "story";
}

export function tocflFromBand(band: Band): 1 | 2 | 3 {
  return band === "A1" ? 1 : band === "A2" ? 2 : 3;
}

export function parseLessonBinding(lesson: string): LessonBinding | undefined {
  const m = /^b(\d+)l0*(\d+)$/i.exec(lesson.trim());
  if (!m) return undefined;
  return { textbook: "accc", book: Number(m[1]), lesson: Number(m[2]) };
}

export interface ContentFingerprint {
  vocab: string[];
  grammar: string[];
}

export type PreparedReading = PreparedContent & {
  core?: CoreMetadata;
  fingerprint?: ContentFingerprint;
  acccBinding?: {
    lessonId: string;
    ceiling: string;
    cumulativeVocab?: string[];
    newVocab?: string[];
    newGrammar?: string[];
  };
};

export interface VocabLookup {
  pinyin?: string;
  meaning?: string;
}

export interface DualRailOptions {
  draft: string;
  lessonTarget: AcccLessonTarget;
  band: string;
  kind: string;
  title?: string;
  
  topic?: string;
  vocabLookup?: Map<string, VocabLookup>;
  hanviet?: HanVietIndex;
  charVi?: CharViIndex;
  defLevelIndex?: DefLevelIndex;
  polyphoneLogPath?: string;
  knownWords?: Set<string>;
  
  segmenter?: "jieba" | "greedy";
}

export interface DualRailResult {
  prepared: PreparedReading;
  polyphones: PolyphoneCandidate[];
  gateReport: Awaited<ReturnType<typeof verifyReading>>;
}

export const segmentDraft = segmentDraftGreedy;

export function defaultCeiling(target: AcccLessonTarget): string {
  const bands = target.newGrammar
    .map((g) => g.tocfl_band)
    .filter(Boolean)
    .sort();
  const band = bands.at(-1) ?? "B";
  const ordinals: Record<string, string> = { A: "TOCFL-2", B: "TOCFL-3", C: "TOCFL-4" };
  return ordinals[band] ?? "TOCFL-3";
}
