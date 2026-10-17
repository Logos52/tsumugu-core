import {
  BridgeRegistry,
  crossSeed,
  type WordStore,
  type WordStatus,
  type BridgeInfo,
  type CrossSeedResult,
} from "@tsumugu/engine";

const KNOWN: WordStatus[] = ["4", "known"];

export function knownHanziFromStore(store: WordStore, bridgeLang: string): Set<string> {
  const out = new Set<string>();
  for (const e of store.all(bridgeLang)) {
    if (KNOWN.includes(e.status)) for (const ch of e.word) out.add(ch);
  }
  return out;
}

export interface BridgeRecord {
  word: string;
  info: BridgeInfo;
}

export interface CacheResult {
  added: number;
  updated: number;
  crossSeed: CrossSeedResult;
}

export function cacheBridges(
  registry: BridgeRegistry,
  targetLang: string,
  records: BridgeRecord[],
  knownEtyma: Set<string>,
): CacheResult {
  let added = 0;
  let updated = 0;
  for (const r of records) {
    if (registry.has(targetLang, r.word)) updated++;
    else added++;
    registry.set(targetLang, r.word, r.info);
  }
  return { added, updated, crossSeed: crossSeedFromRegistry(registry, targetLang, knownEtyma) };
}

export function crossSeedFromRegistry(
  registry: BridgeRegistry,
  targetLang: string,
  knownEtyma: Set<string>,
): CrossSeedResult {
  const entries = registry
    .all(targetLang)
    .map((e) => ({ word: e.word, bridge: e.info }));
  return crossSeed({ targetLang, entries, knownEtyma });
}

export function bridgeSkeleton(bridgeLang: string): BridgeInfo {
  return { bridgeLang, confidence: 0, corrected: false };
}
