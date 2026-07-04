import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PreparedContent } from "@tsumugu/engine";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PKG_ROOT, "..", "..");
const PRIVATE_DIR = join(REPO_ROOT, "private");

export interface LessonTarget {
  lessonId: string;
  /** Cumulative band ceiling, e.g. "TOCFL-3". */
  ceiling: string;
  /** Every word allowed without being new-target. */
  cumulativeVocab: Set<string>;
  /** Lesson NEW words (must appear + recycle). */
  newVocab: string[];
  /** Lesson NEW grammar point ids/markers. */
  newGrammar: string[];
}

export interface LessonTargetJson {
  lessonId: string;
  ceiling: string;
  cumulativeVocab: string[];
  newVocab: string[];
  newGrammar: string[];
}

/** ACCC-binding facet on prepared content (metadata only; WO-CORE-2 finalizes). */
export interface AcccBindingFacet {
  lessonId: string;
  ceiling: string;
  cumulativeVocab?: string[];
  newVocab?: string[];
  newGrammar?: string[];
}

export type PreparedWithBinding = PreparedContent & {
  acccBinding?: AcccBindingFacet;
};

const DEFAULT_FIXTURE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../test/fixtures/clean.target.json",
);

function targetFromJson(data: LessonTargetJson): LessonTarget {
  return {
    lessonId: data.lessonId,
    ceiling: data.ceiling,
    cumulativeVocab: new Set(data.cumulativeVocab),
    newVocab: data.newVocab,
    newGrammar: data.newGrammar,
  };
}

/**
 * Loader — reads reconciled lesson target JSON fixture or authoritative via resolveLessonTargetFromAuthoritative.
 * Uses WO-CORE-3 authoritative lesson → {vocab, grammar} (FINAL/merged + dangdai.csv).
 */
export function loadLessonTarget(path: string = DEFAULT_FIXTURE): LessonTarget {
  if (!existsSync(path)) {
    throw new Error(`lesson target fixture not found: ${path}`);
  }
  const data = JSON.parse(readFileSync(path, "utf8")) as LessonTargetJson;
  return targetFromJson(data);
}

/** Sidecar convention: `<reading>.target.json` beside `<reading>.prepared.json`. */
export function targetSidecarPath(preparedPath: string): string {
  return preparedPath.replace(/\.prepared\.json$/i, ".target.json");
}

