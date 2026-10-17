import {
  grammarMarkers,
  type LessonTarget as AcccLessonTarget,
} from "../../accc/lib/lesson-target.js";
import type { LessonTarget as GateLessonTarget } from "content-pipeline/lessonTarget";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  charViHas,
  hanVietReadings,
  loadCharVi,
  loadHanViet,
  type CharViIndex,
  type HanVietIndex,
} from "content-pipeline/hanviet";
import {
  PREPARED_CONTENT_SCHEMA_V2,
  type BridgeInfo,
  type PreparedContent,
  type PrebakedEntry,
} from "@tsumugu/engine";
import { bridgeSkeleton, loadDefLevelIndex, type DefLevelIndex } from "@tsumugu/gen-qa";
import { segmentDraftAsync, segmentDraftGreedy } from "./jiebaSegment.js";
import { verifyReading } from "content-pipeline";
import { HAN_RE, defaultCeiling, parseLessonBinding, toBand, toKind, tocflFromBand } from "./dualRail.part2.js";
import type { ContentFingerprint, CoreMetadata, DualRailOptions, DualRailResult, PolyphoneCandidate, PreparedReading, VocabLookup } from "./dualRail.part2.js";
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

  return { prepared, polyphones, gateReport };
}
