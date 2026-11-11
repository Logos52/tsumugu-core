import { issue, type PackIssue } from "./issues.js";
import { isInteger, isNonEmptyString, isRecord } from "./shapes.js";

export const PACK = "dict-search";
export const FACETS = ["facet-band.json", "facet-component.json", "facet-phonetic.json"];

const KINDS = new Set(["c", "w", "g"]);
const BANDS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const STRING_FIELDS = ["g", "gv", "p", "py", "v", "zy"] as const;

export interface DictMeta {
  cjkShards: number;
  entryShards: number;
  entries: number;
  enLetters: string[];
  pyLetters: string[];
  viLetters: string[];
  zyLetters: string[];
}

export interface EntryPart {
  start: number;
  count: number;
}

function stringLetters(value: unknown, path: string, issues: PackIssue[]): string[] | null {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    issues.push(issue(PACK, path, "letter list must be an array of non-empty strings"));
    return null;
  }
  return value;
}

function positiveInteger(value: unknown, path: string, label: string, issues: PackIssue[]): number | null {
  if (!isInteger(value) || value < 1) {
    issues.push(issue(PACK, path, `${label} must be a positive integer`));
    return null;
  }
  return value;
}

export function readMeta(files: Record<string, unknown>, issues: PackIssue[]): DictMeta | null {
  const meta = files["meta.json"];
  if (!isRecord(meta)) {
    issues.push(issue(PACK, "meta.json", "meta must be an object"));
    return null;
  }
  const cjkShards = positiveInteger(meta.cjkShards, "meta.json", "cjkShards", issues);
  const entryShards = positiveInteger(meta.entryShards, "meta.json", "entryShards", issues);
  const entries = positiveInteger(meta.entries, "meta.json", "entries", issues);
  const enLetters = stringLetters(meta.enLetters, "meta.json enLetters", issues);
  const pyLetters = stringLetters(meta.pyLetters, "meta.json pyLetters", issues);
  const viLetters = stringLetters(meta.viLetters, "meta.json viLetters", issues);
  const zyLetters = stringLetters(meta.zyLetters, "meta.json zyLetters", issues);
  if (
    cjkShards === null ||
    entryShards === null ||
    entries === null ||
    enLetters === null ||
    pyLetters === null ||
    viLetters === null ||
    zyLetters === null
  ) {
    return null;
  }
  return { cjkShards, entryShards, entries, enLetters, pyLetters, viLetters, zyLetters };
}

export function readParts(files: Record<string, unknown>, meta: DictMeta, issues: PackIssue[]): EntryPart[] | null {
  const raw = files["entries-meta.json"];
  if (!isRecord(raw)) {
    issues.push(issue(PACK, "entries-meta.json", "entries-meta must be an object"));
    return null;
  }
  if (raw.sharded !== true) issues.push(issue(PACK, "entries-meta.json", "sharded must be true"));
  if (raw.count !== meta.entries) {
    issues.push(
      issue(PACK, "entries-meta.json", `count must equal meta.entries ${meta.entries}, got ${JSON.stringify(raw.count)}`),
    );
  }
  if (!Array.isArray(raw.parts)) {
    issues.push(issue(PACK, "entries-meta.json", "parts must be an array"));
    return null;
  }
  if (raw.parts.length !== meta.entryShards) {
    issues.push(
      issue(PACK, "entries-meta.json", `parts length must be ${meta.entryShards}, got ${raw.parts.length}`),
    );
  }
  const parts: EntryPart[] = [];
  let cursor = 0;
  for (let index = 0; index < raw.parts.length; index += 1) {
    const part = raw.parts[index];
    const path = `entries-meta.json parts[${index}]`;
    if (!isRecord(part) || !isInteger(part.start) || !isInteger(part.count) || part.count < 0) {
      issues.push(issue(PACK, path, "part must have integer start and non-negative integer count"));
      return null;
    }
    if (part.start !== cursor) {
      issues.push(issue(PACK, path, `start must be ${cursor}, got ${part.start}`));
    }
    parts.push({ start: part.start, count: part.count });
    cursor += part.count;
  }
  if (cursor !== meta.entries) {
    issues.push(issue(PACK, "entries-meta.json", `part counts must sum to ${meta.entries}, got ${cursor}`));
  }
  return parts;
}

