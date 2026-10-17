import { dirname, join } from "node:path";

import { fileURLToPath } from "node:url";

import type { GrammarIndexFile, GrammarPoint } from "./grammar-index-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname, "..", "..", "..");

export const PRIVATE_DIR = join(REPO_ROOT, "private");

export interface LessonTarget {
  lesson: string;
  cumulativeVocab: string[];
  cumulativeGrammar: GrammarPoint[];
  newVocab: string[];
  newGrammar: GrammarPoint[];
  cumulativeHanzi: string[];
}

interface LessonCoords {
  book: number;
  lesson: number;
  canonical: string;
}

export interface ResolveLessonTargetOptions {
  vocabCsvPath?: string;
  grammarIndexPath?: string;
  grammarFallbackPath?: string;
}

export interface VocabRow {
  id: string;
  book: number;
  lesson: number;
  traditional: string;
}

export const HAN_RE = /\p{Script=Han}/u;

export function parseLessonRef(
  ref: string | { book: number; lesson: number },
): LessonCoords {
  if (typeof ref === "object") {
    const { book, lesson } = ref;
    if (!Number.isInteger(book) || !Number.isInteger(lesson) || book < 1 || lesson < 1) {
      throw new Error(`unknown lesson id: b${book}l${lesson}`);
    }
    return {
      book,
      lesson,
      canonical: `b${book}l${String(lesson).padStart(2, "0")}`,
    };
  }

  const m = ref.trim().toLowerCase().match(/^b(\d+)l(\d+)$/);
  if (!m) {
    throw new Error(`unknown lesson id: ${ref}`);
  }
  const book = Number(m[1]);
  const lesson = Number(m[2]);
  if (!Number.isFinite(book) || !Number.isFinite(lesson) || book < 1 || lesson < 1) {
    throw new Error(`unknown lesson id: ${ref}`);
  }
  return {
    book,
    lesson,
    canonical: `b${book}l${String(lesson).padStart(2, "0")}`,
  };
}
