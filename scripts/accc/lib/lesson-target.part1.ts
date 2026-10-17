import { existsSync, readFileSync } from "node:fs";

import type { GrammarIndexFile, GrammarPoint } from "./grammar-index-types.js";

import { dirname, join } from "node:path";

import { HAN_RE, PRIVATE_DIR, parseLessonRef } from "./lesson-target.part2.js";

import type { LessonTarget, ResolveLessonTargetOptions, VocabRow } from "./lesson-target.part2.js";

function lessonOrdinal(book: number, lesson: number): number {
  return book * 100 + lesson;
}

function ordinalFromCanonical(canonical: string): number {
  const { book, lesson } = parseLessonRef(canonical);
  return lessonOrdinal(book, lesson);
}

export function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields;
}

function parseVocabId(id: string): { book: number; lesson: number } | null {
  const m = id.match(/^B(\d+)L(\d+)-/i);
  if (!m) return null;
  return { book: Number(m[1]), lesson: Number(m[2]) };
}

function loadVocabRows(csvPath: string): VocabRow[] {
  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows: VocabRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvRow(lines[i]!);
    if (fields.length < 2) continue;
    const id = fields[0]!.trim();
    const coords = parseVocabId(id);
    if (!coords) continue;
    const traditional = fields[1]!.trim();
    if (!traditional) continue;
    rows.push({
      id,
      book: coords.book,
      lesson: coords.lesson,
      traditional,
    });
  }

  return rows;
}

function loadGrammarIndex(
  primaryPath: string,
  fallbackPath?: string,
): GrammarIndexFile {
  const tryLoad = (path: string): GrammarIndexFile => {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as GrammarIndexFile;
  };

  if (existsSync(primaryPath)) {
    const primary = tryLoad(primaryPath);
    if (primary.points.length > 0) return primary;
  }

  if (fallbackPath && existsSync(fallbackPath)) {
    return tryLoad(fallbackPath);
  }

  if (existsSync(primaryPath)) {
    return tryLoad(primaryPath);
  }

  throw new Error(`grammar index not found: ${primaryPath}`);
}

export function distinctHanzi(words: Iterable<string>): string[] {
  const chars = new Set<string>();
  for (const word of words) {
    for (const ch of word) {
      if (HAN_RE.test(ch)) chars.add(ch);
    }
  }
  return [...chars].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

export function resolveLessonTarget(
  ref: string | { book: number; lesson: number },
  options: ResolveLessonTargetOptions = {},
): LessonTarget {
  const coords = parseLessonRef(ref);
  const targetOrdinal = lessonOrdinal(coords.book, coords.lesson);

  const vocabCsvPath = options.vocabCsvPath ?? join(PRIVATE_DIR, "dangdai-vocab", "dangdai.csv");
  const grammarIndexPath =
    options.grammarIndexPath ?? join(PRIVATE_DIR, "dangdai-grammar-index.FINAL.json");
  const grammarFallbackPath =
    options.grammarFallbackPath ?? join(PRIVATE_DIR, "dangdai-grammar-index.merged.json");

  const vocabRows = loadVocabRows(vocabCsvPath);
  if (vocabRows.length === 0) {
    throw new Error(`vocab CSV empty or unreadable: ${vocabCsvPath}`);
  }

  let maxOrdinal = 0;
  for (const row of vocabRows) {
    maxOrdinal = Math.max(maxOrdinal, lessonOrdinal(row.book, row.lesson));
  }
  if (targetOrdinal > maxOrdinal) {
    throw new Error(`unknown lesson id: ${coords.canonical}`);
  }

  const cumulativeSet = new Set<string>();
  const newVocab: string[] = [];

  for (const row of vocabRows) {
    const rowOrdinal = lessonOrdinal(row.book, row.lesson);
    if (rowOrdinal > targetOrdinal) continue;
    cumulativeSet.add(row.traditional);
    if (row.book === coords.book && row.lesson === coords.lesson) {
      newVocab.push(row.traditional);
    }
  }

  if (cumulativeSet.size === 0) {
    throw new Error(`unknown lesson id: ${coords.canonical}`);
  }

  const grammarIndex = loadGrammarIndex(grammarIndexPath, grammarFallbackPath);
  const cumulativeGrammar: GrammarPoint[] = [];
  const newGrammar: GrammarPoint[] = [];

  for (const point of grammarIndex.points) {
    const pointOrdinal = ordinalFromCanonical(point.cumulative_through);
    if (pointOrdinal > targetOrdinal) continue;
    cumulativeGrammar.push(point);
    if (point.book === coords.book && point.lesson === coords.lesson) {
      newGrammar.push(point);
    }
  }

  const cumulativeVocab = [...cumulativeSet].sort((a, b) => a.localeCompare(b, "zh-Hant"));

  return {
    lesson: coords.canonical,
    cumulativeVocab,
    cumulativeGrammar,
    newVocab,
    newGrammar,
    cumulativeHanzi: distinctHanzi(cumulativeVocab),
  };
}

export function grammarMarkers(points: GrammarPoint[]): string[] {
  return points.map((p) => p.name_zh).filter(Boolean);
}
