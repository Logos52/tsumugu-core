export type VocabStatus = "1" | "2" | "3" | "4" | "known" | "ignored";

export interface VocabEntryView {
  lang: string;
  word: string;
  status: string;
  statusUpdatedAt?: string;
}

export interface VocabImportStore {
  all(): readonly VocabEntryView[];
  get(lang: string, word: string): VocabEntryView | undefined;
  setStatus(
    lang: string,
    word: string,
    status: VocabStatus,
    clock?: { now(): Date },
    prov?: { source?: string; origin?: string; at?: string },
  ): unknown;
}

export class VocabImportError extends Error {
  readonly word?: string;
  readonly statusText?: string;

  constructor(message: string, word?: string, statusText?: string) {
    super(message);
    this.name = "VocabImportError";
    this.word = word;
    this.statusText = statusText;
  }
}

const ALIAS: Record<string, VocabStatus> = {
  l1: "1",
  l2: "2",
  l3: "3",
  l4: "4",
  "learning-1": "1",
  "learning-2": "2",
  "learning-3": "3",
  "learning-4": "4",
};

interface RawRow {
  lang?: string;
  word: string;
  status: VocabStatus;
  updatedAt?: string;
}

export interface ReadyRow {
  lang: string;
  word: string;
  status: VocabStatus;
  updatedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function declaredLang(doc: Record<string, unknown>): string | undefined {
  return typeof doc.lang === "string" && doc.lang.length > 0 ? doc.lang : undefined;
}

function isCanonical(status: string): status is VocabStatus {
  return status === "1" || status === "2" || status === "3" || status === "4" || status === "known" || status === "ignored";
}

function canonicalStatus(word: string, status: unknown): VocabStatus {
  const shown = JSON.stringify(status);
  if (typeof status === "string") {
    if (isCanonical(status)) return status;
    const mapped = ALIAS[status];
    if (mapped) return mapped;
  }
  throw new VocabImportError(`unknown status for ${word}: ${shown}`, word, shown);
}

function readUpdatedAt(word: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new VocabImportError(`updatedAt for ${word} is not a timestamp`, word, String(value));
  }
  return value;
}

function parseEntry(entry: unknown, index: number): RawRow {
  if (!isRecord(entry)) throw new VocabImportError(`entry ${index} is not an object`);
  if (typeof entry.word !== "string" || entry.word.length === 0) {
    throw new VocabImportError(`entry ${index} is missing word`);
  }
  return {
    lang: typeof entry.lang === "string" && entry.lang.length > 0 ? entry.lang : undefined,
    word: entry.word,
    status: canonicalStatus(entry.word, entry.status),
    updatedAt: readUpdatedAt(entry.word, entry.updatedAt),
  };
}

function readDocument(raw: unknown): { declared?: string; entries: unknown[] } {
  if (Array.isArray(raw)) throw new VocabImportError("bare array is not a v1 document");
  if (!isRecord(raw)) throw new VocabImportError("document is not a v1 object");
  if (typeof raw.schema === "number") {
    if (raw.schema !== 3) throw new VocabImportError(`user document schema ${raw.schema} is not 3`);
    if (!isRecord(raw.store)) throw new VocabImportError("user document has no store");
    if (raw.store.schema !== "tsumugu/word-store@2") {
      throw new VocabImportError("word-store schema is not tsumugu/word-store@2");
    }
    if (!Array.isArray(raw.store.entries)) throw new VocabImportError("word-store entries are missing");
    return { declared: declaredLang(raw) ?? declaredLang(raw.store), entries: raw.store.entries };
  }
  if (raw.schema === "tsumugu/word-store@2") {
    if (!Array.isArray(raw.entries)) throw new VocabImportError("word-store entries are missing");
    return { declared: declaredLang(raw), entries: raw.entries };
  }
  throw new VocabImportError("document is not word-store@2 or user document schema 3");
}

export function destinationLang(store: VocabImportStore): string {
  const langs = new Set<string>();
  for (const entry of store.all()) {
    if (entry.lang) langs.add(entry.lang);
  }
  if (langs.size !== 1) return "zh-Hant";
  return langs.values().next().value ?? "zh-Hant";
}

function agreedEntryLang(rows: readonly RawRow[]): string | undefined {
  let agreed: string | undefined;
  for (const row of rows) {
    if (!row.lang) continue;
    if (agreed === undefined) agreed = row.lang;
    else if (agreed !== row.lang) return undefined;
  }
  return agreed;
}

function withLang(rows: readonly RawRow[], declared: string | undefined, store: VocabImportStore): ReadyRow[] {
  const fallback = declared ?? agreedEntryLang(rows) ?? destinationLang(store);
  return rows.map((row) => ({
    lang: row.lang ?? fallback,
    word: row.word,
    status: row.status,
    updatedAt: row.updatedAt,
  }));
}

function clockMs(iso: string | undefined): number | null {
  if (iso === undefined) return null;
  return Date.parse(iso);
}

export function laterWins(nextAt: string | undefined, prevAt: string | undefined): boolean {
  const next = clockMs(nextAt);
  const prev = clockMs(prevAt);
  if (next === null && prev === null) return true;
  if (next === null) return false;
  if (prev === null) return true;
  return next >= prev;
}

function collapse(rows: readonly ReadyRow[]): ReadyRow[] {
  const order: string[] = [];
  const byKey = new Map<string, ReadyRow>();
  for (const row of rows) {
    const key = `${row.lang}\u0000${row.word}`;
    const prev = byKey.get(key);
    if (!prev) {
      order.push(key);
      byKey.set(key, row);
      continue;
    }
    if (laterWins(row.updatedAt, prev.updatedAt)) byKey.set(key, row);
  }
  const out: ReadyRow[] = [];
  for (const key of order) {
    const row = byKey.get(key);
    if (row) out.push(row);
  }
  return out;
}

export function splitLearningList(text: string): string[] {
  const words: string[] = [];
  for (const part of text.split(/[\n, \u3001]/)) {
    const word = part.replaceAll("\r", "");
    if (word.length > 0) words.push(word);
  }
  return words;
}

export function rowsFromVocabJson(text: string, store: VocabImportStore): ReadyRow[] {
  const parsed = readDocument(JSON.parse(text));
  return collapse(withLang(parsed.entries.map(parseEntry), parsed.declared, store));
}
