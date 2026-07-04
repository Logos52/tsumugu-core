/**
 * Derived known-character set for cross-site federation (WO-UNIFY-C C5, item 30).
 *
 * The dictionary site (separate repo) reads `localStorage["tsumugu.knownChars.v1"]`
 * to tint characters on dict pages using the state the reader already tracks.
 *
 * Tint rule (versioned alongside the key — bump `TINT_RULE` if it changes):
 *   A character tints iff it is exactly-known OR it is contained in a known word.
 *
 * Both cases reduce to: take every character of every known entry. A known
 * single-char entry contributes that char (exactly-known); a known multi-char
 * entry contributes each of its chars (contained-in-a-known-word).
 *
 * "Known" uses the engine's default known policy (`isKnown`), the same set the
 * reader and progress math treat as comprehended.
 */

import { type WordStore, isKnown } from "@tsumugu/engine";

export const KNOWN_CHARS_KEY = "tsumugu.knownChars.v1";
export const KNOWN_CHARS_VERSION = 1 as const;
/** Human-readable id for the tint rule this payload was produced under. */
export const TINT_RULE = "exact-known-or-in-known-word@1" as const;

export interface KnownCharsMirror {
  v: typeof KNOWN_CHARS_VERSION;
  rule: typeof TINT_RULE;
  updatedAt: string;
  /** Unique CJK characters, concatenated (compact transport). */
  chars: string;
}

/** Keep only characters that plausibly belong to a Han-script word. */
function isHanChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x3400 && cp <= 0x9fff) || // CJK Unified + Ext A
    (cp >= 0xf900 && cp <= 0xfaff) || // Compatibility Ideographs
    (cp >= 0x20000 && cp <= 0x3ffff) // Ext B..
  );
}

/**
 * Derive the compact known-character set from a live WordStore.
 * Pure — no IO. Returns a stable, sorted string of unique characters.
 */
export function deriveKnownChars(store: WordStore, lang = "zh-Hant"): string {
  const set = new Set<string>();
  for (const entry of store.all(lang)) {
    if (!isKnown(entry.status)) continue;
    for (const ch of entry.word) {
      if (isHanChar(ch)) set.add(ch);
    }
  }
  return Array.from(set).sort().join("");
}

/**
 * Derive + persist the known-character mirror to localStorage. Best-effort:
 * swallows quota/availability errors so it never breaks a grade.
 */
export function writeKnownChars(
  store: WordStore,
  lang = "zh-Hant",
  nowIso: string = new Date().toISOString(),
): void {
  try {
    if (typeof localStorage === "undefined") return;
    const payload: KnownCharsMirror = {
      v: KNOWN_CHARS_VERSION,
      rule: TINT_RULE,
      updatedAt: nowIso,
      chars: deriveKnownChars(store, lang),
    };
    localStorage.setItem(KNOWN_CHARS_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}
