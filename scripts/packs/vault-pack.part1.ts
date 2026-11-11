import { issue, type PackIssue } from "./issues.js";
import { isInteger, isNonEmptyString, isRecord } from "./shapes.js";

const TITLE_ID_RE = /^b(\d+)l(\d{2})-r\d+$/;
const UNIT_RE = /^B(\d+)L(\d{2})$/;

export function bindingLesson(binding: Record<string, unknown>): string | null {
  if (!isInteger(binding.book) || !isInteger(binding.lesson)) return null;
  return `B${binding.book}L${String(binding.lesson).padStart(2, "0")}`;
}

export function bindingLessonId(binding: Record<string, unknown>): string | null {
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
