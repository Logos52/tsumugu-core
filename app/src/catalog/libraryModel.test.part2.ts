import {
  bandNum,
  defaultLibState,
  descriptiveTitle,
  formatLabel,
  groupCatalogByLesson,
  hanNum,
  libStateFromHash,
  libStateToHash,
  normalizeTopic,
  passRecord,
  rankRecords,
  sortRecords,
  toReadingRecord,
  type LibState,
  type ReadingRecord,
} from "./libraryModel.js";

export function rec(partial: Partial<ReadingRecord>): ReadingRecord {
  return {
    path: "p", zh: "", rom: "", romVi: "", topic: "city", band: "A1", tocfl: "TOCFL 1",
    bind: "", mins: 3, audio: false, cov: 90, covReal: false, newN: 3, status: "in",
    rec: true, added: 0, nw: [], ex: "", fmt: "短文", len: 100, book: null, lesson: null,
    descTitle: "", ...partial,
  };
}
