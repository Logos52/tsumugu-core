import type { PreparedContent } from "@tsumugu/engine";
import type { Band, LessonBinding, ReadingKind } from "../catalog/types.js";

/** Core-side superset of PreparedContent — facet metadata for the reader shell. */
export interface CoreFacetMeta {
  band: Band;
  tocfl: 1 | 2 | 3;
  kind: ReadingKind;
  newWords: number;
  binding?: LessonBinding;
  /** Lesson new-target headwords → `.nw` chips in prose. */
  newWordList?: string[];
}

export interface CorePreparedContent extends PreparedContent {
  core?: CoreFacetMeta;
}

export function isNewTargetWord(content: CorePreparedContent, word: string): boolean {
  return content.core?.newWordList?.includes(word) ?? false;
}

export function newTargetCount(content: CorePreparedContent): number {
  return content.core?.newWordList?.length ?? content.core?.newWords ?? 0;
}