import type { RawPreparedContent } from "@tsumugu/engine";
import type { Band, LessonBinding, ReadingKind } from "./types.js";

export interface CorePreparedMeta {
  core?: {
    band: Band;
    tocfl: 1 | 2 | 3;
    kind: ReadingKind;
    newWords: number;
    binding?: LessonBinding;
    topic?: string; // for facets + search
  };
}

export type CorePreparedContent = RawPreparedContent & CorePreparedMeta;