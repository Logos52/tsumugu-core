import {
  scoreCI,
  isKnown,
  type LanguagePack,
  type WordStore,
  type PreparedContent,
  type PrebakedEntry,
  type BridgeInfo,
  type BridgeMorpheme,
  type KnownPolicy,
  type MonoDefinition,
} from "@tsumugu/engine";

import {
  loadDefLevelIndex,
  tocflOrdinal,
  type DefLevelIndex,
} from "./defLevelData.js";

import {
  assertMonolingualSeedLicenses,
  type ProvenanceManifest,
} from "./licenseAssert.js";

import { checkDefLevel, type DefLevelViolation } from "./defLevel.js";

import { verifyExamples, type ExampleEntryStats } from "./exampleVerify.js";

export interface DefLevelEntryStats {
  term: string;
  ceiling: string;
  achievedLevel?: string;
  levelEscalated?: boolean;
  violationCount: number;
  circular: boolean;
  empty: boolean;
}

export interface VerifyOptions {
  lang: string;
  pack: LanguagePack;
  store: WordStore;
  content: PreparedContent;
  targetWords?: string[];
  ciTarget?: number;
  policy?: KnownPolicy;
  defLevelIndex?: DefLevelIndex;
  provenance?: ProvenanceManifest;
}

export interface VerifyReport {
  ciMeasured: number;
  ciTarget: number;
  meetsTarget: boolean;
  openccChanges: { before: string; after: string }[];
  openccChanged: boolean;
  missingGlossary: string[];
  recycle: { word: string; count: number; ok: boolean }[];
  defLevelViolations: DefLevelViolation[];
  defLevelByEntry: Record<string, DefLevelEntryStats>;
  zhDefCircular: string[];
  zhDefEmpty: string[];
  licenseErrors: string[];
  defLevelPassRate: number;
  exampleByEntry: Record<string, ExampleEntryStats>;
  exampleLevelViolations: DefLevelViolation[];
  exampleOverlayRecycleRatio: number | null;
  exampleErrors: boolean;
  normalized: PreparedContent;
}

export function hasUsableGlossaryGloss(entry: PrebakedEntry): boolean {
  if (entry.gloss?.trim()) return true;
  if (entry.definitions?.en?.gloss?.trim()) return true;
  if (entry.definitions?.zh?.gloss?.trim()) return true;
  return false;
}

export async function normalize(
  pack: LanguagePack,
  s: string,
  changes: { before: string; after: string }[],
): Promise<string> {
  if (!pack.scriptNormalizer || s === "") return s;
  const after = await pack.scriptNormalizer(s);
  if (after !== s) changes.push({ before: s, after });
  return after;
}

async function normalizeMonoDefinition(
  pack: LanguagePack,
  zh: MonoDefinition,
  changes: { before: string; after: string }[],
): Promise<MonoDefinition> {
  const out: MonoDefinition = {
    ...zh,
    gloss: await normalize(pack, zh.gloss, changes),
  };
  if (zh.illustration !== undefined) {
    out.illustration = await normalize(pack, zh.illustration, changes);
  }
  return out;
}

async function normalizeBridge(
  pack: LanguagePack,
  b: BridgeInfo,
  changes: { before: string; after: string }[],
): Promise<BridgeInfo> {
  const out: BridgeInfo = { ...b };
  if (b.etymon !== undefined) out.etymon = await normalize(pack, b.etymon, changes);
  if (b.bridgeReading !== undefined)
    out.bridgeReading = await normalize(pack, b.bridgeReading, changes);
  if (b.meaning !== undefined) out.meaning = await normalize(pack, b.meaning, changes);
  if (b.morphemes)
    out.morphemes = await Promise.all(
      b.morphemes.map(async (m): Promise<BridgeMorpheme> => {
        const mo: BridgeMorpheme = {
          ...m,
          surface: await normalize(pack, m.surface, changes),
          etymon: await normalize(pack, m.etymon, changes),
        };
        if (m.reading !== undefined) mo.reading = await normalize(pack, m.reading, changes);
        if (m.gloss !== undefined) mo.gloss = await normalize(pack, m.gloss, changes);
        return mo;
      }),
    );
  return out;
}

export async function normalizeEntry(
  pack: LanguagePack,
  e: PrebakedEntry,
  changes: { before: string; after: string }[],
): Promise<PrebakedEntry> {
  const out: PrebakedEntry = {
    ...e,
    term: await normalize(pack, e.term, changes),
    gloss: await normalize(pack, e.gloss, changes),
  };
  if (e.reading !== undefined) out.reading = await normalize(pack, e.reading, changes);
  if (e.explanation !== undefined)
    out.explanation = await normalize(pack, e.explanation, changes);
  if (e.definitions) {
    out.definitions = { ...e.definitions };
    if (e.definitions.en) {
      const en = { ...e.definitions.en };
      en.gloss = await normalize(pack, en.gloss, changes);
      if (en.explanation !== undefined)
        en.explanation = await normalize(pack, en.explanation, changes);
      out.definitions.en = en;
    }
    if (e.definitions.zh) {
      out.definitions.zh = await normalizeMonoDefinition(pack, e.definitions.zh, changes);
    }
  }
  if (e.examples) {
    out.examples = await Promise.all(
      e.examples.map(async (ex) => ({
        ...ex,
        text: await normalize(pack, ex.text, changes),
        translation: await normalize(pack, ex.translation, changes),
        reading:
          ex.reading !== undefined
            ? await normalize(pack, ex.reading, changes)
            : undefined,
      })),
    );
  }
  if (e.collocations) {
    out.collocations = await Promise.all(
      e.collocations.map(async (c) => ({
        ...c,
        phrase: await normalize(pack, c.phrase, changes),
        translation: await normalize(pack, c.translation, changes),
      })),
    );
  }
  if (e.bridge !== undefined) out.bridge = await normalizeBridge(pack, e.bridge, changes);
  return out;
}
