import { checkDefLevel, type DefLevelViolation } from "./defLevel.js";

export interface ExampleEntryStats {
  term: string;
  exampleCount: number;
  sharedCount: number;
  overlayCount: number;
  headwordMissing: number[];
  highlightSpanErrors: { index: number; errors: string[] }[];
  exampleLevelViolations: DefLevelViolation[];
  sharedFlagErrors: string[];
  countOk: boolean;
}
