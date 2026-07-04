import { lookupPrebaked, type PrebakedEntry } from "@tsumugu/engine";
import type { CorePreparedContent } from "../types/corePrepared.js";
import type { Reading } from "../app/settings.js";

/** Extract the display reading for the active reading mode from a prebaked entry. */
export function readingForEntry(
  entry: PrebakedEntry | undefined,
  mode: Reading,
): string {
  if (!entry?.reading) return "";
  const raw = entry.reading.trim();
  if (!raw) return "";

  const parts = raw.split("/").map((p) => p.trim());
  if (parts.length === 1) return parts[0] ?? "";

  // Common generator shape: "hv / py" or "hv / py / zhuyin".
  if (mode === "hv") return parts[0] ?? raw;
  if (mode === "py") return parts[1] ?? parts[0] ?? raw;
  if (mode === "zh" || mode === "zy") return parts[2] ?? parts[1] ?? parts[0] ?? raw;
  return parts[2] ?? parts[1] ?? parts[0] ?? raw;
}

export function readingForWord(
  content: CorePreparedContent,
  word: string,
  mode: Reading,
): string {
  return readingForEntry(lookupPrebaked(content, word), mode);
}

export function glossForEntry(
  entry: PrebakedEntry | undefined,
  gloss: "en" | "vi",
): string {
  if (!entry) return "";
  const defs = entry.definitions;
  if (gloss === "vi" && defs?.zh?.gloss) return defs.zh.gloss;
  if (gloss === "en" && defs?.en?.gloss) return defs.en.gloss;
  return entry.gloss ?? "";
}