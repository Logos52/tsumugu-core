#!/usr/bin/env tsx
import { mainTail1 } from "./convert-drafts.fns1.js";
import { mainTail2 } from "./convert-drafts.fns2.js";

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CatalogEntry, LessonBinding, ReadingKind } from "../../app/src/catalog/types.js";
import { enrichCatalogEntry } from "../../pipeline/lib/catalogEnrich.js";
import {
  parseCsvRow,
  parseLessonRef,
  resolveLessonTarget,
} from "../accc/lib/lesson-target.js";
import { populateDualRail, type PreparedReading } from "../gen/lib/dualRail.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const DRAFTS_DIR = join(REPO_ROOT, "mockups", "drafts");
const HIGHLIGHTS_PATH = join(REPO_ROOT, "mockups", "lesson-highlights.json");
const VOCAB_CSV = join(REPO_ROOT, "private", "dangdai-vocab", "dangdai.csv");
const OUT_DIR = join(REPO_ROOT, "out", "companion");
const READINGS_OUT = join(OUT_DIR, "readings");
const POLYPHONE_LOG = join(OUT_DIR, "polyphone-candidates.jsonl");


type CompanionEntry = Omit<CatalogEntry, "origin"> & { origin: "companion" };


interface AppCore {
  band: "A1" | "A2" | "B1";
  tocfl: 1 | 2 | 3;
  kind: ReadingKind;
  newWords: number;
  binding: LessonBinding;
  topic?: string;
}
type AppPrepared = Omit<PreparedReading, "core"> & { core: AppCore };

interface DraftReading {
  id: string;
  format: string;
  text: string;
}
interface HighlightEntry {
  title?: string;
  theme?: string;
}

const KIND_MAP: Record<string, ReadingKind> = {
  對話: "dialogue",
  問答: "dialogue",
  自述: "story",
  短文: "story",
  日記: "story",
  比較: "story",
  報導: "explainer",
  廣播: "explainer",
};
function kindForFormat(format: string): ReadingKind {
  return KIND_MAP[format] ?? "story";
}


function vocabSurfaceForms(entry: string): string[] {
  const m = /^(.+?)（＝(.+?)）$/.exec(entry);
  return m ? [m[1]!, m[2]!] : [entry];
}

const CJK_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
function cjkOrdinal(n: number): string {
  if (n >= 0 && n < CJK_DIGITS.length) return CJK_DIGITS[n]!;
  return String(n);
}

function bandForBook(book: number): { band: "A1" | "A2" | "B1"; tocfl: 1 | 2 | 3 } {
  if (book <= 1) return { band: "A1", tocfl: 1 };
  if (book === 2) return { band: "A2", tocfl: 2 };
  return { band: "B1", tocfl: 3 }; 
}


function loadVocab(): { lookup: Map<string, { pinyin?: string; meaning?: string }>; names: Set<string> } {
  const raw = readFileSync(VOCAB_CSV, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const lookup = new Map<string, { pinyin?: string; meaning?: string }>();
  const names = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvRow(lines[i]!);
    if (f.length < 2) continue;
    const trad = (f[1] ?? "").trim();
    if (!trad) continue;
    const pinyin = (f[3] ?? "").trim() || undefined;
    const meaning = (f[5] ?? "").trim() || undefined;
    const tags = (f[8] ?? "").trim();
    for (const form of vocabSurfaceForms(trad)) {
      if (!lookup.has(form)) lookup.set(form, { pinyin, meaning });
    }
    if (/Character Name/i.test(tags)) names.add(trad);
  }
  return { lookup, names };
}

interface ReadingRecord {
  unit: string;
  readingId: string;
  format: string;
  file: string; 
  title: string;
  book: number;
  lesson: number;
  gate: {
    pass: boolean;
    reasons: string[];
    achievedLevel: string;
    ciMeasured: number;
    aboveBandTokens: { word: string; band: string }[];
    newTargetRecycle: { word: string; count: number; ok: boolean }[];
    scriptLeaks: { before: string; after: string }[];
    bridgeFailures: { word: string; etymon?: string; reason: string }[];
    polyphoneRisks: { word: string; char: string; reason: string }[];
  };
  polyphoneCount: number;
  inbandCouldRun: boolean;
  error?: string;
}


const CHECK_BUCKETS = [
  "prose",
  "newVocab",
  "newGrammar",
  "ci",
  "glossary",
  "script",
  "vi-rail",
  "bridge",
  "polyphone",
  "paragraph",
] as const;
type CheckBucket = (typeof CHECK_BUCKETS)[number];

function bucketOf(reason: string): CheckBucket {
  const colon = reason.indexOf(":");
  const head = colon >= 0 ? reason.slice(0, colon) : reason;
  if (head.startsWith("paragraph[")) return "paragraph";
  return (CHECK_BUCKETS as readonly string[]).includes(head)
    ? (head as CheckBucket)
    : "prose";
}

async function main(): Promise<void> {
const ctx: any = {};

  ctx.rmSync = rmSync; ctx.OUT_DIR = OUT_DIR; ctx.mkdirSync = mkdirSync; ctx.READINGS_OUT = READINGS_OUT; ctx.readFileSync = readFileSync; ctx.HIGHLIGHTS_PATH = HIGHLIGHTS_PATH; ctx.loadVocab = loadVocab; ctx.readdirSync = readdirSync; ctx.DRAFTS_DIR = DRAFTS_DIR; ctx.parseLessonRef = parseLessonRef; ctx.join = join; ctx.resolveLessonTarget = resolveLessonTarget; ctx.vocabSurfaceForms = vocabSurfaceForms; ctx.bandForBook = bandForBook; ctx.cjkOrdinal = cjkOrdinal; ctx.populateDualRail = populateDualRail; ctx.kindForFormat = kindForFormat; ctx.POLYPHONE_LOG = POLYPHONE_LOG; ctx.writeFileSync = writeFileSync; ctx.enrichCatalogEntry = enrichCatalogEntry; ctx.CHECK_BUCKETS = CHECK_BUCKETS; ctx.bucketOf = bucketOf;
return mainTail2(ctx);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