export function expectedFiles(meta: DictMeta): Set<string> {
  const names = new Set<string>(["meta.json", "entries-meta.json", "variants.json", ...FACETS]);
  for (let index = 0; index < meta.entryShards; index += 1) names.add(`entries-${index}.json`);
  for (let index = 0; index < meta.cjkShards; index += 1) {
    names.add(`cjk-${String(index).padStart(2, "0")}.json`);
  }
  for (const letter of meta.enLetters) names.add(`en-${letter}.json`);
  for (const letter of meta.pyLetters) names.add(`py-${letter}.json`);
  for (const letter of meta.viLetters) names.add(`vi-${letter}.json`);
  for (const letter of meta.zyLetters) names.add(`zy-${letter}.json`);
  return names;
}

function fieldIsBand(value: unknown): boolean {
  return value === null || (isNonEmptyString(value) && BANDS.has(value));
}

export function checkRows(files: Record<string, unknown>, parts: EntryPart[], issues: PackIssue[]): void {
  const seenU = new Map<string, string>();
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part) continue;
    const name = `entries-${index}.json`;
    if (!(name in files)) continue;
    const rows = files[name];
    if (!Array.isArray(rows)) {
      issues.push(issue(PACK, name, "entry shard must be an array"));
      continue;
    }
    if (rows.length !== part.count) {
      issues.push(issue(PACK, name, `shard must contain ${part.count} rows, got ${rows.length}`));
    }
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      checkRow(rows[rowIndex], name, rowIndex, part.start + rowIndex, seenU, issues);
    }
  }
}

function checkRow(
  row: unknown,
  name: string,
  rowIndex: number,
  expectedId: number,
  seenU: Map<string, string>,
  issues: PackIssue[],
): void {
  const path = `${name}[${rowIndex}]`;
  if (!isRecord(row)) {
    issues.push(issue(PACK, path, "entry must be an object"));
    return;
  }
  if (row.id !== expectedId) {
    issues.push(issue(PACK, path, `id must equal ${expectedId}, got ${JSON.stringify(row.id)}`));
  }
  if (!isNonEmptyString(row.h)) issues.push(issue(PACK, path, "h must be a non-empty string"));
  if (!isNonEmptyString(row.k) || !KINDS.has(row.k)) {
    issues.push(issue(PACK, path, `k must be c, w, or g, got ${JSON.stringify(row.k)}`));
  }
  if (!isNonEmptyString(row.u)) {
    issues.push(issue(PACK, path, "u must be a non-empty string"));
  } else if (isNonEmptyString(row.k) && !row.u.startsWith(`${row.k}/`)) {
    issues.push(issue(PACK, path, `u must start with "${row.k}/", got ${JSON.stringify(row.u)}`));
  }
  if (isNonEmptyString(row.u)) {
    const prior = seenU.get(row.u);
    if (prior) issues.push(issue(PACK, path, `duplicate u ${JSON.stringify(row.u)} also at ${prior}`));
    else seenU.set(row.u, path);
  }
  for (const field of STRING_FIELDS) {
    if (typeof row[field] !== "string") {
      issues.push(issue(PACK, path, `${field} must be a string`));
    }
  }
  if (!fieldIsBand(row.b)) {
    issues.push(issue(PACK, path, `b must be a TOCFL band or null, got ${JSON.stringify(row.b)}`));
  }
  for (const field of ["hs", "hve"] as const) {
    if (field in row && !isNonEmptyString(row[field])) {
      issues.push(issue(PACK, path, `${field} must be a non-empty string when present`));
    }
  }
}
