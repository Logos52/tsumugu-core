import {
  destinationLang,
  laterWins,
  rowsFromVocabJson,
  splitLearningList,
  type ReadyRow,
  type VocabImportStore,
  type VocabStatus,
} from "./vocabImport.parse.js";

export type { VocabEntryView, VocabImportStore, VocabStatus } from "./vocabImport.parse.js";
export { VocabImportError, splitLearningList } from "./vocabImport.parse.js";

export interface VocabImportOptions {
  clock?: { now(): Date };
}

export interface VocabImportResult {
  applied: number;
  unchanged: number;
}

const PASTE_KEEP = new Set<string>(["4", "known"]);

function applyRow(store: VocabImportStore, row: ReadyRow, clock: { now(): Date } | undefined): boolean {
  const current = store.get(row.lang, row.word);
  if (current && current.status === row.status) return false;
  if (current && !laterWins(row.updatedAt, current.statusUpdatedAt)) return false;
  store.setStatus(row.lang, row.word, row.status, clock, {
    source: "import",
    origin: "import",
    ...(row.updatedAt ? { at: row.updatedAt } : {}),
  });
  return true;
}

export function importVocabJson(
  text: string,
  store: VocabImportStore,
  opts?: VocabImportOptions,
): VocabImportResult {
  const rows = rowsFromVocabJson(text, store);
  let applied = 0;
  let unchanged = 0;
  for (const row of rows) {
    if (applyRow(store, row, opts?.clock)) applied += 1;
    else unchanged += 1;
  }
  return { applied, unchanged };
}

export function importVocabList(
  text: string,
  store: VocabImportStore,
  opts?: VocabImportOptions,
): VocabImportResult {
  const lang = destinationLang(store);
  let applied = 0;
  let unchanged = 0;
  for (const word of splitLearningList(text)) {
    const current = store.get(lang, word);
    if (current && (current.status === "1" || PASTE_KEEP.has(current.status))) {
      unchanged += 1;
      continue;
    }
    store.setStatus(lang, word, "1" satisfies VocabStatus, opts?.clock, {
      source: "import",
      origin: "import",
    });
    applied += 1;
  }
  return { applied, unchanged };
}
