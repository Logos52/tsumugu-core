#!/usr/bin/env tsx
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateDictFiles } from "./dict-pack.js";
import { applyAllowlist, formatIssue, issue, type AllowlistEntry, type PackIssue } from "./issues.js";
import { isRecord } from "./shapes.js";
import { validateVaultPack, type VaultPackInput } from "./vault-pack.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, "../..");

export interface RepoReport {
  ok: boolean;
  issues: PackIssue[];
  summary: string[];
}

function readJson(path: string): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, "utf8")) as unknown };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}

function loadAllowlist(path: string): { entries: AllowlistEntry[]; issues: PackIssue[] } {
  if (!existsSync(path)) return { entries: [], issues: [] };
  const parsed = readJson(path);
  if (!parsed.ok) return { entries: [], issues: [issue("allowlist", path, `invalid JSON: ${parsed.message}`)] };
  if (!isRecord(parsed.value) || !Array.isArray(parsed.value.issues)) {
    return { entries: [], issues: [issue("allowlist", path, "allowlist issues must be an array")] };
  }
  const entries: AllowlistEntry[] = [];
  for (const entry of parsed.value.issues) {
    if (!isRecord(entry) || typeof entry.pack !== "string" || typeof entry.path !== "string" || typeof entry.message !== "string") {
      return { entries: [], issues: [issue("allowlist", path, "allowlist entry must have pack, path, and message strings")] };
    }
    entries.push({ pack: entry.pack, path: entry.path, message: entry.message });
  }
  return { entries, issues: [] };
}

function loadVault(root: string): { input: VaultPackInput; issues: PackIssue[]; counts: Record<string, number> } {
  const issues: PackIssue[] = [];
  const vault = join(root, "app/public/vault");
  const catalogPath = join(vault, "__readings.json");
  const titlesPath = join(vault, "__titles.json");
  const lessonsPath = join(vault, "companion-lessons.json");
  const catalog = readJson(catalogPath);
  const titles = readJson(titlesPath);
  const lessons = readJson(lessonsPath);
  if (!catalog.ok) issues.push(issue("vault-readings", "__readings.json", `invalid JSON: ${catalog.message}`));
  if (!titles.ok) issues.push(issue("vault-titles", "__titles.json", `invalid JSON: ${titles.message}`));
  if (!lessons.ok) issues.push(issue("companion-lessons", "companion-lessons.json", `invalid JSON: ${lessons.message}`));
  const prepared: Record<string, unknown> = {};
  const preparedDir = join(vault, "readings/zh-Hant");
  if (!existsSync(preparedDir)) {
    issues.push(issue("vault-readings", "readings/zh-Hant", "prepared directory missing"));
  } else {
    for (const name of readdirSync(preparedDir)) {
      if (!name.endsWith(".prepared.json")) continue;
      const rel = `readings/zh-Hant/${name}`;
      const parsed = readJson(join(preparedDir, name));
      if (!parsed.ok) issues.push(issue("vault-readings", rel, `invalid JSON: ${parsed.message}`));
      else prepared[rel] = parsed.value;
    }
  }
  const input: VaultPackInput = {
    catalog: catalog.ok ? catalog.value : null,
    titles: titles.ok ? titles.value : null,
    lessons: lessons.ok ? lessons.value : null,
    prepared,
  };
  const counts = {
    readings: Array.isArray(input.catalog) ? input.catalog.length : 0,
    titles: isRecord(input.titles) ? Object.keys(input.titles).length : 0,
    lessons: Array.isArray(input.lessons) ? input.lessons.length : 0,
  };
  return { input, issues, counts };
}

function loadDict(root: string): { files: Record<string, unknown>; issues: PackIssue[]; entries: number } {
  const issues: PackIssue[] = [];
  const dir = join(root, "app/public/dict-search");
  const files: Record<string, unknown> = {};
  if (!existsSync(dir)) {
    issues.push(issue("dict-search", "dict-search", "dict-search directory missing"));
    return { files, issues, entries: 0 };
  }
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const parsed = readJson(join(dir, name));
    if (!parsed.ok) issues.push(issue("dict-search", name, `invalid JSON: ${parsed.message}`));
    else files[name] = parsed.value;
  }
  const meta = files["meta.json"];
  const entries = isRecord(meta) && typeof meta.entries === "number" ? meta.entries : 0;
  return { files, issues, entries };
}

export function validateRepo(root = DEFAULT_ROOT): RepoReport {
  const vault = loadVault(root);
  const dict = loadDict(root);
  const found = [
    ...vault.issues,
    ...validateVaultPack(vault.input),
    ...dict.issues,
    ...validateDictFiles(dict.files),
  ];
  const allow = loadAllowlist(join(root, "scripts/packs/allowlist.json"));
  const issues = allow.issues.length > 0 ? [...allow.issues, ...found] : applyAllowlist(found, allow.entries);
  const summary = [
    `vault-readings ${vault.counts.readings}`,
    `vault-titles ${vault.counts.titles}`,
    `companion-lessons ${vault.counts.lessons}`,
    `dict-search ${dict.entries}`,
  ];
  return { ok: issues.length === 0, issues, summary };
}

export function validateFixture(fixture: unknown): PackIssue[] {
  if (!isRecord(fixture) || typeof fixture.pack !== "string") {
    return [issue("fixture", "pack", "fixture.pack must be a string")];
  }
  if (fixture.pack === "vault") {
    if (!isRecord(fixture.prepared)) {
      return [issue("vault-readings", "prepared", "prepared must be an object of path to document")];
    }
    return validateVaultPack({
      catalog: fixture.catalog,
      titles: fixture.titles,
      lessons: fixture.lessons,
      prepared: fixture.prepared,
    });
  }
  if (fixture.pack === "dict-search") {
    if (!isRecord(fixture.files)) {
      return [issue("dict-search", "files", "files must be an object of filename to JSON")];
    }
    return validateDictFiles(fixture.files);
  }
  return [issue("fixture", fixture.pack, `unknown pack ${fixture.pack}`)];
}

function main(): void {
  const report = validateRepo();
  if (!report.ok) {
    for (const item of report.issues) console.error(formatIssue(item));
    console.error(`FAIL ${report.issues.length} data-pack issue(s)`);
    process.exit(1);
  }
  for (const line of report.summary) console.log(`OK ${line}`);
}

const isCliEntry = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) main();
