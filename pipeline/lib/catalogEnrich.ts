import { readFile, stat } from "node:fs/promises";
import type { CorePreparedContent } from "../../app/src/catalog/preparedMeta.js";
import type { CatalogEntry } from "../../app/src/catalog/types.js";

const WORDS_PER_MINUTE = 180;

function slugFromPath(path: string): string {
  return path.split("/").pop()?.replace(/\.prepared\.json$/, "") ?? path;
}

function wordStats(tokens: { text: string; isWord: boolean }[]): {
  totalWords: number;
  wordCounts: Record<string, number>;
} {
  const wordCounts: Record<string, number> = {};
  let totalWords = 0;
  for (const t of tokens) {
    if (!t.isWord) continue;
    totalWords += 1;
    wordCounts[t.text] = (wordCounts[t.text] ?? 0) + 1;
  }
  return { totalWords, wordCounts };
}

function sentenceCount(tokens: { text: string; isWord: boolean }[]): number {
  let breaks = 0;
  for (const t of tokens) {
    if (t.text.includes("\n")) breaks += t.text.split("\n").length - 1;
  }
  return Math.max(1, breaks + 1);
}

function minutesFromWords(totalWords: number): number {
  return Math.max(1, Math.round(totalWords / WORDS_PER_MINUTE));
}

/** Build one catalog row from on-disk prepared JSON with Core metadata. */
export async function enrichCatalogEntry(
  preparedPath: string,
  catalogPath: string,
): Promise<CatalogEntry> {
  const raw = await readFile(preparedPath, "utf8");
  const prep = JSON.parse(raw) as CorePreparedContent;

  if (!prep.core) {
    throw new Error(`Missing doc.core metadata: ${preparedPath}`);
  }

  const tokens = prep.tokens ?? [];
  const { totalWords, wordCounts } = wordStats(tokens);
  const st = await stat(preparedPath);
  const slug = slugFromPath(catalogPath);

  return {
    path: catalogPath,
    lang: prep.lang,
    title: prep.title ?? slug,
    kind: prep.core.kind,
    origin: "generated",
    band: prep.core.band,
    tocfl: prep.core.tocfl,
    binding: prep.core.binding,
    sentences: sentenceCount(tokens),
    minutes: minutesFromWords(totalWords),
    dateAdded: st.mtime.toISOString().slice(0, 10),
    totalWords,
    wordCounts,
    newWords: prep.core.newWords,
    hasAudio: false,
    topic: prep.core.topic,
  };
}