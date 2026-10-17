import {
  EXTRACTION_SOURCES,
  type ExtractionSource,
  type GrammarIndexFile,
  type GrammarPoint,
  type LessonAssignmentConflict,
  type MergedGrammarIndexFile,
  type MergedGrammarPoint,
  type ReconcileSummary,
} from "./grammar-index-types.js";

export const SOURCE_PRIORITY: Record<ExtractionSource, number> = {
  qwen: 5,
  v2: 4,
  composer: 3,
  grok: 2,
  json: 1,
};

export interface TaggedPoint {
  source: ExtractionSource;
  point: GrammarPoint;
  key: string;
}
