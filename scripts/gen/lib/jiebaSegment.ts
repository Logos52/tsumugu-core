import type { PreparedToken } from "@tsumugu/engine";

const HAN_RE = /\p{Script=Han}/u;
const WORDISH_RE = /\p{Script=Han}|\p{Letter}/u;

type JiebaPiece = { word: string; start: number; end: number };
type TokenizeFn = (text: string, mode: string, hmm?: boolean | null) => JiebaPiece[];

let tokenizePromise: Promise<TokenizeFn> | null = null;

function loadTokenize(): Promise<TokenizeFn> {
  if (!tokenizePromise) {
    tokenizePromise = import("jieba-wasm").then((mod) => mod.tokenize);
  }
  return tokenizePromise;
}

/** Greedy longest-match fallback (tests + offline without wasm). */
export function segmentDraftGreedy(text: string, knownWords: Set<string>): PreparedToken[] {
  const tokens: PreparedToken[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i]!;
    if (!WORDISH_RE.test(ch)) {
      let punct = ch;
      i++;
      while (i < text.length && !WORDISH_RE.test(text[i]!)) {
        punct += text[i]!;
        i++;
      }
      tokens.push({ text: punct, isWord: false });
      continue;
    }

    let matched = ch;
    let bestLen = 1;
    const maxLen = Math.min(12, text.length - i);
    for (let len = maxLen; len >= 1; len--) {
      const candidate = text.slice(i, i + len);
      if (knownWords.has(candidate)) {
        matched = candidate;
        bestLen = len;
        break;
      }
    }

    tokens.push({ text: matched, isWord: HAN_RE.test(matched) });
    i += bestLen;
  }

  return tokens;
}

/** jieba-wasm segmentation with greedy lexicon refinement for known multi-char words. */
export async function segmentDraftAsync(
  text: string,
  knownWords: Set<string>,
): Promise<PreparedToken[]> {
  try {
    const tokenize = await loadTokenize();
    const raw = tokenize(text, "default", false);
    const tokens: PreparedToken[] = [];
    let pos = 0;

    for (const piece of raw) {
      if (piece.start > pos) {
        const gap = text.slice(pos, piece.start);
        for (const t of segmentDraftGreedy(gap, knownWords)) tokens.push(t);
      }
      const slice = text.slice(piece.start, piece.end);
      if (knownWords.has(slice)) {
        tokens.push({ text: slice, isWord: true });
      } else if (HAN_RE.test(slice) && slice.length > 1) {
        tokens.push(...segmentDraftGreedy(slice, knownWords));
      } else {
        tokens.push({ text: slice, isWord: HAN_RE.test(slice) });
      }
      pos = piece.end;
    }

    if (pos < text.length) {
      for (const t of segmentDraftGreedy(text.slice(pos), knownWords)) tokens.push(t);
    }

    return tokens.length > 0 ? tokens : segmentDraftGreedy(text, knownWords);
  } catch {
    return segmentDraftGreedy(text, knownWords);
  }
}