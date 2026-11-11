import { issue, type PackIssue } from "./issues.js";
import { isInteger, isNonEmptyString, isNonNegativeInteger, isRecord } from "./shapes.js";

const KINDS = new Set(["story", "dialogue", "explainer", "byo"]);
const ORIGINS = new Set(["companion", "generated"]);
const BANDS = new Set(["A1", "A2", "B1"]);
const PATH_RE = /^readings\/zh-Hant\/(b\d+l\d{2}-r\d+)\.prepared\.json$/;
const TITLE_ID_RE = /^b(\d+)l(\d{2})-r\d+$/;
const UNIT_RE = /^B(\d+)L(\d{2})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SCHEMA = "tsumugu/prepared-content@2";

export interface VaultPackInput {
  catalog: unknown;
  titles: unknown;
  lessons: unknown;
  prepared: Record<string, unknown>;
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function bindingLesson(binding: Record<string, unknown>): string | null {
  if (!isInteger(binding.book) || !isInteger(binding.lesson)) return null;
  return `B${binding.book}L${String(binding.lesson).padStart(2, "0")}`;
}

function bindingLessonId(binding: Record<string, unknown>): string | null {
  if (!isInteger(binding.book) || !isInteger(binding.lesson)) return null;
  return `b${binding.book}l${String(binding.lesson).padStart(2, "0")}`;
}

export function validateVaultTitles(titles: unknown): PackIssue[] {
  const issues: PackIssue[] = [];
  if (!isRecord(titles)) {
    return [issue("vault-titles", "__titles.json", "titles must be an object keyed by reading id")];
  }
  for (const [id, row] of Object.entries(titles)) {
    const match = TITLE_ID_RE.exec(id);
    if (!match) {
      issues.push(issue("vault-titles", id, "id must look like b1l01-r1"));
      continue;
    }
    if (!isRecord(row)) {
      issues.push(issue("vault-titles", id, "title row must be an object"));
      continue;
    }
    for (const field of ["zh", "en", "vi", "lesson", "format"] as const) {
      if (!isNonEmptyString(row[field])) {
        issues.push(issue("vault-titles", id, `${field} must be a non-empty string`));
      }
    }
    const book = match[1];
    const lesson = match[2];
    const expected = `B${book}L${lesson}`;
    if (isNonEmptyString(row.lesson) && row.lesson !== expected) {
      issues.push(issue("vault-titles", id, `lesson must be ${expected}, got ${row.lesson}`));
    }
  }
  return issues;
}

export function validateCompanionLessons(lessons: unknown): PackIssue[] {
  const issues: PackIssue[] = [];
  if (!Array.isArray(lessons)) {
    return [issue("companion-lessons", "companion-lessons.json", "lessons must be an array")];
  }
  const seen = new Set<string>();
  for (let index = 0; index < lessons.length; index += 1) {
    const row = lessons[index];
    const path = `companion-lessons.json[${index}]`;
    if (!isRecord(row)) {
      issues.push(issue("companion-lessons", path, "lesson must be an object"));
      continue;
    }
    if (!isNonEmptyString(row.unit) || !UNIT_RE.test(row.unit)) {
      issues.push(issue("companion-lessons", path, "unit must look like B1L01"));
      continue;
    }
    if (seen.has(row.unit)) {
      issues.push(issue("companion-lessons", row.unit, `duplicate unit ${row.unit}`));
    }
    seen.add(row.unit);
    if (!isNonEmptyString(row.title)) {
      issues.push(issue("companion-lessons", row.unit, "title must be a non-empty string"));
    }
    if (!isNonEmptyString(row.theme)) {
      issues.push(issue("companion-lessons", row.unit, "theme must be a non-empty string"));
    }
    if (!Array.isArray(row.grammar)) {
      issues.push(issue("companion-lessons", row.unit, "grammar must be an array"));
      continue;
    }
    for (let grammarIndex = 0; grammarIndex < row.grammar.length; grammarIndex += 1) {
      const grammar = row.grammar[grammarIndex];
      const grammarPath = `${row.unit}.grammar[${grammarIndex}]`;
      if (!isRecord(grammar) || !isNonEmptyString(grammar.name)) {
        issues.push(issue("companion-lessons", grammarPath, "grammar name must be a non-empty string"));
      }
    }
  }
  return issues;
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

function tokenCounts(tokens: { text: string; isWord: boolean }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const token of tokens) {
    if (!token.isWord) continue;
    counts[token.text] = (counts[token.text] ?? 0) + 1;
  }
  return counts;
}

function sameCounts(left: Record<string, number>, right: Record<string, number>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

function sameBinding(left: unknown, right: unknown): boolean {
  if (!isRecord(left) || !isRecord(right)) return false;
  return left.textbook === right.textbook && left.book === right.book && left.lesson === right.lesson;
}

function checkPrepared(
  path: string,
  doc: unknown,
  catalog: Record<string, unknown>,
  binding: Record<string, unknown>,
  wordCounts: Record<string, number>,
  issues: PackIssue[],
): void {
  if (!isRecord(doc)) {
    issues.push(issue("vault-readings", path, "prepared file must be an object"));
    return;
  }
  if (doc.schema !== SCHEMA) {
    issues.push(
      issue("vault-readings", path, `schema must be ${SCHEMA}, got ${JSON.stringify(doc.schema)}`),
    );
  }
  if (doc.lang !== catalog.lang) {
    issues.push(issue("vault-readings", path, "prepared lang must match the catalog"));
  }
  if (doc.title !== catalog.title) {
    issues.push(issue("vault-readings", path, "prepared title must match the catalog"));
  }
  if (!Array.isArray(doc.tokens) || doc.tokens.length === 0) {
    issues.push(issue("vault-readings", path, "tokens must be a non-empty array"));
  }
  const tokens: { text: string; isWord: boolean }[] = [];
  if (Array.isArray(doc.tokens)) {
    for (let index = 0; index < doc.tokens.length; index += 1) {
      const token = doc.tokens[index];
      if (!isRecord(token) || typeof token.text !== "string" || token.text === "" || typeof token.isWord !== "boolean") {
        issues.push(issue("vault-readings", `${path}#tokens[${index}]`, "token must have string text and boolean isWord"));
        continue;
      }
      tokens.push({ text: token.text, isWord: token.isWord });
    }
  }
  if (!sameCounts(tokenCounts(tokens), wordCounts)) {
    issues.push(issue("vault-readings", path, "wordCounts do not match isWord token counts"));
  }
  if (!isRecord(doc.glossary)) {
    issues.push(issue("vault-readings", path, "glossary must be an object"));
  } else {
    for (const [key, entry] of Object.entries(doc.glossary)) {
      if (!isRecord(entry)) {
        issues.push(issue("vault-readings", `${path}#glossary.${key}`, "glossary entry must be an object"));
        continue;
      }
      if (entry.term !== key) {
        issues.push(issue("vault-readings", `${path}#glossary.${key}`, `glossary term must match key ${key}`));
      }
      if (!isNonEmptyString(entry.gloss)) {
        issues.push(
          issue("vault-readings", `${path}#glossary.${key}`, `glossary gloss must be a non-empty string for ${key}`),
        );
      }
    }
  }
  if (!isRecord(doc.core)) {
    issues.push(issue("vault-readings", path, "core must be an object"));
  } else {
    for (const field of ["band", "tocfl", "kind", "newWords", "topic"] as const) {
      if (doc.core[field] !== catalog[field]) {
        issues.push(issue("vault-readings", path, `core.${field} must match the catalog`));
      }
    }
    if (!sameBinding(doc.core.binding, binding)) {
      issues.push(issue("vault-readings", path, "core.binding must match the catalog"));
    }
  }
  if (!isRecord(doc.fingerprint)) {
    issues.push(issue("vault-readings", path, "fingerprint must be an object"));
  } else {
    if (!stringList(doc.fingerprint.vocab)) {
      issues.push(issue("vault-readings", path, "fingerprint.vocab must be an array of non-empty strings"));
    }
    if (!stringList(doc.fingerprint.grammar)) {
      issues.push(issue("vault-readings", path, "fingerprint.grammar must be an array of non-empty strings"));
    }
  }
  const lessonId = bindingLessonId(binding);
  if (!isRecord(doc.acccBinding)) {
    issues.push(issue("vault-readings", path, "acccBinding must be an object"));
  } else {
    if (lessonId !== null && doc.acccBinding.lessonId !== lessonId) {
      issues.push(
        issue(
          "vault-readings",
          path,
          `lessonId must be ${lessonId}, got ${JSON.stringify(doc.acccBinding.lessonId)}`,
        ),
      );
    }
    if (!isNonEmptyString(doc.acccBinding.ceiling)) {
      issues.push(issue("vault-readings", path, "acccBinding.ceiling must be a non-empty string"));
    }
    for (const field of ["cumulativeVocab", "newVocab", "newGrammar"] as const) {
      if (!stringList(doc.acccBinding[field])) {
        issues.push(issue("vault-readings", path, `acccBinding.${field} must be an array of non-empty strings`));
      }
    }
  }
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
