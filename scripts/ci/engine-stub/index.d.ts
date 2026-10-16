export interface PreparedToken {
  text: string;
  isWord: boolean;
  [key: string]: any;
}

export interface PrebakedEntry {
  term: string;
  gloss: string;
  reading?: string;
  examples?: any[];
  collocations?: any[];
  [key: string]: any;
}

export interface PreparedContent {
  tokens: PreparedToken[];
  glossary: Record<string, PrebakedEntry>;
  [key: string]: any;
}

export interface Token {
  text: string;
  start?: number;
  end?: number;
  isWord: boolean;
  [key: string]: any;
}

export interface WordEntry {
  lang: string;
  word: string;
  status: string;
  [key: string]: any;
}

export interface WordStore {
  all(lang?: string): WordEntry[];
  getStatus(lang: string, word: string): string;
  upsert(entry: any): void;
  toJSON(...args: any[]): string;
  [key: string]: any;
}

export declare const WordStore: {
  new (...args: any[]): WordStore;
  fromJSON(raw: string): WordStore;
  fromDoc(doc: any): WordStore;
};

export type WordStatus = string;

export interface WordStoreDoc {
  schema: string;
  updatedAt: string;
  entries: WordEntry[];
  [key: string]: any;
}

export interface DictEntry {
  term: string;
  gloss?: string;
  reading?: string;
  [key: string]: any;
}

export interface KnownPolicy {
  knownStatuses: string[];
  [key: string]: any;
}

export declare const DEFAULT_KNOWN_POLICY: KnownPolicy;

export interface LanguagePack {
  id: string;
  name: string;
  direction: string;
  segmenter: (text: string) => any;
  dictionaryProvider: (word: string) => any;
  phoneticLayer: {
    id: string;
    reading: (word: string, entry: any) => any;
    toneClasses?: (word: string, reading: string) => any;
    [key: string]: any;
  };
  levelingModel: (...args: any[]) => any;
  scriptNormalizer: (text: string) => any;
  [key: string]: any;
}

export interface VaultIO {
  readText(path: string): Promise<string | null>;
  [key: string]: any;
}

export declare const PREPARED_CONTENT_SCHEMA_V2: string;

export declare function parsePreparedContent(...args: any[]): PreparedContent;
export declare function lookupPrebaked(...args: any[]): PrebakedEntry | undefined;
export declare function parseEncodingPage(...args: any[]): any;
export declare function isEncodingPageDoc(...args: any[]): boolean;
export declare function buildApkg(...args: any[]): any;
export declare function crossSeed(...args: any[]): any;
export declare function enDefinitionFromCedictGlosses(...args: any[]): any;
export declare function hotkeyToStatus(...args: any[]): any;
export declare function isKnown(...args: any[]): boolean;
export declare function progressMetrics(...args: any[]): any;
export declare function resolveStatusUpdate(...args: any[]): any;
export declare function statusColorClass(...args: any[]): string;
export declare function validateHighlightSpans(...args: any[]): any;

export interface BridgeRegistry {
  has(lang: string, word: string): boolean;
  set(lang: string, word: string, info: any): void;
  all(lang: string): Array<{ word: string; info: any }>;
  [key: string]: any;
}

export declare const BridgeRegistry: new (...args: any[]) => BridgeRegistry;

export interface BridgeInfo {
  morphemes?: any[];
  [key: string]: any;
}

export interface ScoreResult {
  targetRecycle?: Array<{ word: string; count: number; ok: boolean }>;
  getStatus?: (word: string) => string;
  [key: string]: any;
}

export declare function scoreCI(input: ScoreResult): ScoreResult;

export declare const systemClock: any;

export type AnkiDeck = any;
export type AnkiNote = any;
export type BridgeMorpheme = any;
export type Clock = any;
export type CrossSeedResult = any;
export type EncodingPageDoc = any;
export type ExampleSentence = any;
export type MonoDefinition = any;
export type ProgressMetrics = any;
export type RawPreparedContent = any;
