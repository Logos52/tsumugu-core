

export type ReadingKind = "story" | "dialogue" | "explainer" | "byo";
export type ReadingOrigin = "generated";
export type Band = "A1" | "A2" | "B1";


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
  
  titleRom?: string;
  
  titleRomVi?: string;
  
  excerpt?: string;
  
  newWordSamples?: [string, string, string][];
  
  recommended?: boolean;
}


export type CoverageBand = "in-range" | "stretch" | "outgrown";


export type ReadingBand = CoverageBand;