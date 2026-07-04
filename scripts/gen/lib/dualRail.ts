import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  PREPARED_CONTENT_SCHEMA_V2,
  type BridgeInfo,
  type PreparedContent,
  type PrebakedEntry,
} from "@tsumugu/engine";
import { bridgeSkeleton, loadDefLevelIndex, type DefLevelIndex } from "@tsumugu/gen-qa";
import { verifyReading } from "content-pipeline";
import {
  charViHas,
  hanVietReadings,
  loadCharVi,
  loadHanViet,
  type CharViIndex,
  type HanVietIndex,
} from "content-pipeline/hanviet";
import type { LessonTarget as GateLessonTarget } from "content-pipeline/lessonTarget";
import {
  grammarMarkers,
  type LessonTarget as AcccLessonTarget,
} from "../../accc/lib/lesson-target.js";
import type { Band, LessonBinding, ReadingKind } from "../../../app/src/catalog/types.js";
import { segmentDraftAsync, segmentDraftGreedy } from "./jiebaSegment.js";

const HAN_RE = /\p{Script=Han}/u;

export interface PolyphoneCandidate {
  word: string;
  char: string;
  readings: string[];
  chosen?: string;
  hvAmbiguous: boolean;
  /** g2pW candidate / to-integrate — not wired in v1 */
  g2pwStatus: "candidate / to-integrate";
}

/**
 * Core metadata block baked into each generated reading. Emitted in a
 * `CatalogEntry`-compatible shape (see `app/src/catalog/types.ts` +
 * `catalog/preparedMeta.ts`) so `pipeline/lib/catalogEnrich.ts` composes it
 * without a shape mismatch: object-form `binding`, numeric `tocfl` / `newWords`,
 * `topic`. The reader chrome also reads `binding.book`/`binding.lesson`.
 */
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

function toBand(s: string): Band {
  return (VALID_BANDS as readonly string[]).includes(s) ? (s as Band) : "A1";
}

function toKind(s: string): ReadingKind {
  return (VALID_KINDS as readonly string[]).includes(s) ? (s as ReadingKind) : "story";
}

/** Numeric TOCFL band the catalog indexes on (A1→1, A2→2, B1→3). */
function tocflFromBand(band: Band): 1 | 2 | 3 {
  return band === "A1" ? 1 : band === "A2" ? 2 : 3;
}

/** Parse an ACCC lesson id (`b4l03`) into object-form `LessonBinding`. */
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
  /** Facet topic carried into `core.topic` (catalog search/facets). */
  topic?: string;
  vocabLookup?: Map<string, VocabLookup>;
  hanviet?: HanVietIndex;
  charVi?: CharViIndex;
  defLevelIndex?: DefLevelIndex;
  polyphoneLogPath?: string;
  knownWords?: Set<string>;
  /** Segmentation strategy. "jieba" (default) = jieba-wasm with greedy refinement;
   *  "greedy" = pure longest-match against the lesson lexicon (correct for this
   *  Traditional corpus, where jieba's Simplified-oriented dict over-fragments). */
  segmenter?: "jieba" | "greedy";
}

export interface DualRailResult {
  prepared: PreparedReading;
  polyphones: PolyphoneCandidate[];
  gateReport: Awaited<ReturnType<typeof verifyReading>>;
}

/** Greedy longest-match segmentation (sync fallback / tests). */
export const segmentDraft = segmentDraftGreedy;

function defaultCeiling(target: AcccLessonTarget): string {
  const bands = target.newGrammar
    .map((g) => g.tocfl_band)
    .filter(Boolean)
    .sort();
  const band = bands.at(-1) ?? "B";
  const ordinals: Record<string, string> = { A: "TOCFL-2", B: "TOCFL-3", C: "TOCFL-4" };
  return ordinals[band] ?? "TOCFL-3";
}

function gateTargetFromAccc(target: AcccLessonTarget): GateLessonTarget {
  return {
    lessonId: target.lesson,
    ceiling: defaultCeiling(target),
    cumulativeVocab: new Set(target.cumulativeVocab),
    newVocab: target.newVocab,
    newGrammar: grammarMarkers(target.newGrammar),
  };
}

function appendPolyphoneLog(path: string, rows: PolyphoneCandidate[]): void {
  if (!rows.length) return;
  mkdirSync(dirname(path), { recursive: true });
  for (const row of rows) {
    appendFileSync(path, `${JSON.stringify(row)}\n`, "utf8");
  }
}

function buildBridgeForWord(
  word: string,
  hanviet: HanVietIndex,
  charVi: CharViIndex,
  polyphones: PolyphoneCandidate[],
): { bridge: BridgeInfo; hvAmbiguous: boolean } {
  const morphemes: NonNullable<BridgeInfo["morphemes"]> = [];
  let hvAmbiguous = false;

  for (const ch of word) {
    if (!HAN_RE.test(ch)) continue;
    const readings = hanVietReadings(hanviet, ch);
    if (readings.length === 0) continue;

    if (readings.length > 1) {
      hvAmbiguous = true;
      polyphones.push({
        word,
        char: ch,
        readings,
        hvAmbiguous: true,
        g2pwStatus: "candidate / to-integrate",
      });
      morphemes.push({
        surface: ch,
        etymon: ch,
        reading: "",
      });
      continue;
    }

    const reading = readings[0]!;
    morphemes.push({ surface: ch, etymon: ch, reading });
    if (!charViHas(charVi, ch)) {
      // Ungrounded — still surface for gate to fail closed.
      morphemes[morphemes.length - 1]!.reading = reading;
    }
  }

  const bridgeReading = morphemes.map((m) => m.reading).filter(Boolean).join(" ");
  const bridge: BridgeInfo = {
    ...bridgeSkeleton("zh-Hant"),
    etymon: word,
    bridgeReading: bridgeReading || undefined,
    morphemes,
    confidence: hvAmbiguous ? 0.2 : 0.8,
  };

  return { bridge, hvAmbiguous };
}

