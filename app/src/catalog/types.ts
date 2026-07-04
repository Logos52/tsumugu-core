/** Enriched reading row from `__readings.json`. */

export type ReadingKind = "story" | "dialogue" | "explainer" | "byo";
export type ReadingOrigin = "generated";
export type Band = "A1" | "A2" | "B1";

/** A textbook lesson binding carried as static facet metadata. */
export interface LessonBinding {
  textbook: "accc";
  book: number;
  lesson: number;
}

export interface CatalogEntry {
  path: string;
  lang?: string;
  title?: string;
  kind: ReadingKind;
  origin: ReadingOrigin;
  band: Band;
  tocfl: 1 | 2 | 3;
  binding?: LessonBinding;
  sentences: number;
  minutes: number;
  totalWords: number;
  wordCounts: Record<string, number>;
  newWords: number;
  hasAudio: boolean;
  dateAdded: string;
  topic?: string;
  /** Optional romanized title for card display (zh + romanized). */
  titleRom?: string;
  /** Optional Vietnamese romanization of the title (Hán-Việt reading), for the VI rail. */
  titleRomVi?: string;
  /**
   * Optional pre-rendered excerpt HTML for the study-A "excerpt is the hero"
   * card. Trusted (emitted by our own content pipeline). Uses reader token
   * classes (`.w.known/.learning/.new/.nw`, `.k`). Absent → card degrades to
   * a muted placeholder line.
   */
  excerpt?: string;
  /**
   * Optional new-word samples for the study-C pedagogy-as-hero chips:
   * `[hanzi, sinoVietnamese, pinyin]`. Absent → derived from `wordCounts`
   * keys (hanzi only, empty romanization).
   */
  newWordSamples?: [string, string, string][];
  /** Optional explicit "recommended / in your band" flag from the pipeline. */
  recommended?: boolean;
}

/** Coverage band — distinct from CEFR `Band`. */
export type CoverageBand = "in-range" | "stretch" | "outgrown";

/** @deprecated Use `CoverageBand`. */
export type ReadingBand = CoverageBand;