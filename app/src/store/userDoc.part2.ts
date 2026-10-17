import { type ReaderSettings, type Rail, DEFAULT_SETTINGS } from "../app/settings.js";

import {
  type WordStoreDoc,
  type WordStatus,
  WordStore,
  progressMetrics,
  type ProgressMetrics,
} from "@tsumugu/engine";

export const USER_DOC_SCHEMA = 2 as const;

interface UserProfile {
  displayName?: string;
  rail: Rail;
  uiLang: "en" | "vi";
  
  email?: string;
}

interface UserProgress {
  knownCount: number;
  lastReadingId?: string;
  history?: string[]; 
}

export interface GrammarEntry {
  
  id: string;
  
  status: WordStatus;
  
  statusUpdatedAt?: string;
  notes?: string;
  tags?: string[];
}

export interface GrammarKnown {
  entries: GrammarEntry[];
}

export interface UserDoc {
  schema: typeof USER_DOC_SCHEMA;
  userId: string;
  updatedAt: string; 
  profile: UserProfile;
  settings: ReaderSettings; 
  
  store: WordStoreDoc;
  
  progress?: UserProgress;
  
  grammar?: GrammarKnown;
}

export function emptyUserDoc(userId: string, email = "", defaults: ReaderSettings): UserDoc {
  const now = new Date().toISOString();
  const emptyStore: WordStoreDoc = {
    schema: "tsumugu/word-store@2",
    updatedAt: now,
    entries: [],
  };
  const trimmed = email.trim();
  return {
    schema: USER_DOC_SCHEMA,
    userId,
    updatedAt: now,
    profile: {
      
      
      rail: defaults.rail,
      uiLang: "vi",
      email: "",
      ...(trimmed ? { displayName: trimmed.split("@")[0] } : {}),
    },
    settings: { ...defaults },
    store: emptyStore,
    progress: { knownCount: 0 },
  };
}

export function migrateUserDoc(input: unknown): UserDoc {
  const raw = (input ?? {}) as Partial<UserDoc> & Record<string, unknown>;
  const store: WordStoreDoc =
    raw.store && typeof raw.store === "object"
      ? (raw.store as WordStoreDoc)
      : { schema: "tsumugu/word-store@2", updatedAt: new Date().toISOString(), entries: [] };

  const profileIn = (raw.profile ?? {}) as Partial<UserProfile>;
  const profile: UserProfile = {
    ...profileIn,
    rail: profileIn.rail ?? "vi",
    uiLang: profileIn.uiLang ?? "vi",
    
    email: "",
  };

  const doc: UserDoc = {
    schema: USER_DOC_SCHEMA,
    userId: typeof raw.userId === "string" ? raw.userId : "local",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    profile,
    settings: (raw.settings as ReaderSettings) ?? { ...DEFAULT_SETTINGS },
    store,
    ...(raw.progress ? { progress: raw.progress as UserProgress } : {}),
    ...(raw.grammar ? { grammar: normalizeGrammar(raw.grammar) } : {}),
  };
  return doc;
}

function normalizeGrammar(input: unknown): GrammarKnown {
  const g = (input ?? {}) as Partial<GrammarKnown>;
  const entries = Array.isArray(g.entries) ? g.entries.filter((e) => e && typeof e.id === "string") : [];
  return { entries };
}

export function toUserDoc(
  store: WordStore,
  base: UserDoc,
  clockNow: string = new Date().toISOString(),
): UserDoc {
  const storeDoc = store.toDoc({ now: () => new Date(clockNow) });
  const metrics = progressMetrics(store, base.profile.rail === "vi" ? "zh-Hant" : "zh-Hant"); 
  return {
    ...base,
    updatedAt: clockNow,
    store: storeDoc,
    progress: {
      knownCount: metrics.knownCount,
      lastReadingId: base.progress?.lastReadingId,
      history: base.progress?.history,
    },
  };
}