function buildGlossaryEntry(
  word: string,
  lookup: VocabLookup | undefined,
  hanviet: HanVietIndex,
  charVi: CharViIndex,
  polyphones: PolyphoneCandidate[],
): PrebakedEntry {
  const { bridge, hvAmbiguous } = buildBridgeForWord(word, hanviet, charVi, polyphones);
  const gloss = lookup?.meaning?.trim() || word;
  const reading = lookup?.pinyin?.trim();

  const entry: PrebakedEntry = {
    term: word,
    gloss,
    definitions: {
      en: { gloss },
      zh: {
        gloss,
        level: "TOCFL-3",
        monolingual: true,
      },
    },
    bridge,
  };
  if (reading) entry.reading = reading;
  if (hvAmbiguous) {
    (entry as PrebakedEntry & { hvAmbiguous?: boolean }).hvAmbiguous = true;
  }
  return entry;
}

/**
 * Turn an accepted draft into PREPARED_CONTENT_SCHEMA_V2 with EN+VI rails baked.
 * Polyphone chars are flagged — g2pW is candidate / to-integrate only (v1).
 */
export async function populateDualRail(opts: DualRailOptions): Promise<DualRailResult> {
  const segmentLexicon =
    opts.knownWords ??
    new Set([...opts.lessonTarget.cumulativeVocab, ...opts.lessonTarget.newVocab]);
  const tokens =
    opts.segmenter === "greedy"
      ? segmentDraftGreedy(opts.draft, segmentLexicon)
      : await segmentDraftAsync(opts.draft, segmentLexicon);
  const wordSet = new Set(tokens.filter((t) => t.isWord).map((t) => t.text));
  const newVocabSet = new Set(opts.lessonTarget.newVocab);
  /** Prior-lesson cumulative — new-target words still need rails baked. */
  const priorKnown = new Set(
    opts.lessonTarget.cumulativeVocab.filter((w) => !newVocabSet.has(w)),
  );

  const hanviet = opts.hanviet ?? loadHanViet();
  const charVi = opts.charVi ?? loadCharVi();
  let defLevelIndex = opts.defLevelIndex;
  if (!defLevelIndex) {
    try {
      defLevelIndex = loadDefLevelIndex();
    } catch {
      // private pack absent (common in this workspace); verifyReading will surface
      // "defLevelIndex not provided" reason and gate will fail-closed on in-band.
    }
  }
  const polyphones: PolyphoneCandidate[] = [];
  const glossary: Record<string, PrebakedEntry> = {};

  for (const word of wordSet) {
    if (priorKnown.has(word)) continue;
    const lookup = opts.vocabLookup?.get(word);
    glossary[word] = buildGlossaryEntry(word, lookup, hanviet, charVi, polyphones);
  }

  const fingerprint: ContentFingerprint = {
    vocab: [...wordSet].sort((a, b) => a.localeCompare(b, "zh-Hant")),
    grammar: grammarMarkers(opts.lessonTarget.newGrammar),
  };

  const prepared: PreparedReading = {
    schema: PREPARED_CONTENT_SCHEMA_V2,
    lang: "zh-Hant",
    title: opts.title ?? `ACCC ${opts.lessonTarget.lesson}`,
    tokens,
    glossary,
    core: ((): CoreMetadata => {
      const band = toBand(opts.band);
      const binding = parseLessonBinding(opts.lessonTarget.lesson);
      return {
        band,
        tocfl: tocflFromBand(band),
        kind: toKind(opts.kind),
        newWords: opts.lessonTarget.newVocab.length,
        ...(binding ? { binding } : {}),
        ...(opts.topic ? { topic: opts.topic } : {}),
      };
    })(),
    fingerprint,
    acccBinding: {
      lessonId: opts.lessonTarget.lesson,
      ceiling: defaultCeiling(opts.lessonTarget),
      cumulativeVocab: opts.lessonTarget.cumulativeVocab,
      newVocab: opts.lessonTarget.newVocab,
      newGrammar: grammarMarkers(opts.lessonTarget.newGrammar),
    },
  };

  if (opts.polyphoneLogPath) {
    appendPolyphoneLog(opts.polyphoneLogPath, polyphones);
  }

  const gateReport = await verifyReading({
    content: prepared,
    target: gateTargetFromAccc(opts.lessonTarget),
    hanviet,
    charVi,
    ...(defLevelIndex ? { defLevelIndex } : {}),
  });

  // Mechanical support for bridge verification + polyphone handling (labels only; g2pW candidate / to-integrate, no integration).
  // Ungrounded bridges + ambiguous polyphones surfaced to gateReport + polyphone-candidates.jsonl; fail-closed.
  return { prepared, polyphones, gateReport };
}