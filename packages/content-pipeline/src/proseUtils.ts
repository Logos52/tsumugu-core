/** Han character matcher — mirrors example_checks.py HAN_RE semantics. */
export const HAN_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/gu;

export const FINAL_PUNCT = "。！？";
export const CLOSERS = "」』）)\"'";

export function hanCount(s: string): number {
  return [...s.matchAll(HAN_RE)].length;
}

/** Ends with sentence-final punctuation (trailing closers tolerated). */
export function isCompleteSentence(zh: string): boolean {
  let t = zh.trimEnd();
  while (t.length > 0 && CLOSERS.includes(t.at(-1)!)) {
    t = t.slice(0, -1).trimEnd();
  }
  return t.length > 0 && FINAL_PUNCT.includes(t.at(-1)!);
}

/** Split prose into sentence chunks (delimiters retained on each chunk). */
export function splitSentences(prose: string): string[] {
  const sentences: string[] = [];
  let current = "";
  for (const ch of prose) {
    current += ch;
    if (FINAL_PUNCT.includes(ch)) {
      const trimmed = current.trim();
      if (trimmed) sentences.push(trimmed);
      current = "";
    }
  }
  const tail = current.trim();
  if (tail) sentences.push(tail);
  return sentences;
}

/** Split prose into paragraphs on blank lines. */
export function splitParagraphs(prose: string): string[] {
  const parts = prose.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [prose.trim()];
}

/** First two Han characters of a sentence (opening bigram). */
export function sentenceOpenerBigram(sentence: string): string {
  const han = [...sentence.matchAll(HAN_RE)].map((m) => m[0]);
  return han.slice(0, 2).join("");
}

export interface ContentWordCount {
  word: string;
  count: number;
  ratio: number;
}

/** Count content-word repetition within one paragraph's token texts. */
export function paragraphWordCounts(
  wordTexts: string[],
): { total: number; byWord: Map<string, number> } {
  const byWord = new Map<string, number>();
  for (const w of wordTexts) {
    byWord.set(w, (byWord.get(w) ?? 0) + 1);
  }
  return { total: wordTexts.length, byWord };
}

export function topRepetitionOffender(
  byWord: Map<string, number>,
  total: number,
): ContentWordCount | undefined {
  if (total === 0) return undefined;
  let best: ContentWordCount | undefined;
  for (const [word, count] of byWord) {
    const ratio = count / total;
    if (!best || ratio > best.ratio) {
      best = { word, count, ratio };
    }
  }
  return best;
}