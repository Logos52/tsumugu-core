import { dirname, join, resolve } from "node:path";

import { fileURLToPath } from "node:url";

import type { PreparedContent } from "@tsumugu/engine";

import { readFileSync, existsSync } from "node:fs";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const REPO_ROOT = resolve(PKG_ROOT, "..", "..");

export const PRIVATE_DIR = join(REPO_ROOT, "private");

export interface LessonTarget {
  lessonId: string;
  
  ceiling: string;
  
  cumulativeVocab: Set<string>;
  
  newVocab: string[];
  
  newGrammar: string[];
}

export interface LessonTargetJson {
  lessonId: string;
  ceiling: string;
  cumulativeVocab: string[];
  newVocab: string[];
  newGrammar: string[];
}

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

export function loadLessonTarget(path: string = DEFAULT_FIXTURE): LessonTarget {
  if (!existsSync(path)) {
    throw new Error(`lesson target fixture not found: ${path}`);
  }
  const data = JSON.parse(readFileSync(path, "utf8")) as LessonTargetJson;
  return targetFromJson(data);
}