/** Minimal parsers adapted for authoritative gate targets (vocab csv + reconciled grammar). */
function parseCsvRow(line: string): string[] {
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

function loadVocabRows(csvPath: string): Array<{ book: number; lesson: number; traditional: string }> {
  if (!existsSync(csvPath)) return [];
  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const rows: Array<{ book: number; lesson: number; traditional: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvRow(lines[i]!);
    if (fields.length < 2) continue;
    const coords = parseVocabId(fields[0]!.trim());
    const trad = fields[1]!.trim();
    if (coords && trad) rows.push({ book: coords.book, lesson: coords.lesson, traditional: trad });
  }
  return rows;
}

interface GrammarPointLite {
  book: number;
  lesson: number;
  cumulative_through: string;
  name_zh: string;
  tocfl_band?: string;
}

function loadGrammarMarkers(grammarPath: string, fallbackPath?: string): GrammarPointLite[] {
  const tryPath = (p: string) => {
    if (!existsSync(p)) return null;
    try {
      const j = JSON.parse(readFileSync(p, "utf8"));
      const pts = Array.isArray(j.points) ? (j.points as GrammarPointLite[]) : null;
      return pts && pts.length > 0 ? pts : null;
    } catch {
      return null;
    }
  };
  const pts = tryPath(grammarPath) ?? (fallbackPath ? tryPath(fallbackPath) : null) ?? [];
  return pts;
}

export interface ResolveAuthOptions {
  vocabCsvPath?: string;
  grammarIndexPath?: string;
  grammarFallbackPath?: string;
}

export function resolveLessonTargetFromAuthoritative(
  ref: string | { book: number; lesson: number },
  opts: ResolveAuthOptions = {},
): LessonTarget {
  // parse ref to lessonId + ordinals
  let book: number, lesson: number, lessonId: string;
  if (typeof ref === "object") {
    book = ref.book;
    lesson = ref.lesson;
    lessonId = `b${book}l${String(lesson).padStart(2, "0")}`;
  } else {
    const m = ref.trim().toLowerCase().match(/^b(\d+)l(\d+)$/);
    if (!m) throw new Error(`unknown lesson id: ${ref}`);
    book = Number(m[1]);
    lesson = Number(m[2]);
    lessonId = `b${book}l${String(lesson).padStart(2, "0")}`;
  }
  const targetOrdinal = book * 100 + lesson;

  const csvPath = opts.vocabCsvPath ?? join(PRIVATE_DIR, "dangdai-vocab", "dangdai.csv");
  const gPath = opts.grammarIndexPath ?? join(PRIVATE_DIR, "dangdai-grammar-index.FINAL.json");
  const gFb = opts.grammarFallbackPath ?? join(PRIVATE_DIR, "dangdai-grammar-index.merged.json");

  const vocabRows = loadVocabRows(csvPath);
  const cumulVocabArr: string[] = [];
  const newVocabArr: string[] = [];
  for (const r of vocabRows) {
    const ord = r.book * 100 + r.lesson;
    if (ord > targetOrdinal) continue;
    cumulVocabArr.push(r.traditional);
    if (r.book === book && r.lesson === lesson) newVocabArr.push(r.traditional);
  }
  if (cumulVocabArr.length === 0) {
    throw new Error(`unknown lesson id: ${lessonId}`);
  }

  const gpts = loadGrammarMarkers(gPath, gFb);
  const newGr: string[] = [];
  let maxBand = "A";
  for (const p of gpts) {
    const pOrd = (() => {
      const mm = (p.cumulative_through || "").match(/b(\d+)l(\d+)/i);
      return mm ? Number(mm[1]) * 100 + Number(mm[2]) : 0;
    })();
    if (pOrd > targetOrdinal) continue;
    if (p.book === book && p.lesson === lesson) {
      if (p.name_zh) newGr.push(p.name_zh);
    }
    if (p.tocfl_band && ["B", "C"].includes(p.tocfl_band) && pOrd <= targetOrdinal) {
      if (p.tocfl_band === "C") maxBand = "C";
      else if (maxBand !== "C" && p.tocfl_band === "B") maxBand = "B";
    }
  }

  const ceiling = maxBand === "C" ? "TOCFL-4" : maxBand === "B" ? "TOCFL-3" : "TOCFL-2";

  return {
    lessonId,
    ceiling,
    cumulativeVocab: new Set(cumulVocabArr),
    newVocab: newVocabArr,
    newGrammar: newGr,
  };
}

/**
 * Resolve lesson target from the reading's ACCC-binding facet or a sidecar fixture.
 * Full: if neither and lessonId parseable from content title or binding stub, falls back to
 * authoritative resolve from reconciled index + vocab (WO-CORE-3).
 */
export function resolveLessonTarget(
  content: PreparedContent,
  preparedPath?: string,
): LessonTarget {
  const extended = content as PreparedWithBinding;
  if (extended.acccBinding) {
    const b = extended.acccBinding;
    return {
      lessonId: b.lessonId,
      ceiling: b.ceiling,
      cumulativeVocab: new Set(b.cumulativeVocab ?? []),
      newVocab: b.newVocab ?? [],
      newGrammar: b.newGrammar ?? [],
    };
  }

  if (preparedPath) {
    const sidecar = targetSidecarPath(preparedPath);
    if (existsSync(sidecar)) return loadLessonTarget(sidecar);
  }

  // Full authoritative resolution support for pipeline/gen (lessonId from title e.g. "ACCC b4l03")
  const title = (content as any).title || (content as any).core?.binding || "";
  const m = /b(\d+)l(\d+)/i.exec(title);
  if (m) {
    try {
      return resolveLessonTargetFromAuthoritative({ book: Number(m[1]), lesson: Number(m[2]) });
    } catch {}
  }

  throw new Error(
    "no lesson target: add acccBinding facet to prepared content or a .target.json sidecar",
  );
}