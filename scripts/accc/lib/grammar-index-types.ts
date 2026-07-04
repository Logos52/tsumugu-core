export const EXTRACTION_SOURCES = ["json", "grok", "composer", "v2", "qwen"] as const;

export type ExtractionSource = (typeof EXTRACTION_SOURCES)[number];

export interface SourceRef {
  pdf: string;
  page: number;
}

export interface GrammarPoint {
  pattern_id: string;
  name_zh: string;
  name_pinyin: string;
  structure_template: string;
  function_tag: string;
  book: number;
  lesson: number;
  cumulative_through: string;
  source_ref: SourceRef;
  taxonomy_id: string | null;
  tocfl_band: string;
  confidence: string;
  extraction_method: string;
  later_appearances: Array<{ book: number; lesson: number }>;
}

export interface GrammarIndexFile {
  source: string;
  edition: string;
  extracted: string;
  points: GrammarPoint[];
  reconciled?: boolean;
}

export interface MergedGrammarPoint extends GrammarPoint {
  sources: ExtractionSource[];
  agreement: number;
  status: "confirmed" | "review";
  lesson_assignments?: Array<{ book: number; lesson: number; sources: ExtractionSource[] }>;
}

export interface MergedGrammarIndexFile {
  source: string;
  edition: string;
  extracted: string;
  reconciled: true;
  points: MergedGrammarPoint[];
}

export interface LessonAssignmentConflict {
  name_zh: string;
  structure_template: string;
  assignments: Array<{ book: number; lesson: number; sources: ExtractionSource[] }>;
  sources: ExtractionSource[];
}

export interface ReconcileSummary {
  totalPoints: number;
  bySource: Record<ExtractionSource, number>;
  confirmed: number;
  review: number;
  orphans: number;
  lessonConflicts: number;
  byBookLesson: Array<{ book: number; lesson: number; count: number }>;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}