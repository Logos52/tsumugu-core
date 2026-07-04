import {
  enDefinitionFromCedictGlosses,
  type DictEntry,
  type LanguagePack,
  type VaultIO,
} from "@tsumugu/engine";

import { createZhHantBrowserPack } from "./zhHant.js";

export interface BrowserDict {
  lookup(word: string): Promise<DictEntry | undefined>;
}

interface CedictRaw {
  py?: string;
  g?: string | string[];
  s?: string;
}

type DictFileShape = Record<string, CedictRaw>;

function cedictGlossLines(raw: CedictRaw): string[] {
  if (raw.g === undefined) return [];
  return Array.isArray(raw.g) ? raw.g : [raw.g];
}

function fromCedict(word: string, raw: CedictRaw): DictEntry {
  const lines = cedictGlossLines(raw);
  const entry: DictEntry = {
    term: word,
    gloss: "",
    ...(raw.py ? { reading: raw.py } : {}),
    source: "packaged",
  };
  if (lines.length > 0) {
    const { en, senses, legacyGloss } = enDefinitionFromCedictGlosses(lines);
    entry.gloss = legacyGloss;
    entry.senses = senses;
    entry.definitions = { en };
  }
  return entry;
}

function vaultBackedDict(vault: VaultIO, lang: string): BrowserDict {
  const path = `tsumugu/packs/${lang}/dict.json`;
  let cache: Promise<DictFileShape | null> | null = null;

  const load = (): Promise<DictFileShape | null> => {
    if (!cache) {
      cache = vault
        .readText(path)
        .then((text) => {
          if (text == null) return null;
          try {
            return JSON.parse(text) as DictFileShape;
          } catch {
            return null;
          }
        })
        .catch(() => null);
    }
    return cache;
  };

  return {
    async lookup(word: string): Promise<DictEntry | undefined> {
      const data = await load();
      const raw = data?.[word];
      if (!raw) return undefined;
      return fromCedict(word, raw);
    },
  };
}

export function packForLang(
  lang: string,
  opts?: { vault?: VaultIO | null },
): LanguagePack | null {
  const vault = opts?.vault ?? null;
  switch (lang) {
    case "zh-Hant":
      return createZhHantBrowserPack(
        vault ? { dict: vaultBackedDict(vault, "zh-Hant") } : {},
      );
    default:
      return null;
  }
}

/** Simple LRU cache (monorepo hygiene 11.5 for manifests, audio regions, dict shards).
 * Bounded, O(1) get/put. Used by lazy loads.
 */
export class LRU<K, V> {
  private max: number;
  private map = new Map<K, V>();
  constructor(max = 128) { this.max = max; }
  get(k: K): V | undefined {
    const v = this.map.get(k);
    if (v !== undefined) { this.map.delete(k); this.map.set(k, v); }
    return v;
  }
  set(k: K, v: V): void {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.max) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
  }
  has(k: K) { return this.map.has(k); }
  clear() { this.map.clear(); }
}