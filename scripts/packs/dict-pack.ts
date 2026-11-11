import { issue, type PackIssue } from "./issues.js";
import { isInteger, isNonEmptyString, isRecord } from "./shapes.js";
import { checkRows, expectedFiles, FACETS, PACK, readMeta, readParts } from "./dict-pack.part1.js";

function checkFileSet(files: Record<string, unknown>, expected: Set<string>, issues: PackIssue[]): void {
  for (const name of expected) {
    if (!(name in files)) issues.push(issue(PACK, name, `missing file ${name}`));
  }
  for (const name of Object.keys(files)) {
    if (!expected.has(name)) issues.push(issue(PACK, name, `unexpected file ${name}`));
  }
}

function checkBuckets(
  files: Record<string, unknown>,
  name: string,
  entryCount: number,
  letter: string | null,
  issues: PackIssue[],
): void {
  if (!(name in files)) return;
  const data = files[name];
  if (!isRecord(data)) {
    issues.push(issue(PACK, name, "index must be an object of id arrays"));
    return;
  }
  for (const [key, value] of Object.entries(data)) {
    const path = `${name}#${key}`;
    if (letter !== null && !key.toLowerCase().startsWith(letter.toLowerCase())) {
      issues.push(issue(PACK, path, `index key must start with ${letter}`));
    }
    if (!Array.isArray(value) || value.length === 0) {
      issues.push(issue(PACK, path, "index bucket must be a non-empty array of entry ids"));
      continue;
    }
    for (const id of value) {
      if (!isInteger(id) || id < 0 || id >= entryCount) {
        issues.push(issue(PACK, path, `index id ${String(id)} is outside 0..${entryCount - 1}`));
      }
    }
  }
}

function checkVariants(files: Record<string, unknown>, issues: PackIssue[]): void {
  if (!("variants.json" in files)) return;
  const data = files["variants.json"];
  if (!isRecord(data)) {
    issues.push(issue(PACK, "variants.json", "variants must be an object with chars and words"));
    return;
  }
  for (const group of ["chars", "words"] as const) {
    const map = data[group];
    if (!isRecord(map)) {
      issues.push(issue(PACK, "variants.json", `${group} must be an object`));
      continue;
    }
    for (const [key, value] of Object.entries(map)) {
      const path = `variants.json ${group}.${key}`;
      if (!Array.isArray(value) || value.length === 0 || value.some((item) => !isNonEmptyString(item))) {
        issues.push(issue(PACK, path, "variant list must be a non-empty array of strings"));
        continue;
      }
      if (!value.includes(key)) {
        issues.push(issue(PACK, path, "variant list must include its key"));
      }
    }
  }
}

export function validateDictFiles(files: Record<string, unknown>): PackIssue[] {
  const issues: PackIssue[] = [];
  const meta = readMeta(files, issues);
  if (!meta) return issues;
  const parts = readParts(files, meta, issues);
  checkFileSet(files, expectedFiles(meta), issues);
  if (parts) checkRows(files, parts, issues);
  for (const letter of meta.enLetters) checkBuckets(files, `en-${letter}.json`, meta.entries, letter, issues);
  for (const letter of meta.pyLetters) checkBuckets(files, `py-${letter}.json`, meta.entries, letter, issues);
  for (const letter of meta.viLetters) checkBuckets(files, `vi-${letter}.json`, meta.entries, letter, issues);
  for (const letter of meta.zyLetters) checkBuckets(files, `zy-${letter}.json`, meta.entries, letter, issues);
  for (let index = 0; index < meta.cjkShards; index += 1) {
    checkBuckets(files, `cjk-${String(index).padStart(2, "0")}.json`, meta.entries, null, issues);
  }
  for (const name of FACETS) checkBuckets(files, name, meta.entries, null, issues);
  checkVariants(files, issues);
  return issues;
}
