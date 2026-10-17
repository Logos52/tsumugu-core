import type { CatalogEntry } from "../catalog/types.js";

export function isCatalogEntry(entry: unknown): entry is CatalogEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.band === "string" &&
    typeof e.kind === "string" &&
    typeof e.wordCounts === "object" &&
    e.wordCounts !== null
  );
}
