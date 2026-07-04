import type {
  DictEntry,
  LanguagePack,
  PreparedContent,
  PrebakedEntry,
} from "@tsumugu/engine";
import { PREPARED_CONTENT_SCHEMA_V2 } from "@tsumugu/engine";
import { segmentLiveText } from "../packs/jiebaSegment.js";

export interface PrepareFromTextOptions {
  pack: LanguagePack;
  title?: string;
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 20_000;

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function dictToPrebaked(word: string, entry: DictEntry | undefined): PrebakedEntry {
  if (!entry) return { term: word, gloss: "" };
  const gloss = entry.gloss || entry.definitions?.en?.gloss || "";
  return {
    term: entry.term,
    gloss,
    ...(entry.reading ? { reading: entry.reading } : {}),
    ...(entry.pos ? { pos: entry.pos } : {}),
    ...(entry.level ? { level: entry.level } : {}),
    ...(entry.definitions ? { definitions: entry.definitions } : {}),
  };
}

function defaultTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Pasted reading";
  return trimmed.slice(0, 12) + (trimmed.length > 12 ? "…" : "");
}

export async function prepareFromText(
  text: string,
  opts: PrepareFromTextOptions,
): Promise<PreparedContent> {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  if (text.length > maxChars) {
    throw new Error(`Paste exceeds maxChars (${maxChars})`);
  }

  const tokens = await segmentLiveText(text, opts.pack);
  const preparedTokens = tokens.map((t) => ({ text: t.text, isWord: t.isWord }));

  const distinctWords = [
    ...new Set(tokens.filter((t) => t.isWord).map((t) => t.text)),
  ];

  const entries = await mapConcurrent(distinctWords, 8, async (word) => {
    const raw = await opts.pack.dictionaryProvider(word);
    return [word, dictToPrebaked(word, raw)] as const;
  });

  const glossary: Record<string, PrebakedEntry> = {};
  for (const [word, entry] of entries) {
    glossary[word] = entry;
  }

  return {
    schema: PREPARED_CONTENT_SCHEMA_V2,
    lang: opts.pack.id,
    title: opts.title ?? defaultTitle(text),
    source: "imported",
    generatedAt: new Date().toISOString(),
    tokens: preparedTokens,
    glossary,
  };
}

export { DEFAULT_MAX_CHARS };