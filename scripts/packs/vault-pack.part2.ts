import { issue, type PackIssue } from "./issues.js";
import { isNonEmptyString, isNonEmptyStringList, isRecord } from "./shapes.js";
import { bindingLessonId } from "./vault-pack.part1.js";

const SCHEMA = "tsumugu/prepared-content@2";

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

export function checkPrepared(
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
  const tokens = readTokens(path, doc.tokens, issues);
  if (!sameCounts(tokenCounts(tokens), wordCounts)) {
    issues.push(issue("vault-readings", path, "wordCounts do not match isWord token counts"));
  }
  checkGlossary(path, doc.glossary, issues);
  checkCore(path, doc.core, catalog, binding, issues);
  checkFingerprint(path, doc.fingerprint, issues);
  checkAcccBinding(path, doc.acccBinding, binding, issues);
}

function readTokens(path: string, value: unknown, issues: PackIssue[]): { text: string; isWord: boolean }[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(issue("vault-readings", path, "tokens must be a non-empty array"));
    return [];
  }
  const tokens: { text: string; isWord: boolean }[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const token = value[index];
    if (!isRecord(token) || typeof token.text !== "string" || token.text === "" || typeof token.isWord !== "boolean") {
      issues.push(issue("vault-readings", `${path}#tokens[${index}]`, "token must have string text and boolean isWord"));
      continue;
    }
    tokens.push({ text: token.text, isWord: token.isWord });
  }
  return tokens;
}

function checkGlossary(path: string, glossary: unknown, issues: PackIssue[]): void {
  if (!isRecord(glossary)) {
    issues.push(issue("vault-readings", path, "glossary must be an object"));
    return;
  }
  for (const [key, entry] of Object.entries(glossary)) {
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

function checkCore(
  path: string,
  core: unknown,
  catalog: Record<string, unknown>,
  binding: Record<string, unknown>,
  issues: PackIssue[],
): void {
  if (!isRecord(core)) {
    issues.push(issue("vault-readings", path, "core must be an object"));
    return;
  }
  for (const field of ["band", "tocfl", "kind", "newWords", "topic"] as const) {
    if (core[field] !== catalog[field]) {
      issues.push(issue("vault-readings", path, `core.${field} must match the catalog`));
    }
  }
  if (!sameBinding(core.binding, binding)) {
    issues.push(issue("vault-readings", path, "core.binding must match the catalog"));
  }
}

function checkFingerprint(path: string, fingerprint: unknown, issues: PackIssue[]): void {
  if (!isRecord(fingerprint)) {
    issues.push(issue("vault-readings", path, "fingerprint must be an object"));
    return;
  }
  if (!isNonEmptyStringList(fingerprint.vocab)) {
    issues.push(issue("vault-readings", path, "fingerprint.vocab must be an array of non-empty strings"));
  }
  if (!isNonEmptyStringList(fingerprint.grammar)) {
    issues.push(issue("vault-readings", path, "fingerprint.grammar must be an array of non-empty strings"));
  }
}

function checkAcccBinding(
  path: string,
  acccBinding: unknown,
  binding: Record<string, unknown>,
  issues: PackIssue[],
): void {
  const lessonId = bindingLessonId(binding);
  if (!isRecord(acccBinding)) {
    issues.push(issue("vault-readings", path, "acccBinding must be an object"));
    return;
  }
  if (lessonId !== null && acccBinding.lessonId !== lessonId) {
    issues.push(
      issue(
        "vault-readings",
        path,
        `lessonId must be ${lessonId}, got ${JSON.stringify(acccBinding.lessonId)}`,
      ),
    );
  }
  if (!isNonEmptyString(acccBinding.ceiling)) {
    issues.push(issue("vault-readings", path, "acccBinding.ceiling must be a non-empty string"));
  }
  for (const field of ["cumulativeVocab", "newVocab", "newGrammar"] as const) {
    if (!isNonEmptyStringList(acccBinding[field])) {
      issues.push(issue("vault-readings", path, `acccBinding.${field} must be an array of non-empty strings`));
    }
  }
}
