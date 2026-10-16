

import { type WordStore, isKnown } from "@tsumugu/engine";

export const KNOWN_CHARS_KEY = "tsumugu.knownChars.v1";
export const KNOWN_CHARS_VERSION = 1 as const;

export const TINT_RULE = "exact-known-or-in-known-word@1" as const;

export interface KnownCharsMirror {
  v: typeof KNOWN_CHARS_VERSION;
  rule: typeof TINT_RULE;
  updatedAt: string;
  
  chars: string;
}


function isHanChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x3400 && cp <= 0x9fff) || 
    (cp >= 0xf900 && cp <= 0xfaff) || 
    (cp >= 0x20000 && cp <= 0x3ffff) 
  );
}


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
    
  }
}
