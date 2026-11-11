import { issue, type PackIssue } from "./issues.js";
import { isInteger, isNonEmptyString, isNonNegativeInteger, isRecord } from "./shapes.js";
import { bindingLesson, validateCompanionLessons, validateVaultTitles } from "./vault-pack.part1.js";
import { checkPrepared } from "./vault-pack.part2.js";

const KINDS = new Set(["story", "dialogue", "explainer", "byo"]);
const ORIGINS = new Set(["companion", "generated"]);
const BANDS = new Set(["A1", "A2", "B1"]);
const PATH_RE = /^readings\/zh-Hant\/(b\d+l\d{2}-r\d+)\.prepared\.json$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface VaultPackInput {
  catalog: unknown;
  titles: unknown;
  lessons: unknown;
  prepared: Record<string, unknown>;
}

function checkBinding(binding: unknown, path: string, issues: PackIssue[]): Record<string, unknown> | null {
  if (!isRecord(binding)) {
    issues.push(issue("vault-readings", path, "binding must be an object"));
    return null;
  }
  if (binding.textbook !== "accc") {
    issues.push(issue("vault-readings", path, "binding.textbook must be accc"));
  }
  if (!isInteger(binding.book) || binding.book < 1) {
    issues.push(issue("vault-readings", path, "binding.book must be a positive integer"));
  }
  if (!isInteger(binding.lesson) || binding.lesson < 1) {
    issues.push(issue("vault-readings", path, "binding.lesson must be a positive integer"));
  }
  return binding;
}

function checkWordCounts(
  value: unknown,
  path: string,
  totalWords: unknown,
  issues: PackIssue[],
): Record<string, number> | null {
  if (!isRecord(value)) {
    issues.push(issue("vault-readings", path, "wordCounts must be an object"));
    return null;
  }
  const counts: Record<string, number> = {};
  let sum = 0;
  for (const [word, count] of Object.entries(value)) {
    if (!isNonEmptyString(word) || !isInteger(count) || count < 1) {
      issues.push(issue("vault-readings", path, `wordCounts.${word} must be a positive integer`));
      continue;
    }
    counts[word] = count;
    sum += count;
  }
  if (isNonNegativeInteger(totalWords) && sum !== totalWords) {
    issues.push(issue("vault-readings", path, `totalWords must equal the sum of wordCounts, got ${totalWords} vs ${sum}`));
  }
  return counts;
}

function checkCatalogRow(
  row: unknown,
  index: number,
  input: VaultPackInput,
  seenPaths: Set<string>,
  titleLessons: Map<string, string>,
  units: Set<string>,
  issues: PackIssue[],
): void {
  const path = `__readings.json[${index}]`;
  if (!isRecord(row)) {
    issues.push(issue("vault-readings", path, "catalog entry must be an object"));
    return;
  }
  if (!isNonEmptyString(row.path) || !PATH_RE.test(row.path)) {
    issues.push(
      issue(
        "vault-readings",
        path,
        "path must be readings/zh-Hant/b{book}l{lesson}-r{n}.prepared.json",
      ),
    );
    return;
  }
  if (seenPaths.has(row.path)) {
    issues.push(issue("vault-readings", row.path, `duplicate path ${row.path}`));
  }
  seenPaths.add(row.path);
  if (row.lang !== "zh-Hant") issues.push(issue("vault-readings", row.path, "lang must be zh-Hant"));
  if (!isNonEmptyString(row.title)) issues.push(issue("vault-readings", row.path, "title must be a non-empty string"));
  if (!isNonEmptyString(row.kind) || !KINDS.has(row.kind)) {
    issues.push(issue("vault-readings", row.path, "kind must be story, dialogue, explainer, or byo"));
  }
  if (!isNonEmptyString(row.origin) || !ORIGINS.has(row.origin)) {
    issues.push(issue("vault-readings", row.path, "origin must be companion or generated"));
  }
  if (!isNonEmptyString(row.band) || !BANDS.has(row.band)) {
    issues.push(issue("vault-readings", row.path, "band must be A1, A2, or B1"));
  }
  if (row.tocfl !== 1 && row.tocfl !== 2 && row.tocfl !== 3) {
    issues.push(issue("vault-readings", row.path, "tocfl must be 1, 2, or 3"));
  }
  if (!isNonEmptyString(row.topic)) issues.push(issue("vault-readings", row.path, "topic must be a non-empty string"));
  if (!isNonEmptyString(row.dateAdded) || !DATE_RE.test(row.dateAdded)) {
    issues.push(issue("vault-readings", row.path, "dateAdded must be YYYY-MM-DD"));
  }
  if (typeof row.hasAudio !== "boolean") {
    issues.push(issue("vault-readings", row.path, "hasAudio must be a boolean"));
  }
  for (const field of ["sentences", "minutes", "totalWords", "newWords"] as const) {
    if (!isNonNegativeInteger(row[field])) {
      issues.push(issue("vault-readings", row.path, `${field} must be a non-negative integer`));
    }
  }
  const binding = checkBinding(row.binding, row.path, issues);
  const wordCounts = checkWordCounts(row.wordCounts, row.path, row.totalWords, issues);
  const id = PATH_RE.exec(row.path)?.[1];
  if (id && isRecord(input.titles) && !titleLessons.has(id)) {
    issues.push(issue("vault-readings", row.path, `missing title ${id}`));
  }
  if (id && binding && titleLessons.has(id)) {
    const expected = bindingLesson(binding);
    const actual = titleLessons.get(id);
    if (expected && actual && actual !== expected) {
      issues.push(issue("vault-readings", row.path, `title lesson must match binding ${expected}, got ${actual}`));
    }
  }
  if (binding) {
    const unit = bindingLesson(binding);
    if (unit && Array.isArray(input.lessons) && !units.has(unit)) {
      issues.push(issue("vault-readings", row.path, `missing companion lesson ${unit}`));
    }
  }
  if (!(row.path in input.prepared)) {
    issues.push(issue("vault-readings", row.path, `prepared file missing: ${row.path}`));
    return;
  }
  if (binding && wordCounts) checkPrepared(row.path, input.prepared[row.path], row, binding, wordCounts, issues);
}

export function validateVaultPack(input: VaultPackInput): PackIssue[] {
  const issues = [...validateVaultTitles(input.titles), ...validateCompanionLessons(input.lessons)];
  const titleLessons = new Map<string, string>();
  if (isRecord(input.titles)) {
    for (const [id, row] of Object.entries(input.titles)) {
      if (isRecord(row) && isNonEmptyString(row.lesson)) titleLessons.set(id, row.lesson);
    }
  }
  const units = new Set<string>();
  if (Array.isArray(input.lessons)) {
    for (const row of input.lessons) {
      if (isRecord(row) && isNonEmptyString(row.unit)) units.add(row.unit);
    }
  }
  if (!Array.isArray(input.catalog)) {
    issues.push(issue("vault-readings", "__readings.json", "catalog must be an array"));
    return issues;
  }
  const seenPaths = new Set<string>();
  for (let index = 0; index < input.catalog.length; index += 1) {
    checkCatalogRow(input.catalog[index], index, input, seenPaths, titleLessons, units, issues);
  }
  for (const path of Object.keys(input.prepared)) {
    if (!seenPaths.has(path)) {
      issues.push(issue("vault-readings", path, "prepared file is not in the catalog"));
    }
  }
  return issues;
}
