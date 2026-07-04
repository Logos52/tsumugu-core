#!/usr/bin/env tsx
/**
 * Emit `__readings.json` from generated `*.prepared.json` in the static vault.
 */
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { enrichCatalogEntry } from "./lib/catalogEnrich.js";
import type { CatalogEntry } from "../app/src/catalog/types.js";

const ROOT = join(import.meta.dirname, "..");
const CONTENT_DIR = join(ROOT, "app/public/vault/readings/zh-Hant");
const CATALOG_OUT = join(ROOT, "app/public/vault/__readings.json");

function bindingKey(entry: CatalogEntry): string {
  if (!entry.binding) return "zz";
  return `${String(entry.binding.book).padStart(2, "0")}-${String(entry.binding.lesson).padStart(2, "0")}`;
}

function sortEntries(entries: CatalogEntry[]): CatalogEntry[] {
  const bandOrder = { A1: 0, A2: 1, B1: 2 } as const;
  return [...entries].sort((a, b) => {
    const bandCmp = bandOrder[a.band] - bandOrder[b.band];
    if (bandCmp !== 0) return bandCmp;
    const bindCmp = bindingKey(a).localeCompare(bindingKey(b));
    if (bindCmp !== 0) return bindCmp;
    return (a.title ?? a.path).localeCompare(b.title ?? b.path);
  });
}

async function main(): Promise<void> {
  const files = await readdir(CONTENT_DIR);
  const entries: CatalogEntry[] = [];

  for (const file of files.sort()) {
    const m = /^(.+)\.prepared\.json$/.exec(file);
    if (!m) continue;
    const slug = m[1]!;
    const preparedPath = join(CONTENT_DIR, file);
    const catalogPath = `readings/zh-Hant/${slug}.prepared.json`;
    entries.push(await enrichCatalogEntry(preparedPath, catalogPath));
  }

  const sorted = sortEntries(entries);
  await mkdir(join(CATALOG_OUT, ".."), { recursive: true });
  await writeFile(CATALOG_OUT, JSON.stringify(sorted, null, 2) + "\n", "utf8");

  console.log(`Published ${sorted.length} reading(s) → ${relative(ROOT, CATALOG_OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});