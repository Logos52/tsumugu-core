

import {
  type WordStoreDoc,
  type WordStatus,
  WordStore,
  progressMetrics,
  type ProgressMetrics,
} from "@tsumugu/engine";
import { type ReaderSettings, type Rail, DEFAULT_SETTINGS } from "../app/settings.js";


export const USER_DOC_SCHEMA = 2 as const;

export interface UserProfile {
  displayName?: string;
  rail: Rail;
  uiLang: "en" | "vi";
  
  email?: string;
}

export interface UserProgress {
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


export function wordStoreFromUserDoc(doc: UserDoc | null | undefined): WordStore {
  if (!doc || !doc.store) return new WordStore();
  return WordStore.fromDoc(doc.store);
}


import { resolveStatusUpdate } from "@tsumugu/engine";

export interface MergeReport {
  hadConflict: boolean;
  wordsTouched: number;
  note?: string;
}

export function mergeUserDocs(
  local: UserDoc,
  server: UserDoc | null | undefined,
  nowIso: string = new Date().toISOString(),
): { merged: UserDoc; report: MergeReport } {
  if (!server) {
    return { merged: { ...local, updatedAt: nowIso }, report: { hadConflict: false, wordsTouched: 0 } };
  }

  
  let mergedProfile = { ...local.profile };
  let mergedSettings = { ...local.settings };
  const localUpdated = local.updatedAt ?? "";
  const serverUpdated = server.updatedAt ?? "";
  if (serverUpdated > localUpdated) {
    mergedProfile = { ...server.profile };
    mergedSettings = { ...server.settings };
  }
  
  mergedProfile.email = "";

  
  const lStore = wordStoreFromUserDoc(local);
  const sStore = wordStoreFromUserDoc(server);
  const mergedStore = new WordStore();

  const allKeys = new Set<string>();
  for (const e of lStore.all()) allKeys.add(`${e.lang}\u0000${e.word}`);
  for (const e of sStore.all()) allKeys.add(`${e.lang}\u0000${e.word}`);

  let hadConflict = false;
  let touched = 0;

  for (const k of allKeys) {
    const [lang = "", word = ""] = k.split("\u0000");
    const l = lang && word ? lStore.get(lang, word) : undefined;
    const s = lang && word ? sStore.get(lang, word) : undefined;

    if (!l && s) {
      mergedStore.upsert({ ...s }); 
      touched++;
      continue;
    }
    if (l && !s) {
      mergedStore.upsert({ ...l });
      continue;
    }
    if (!l || !s) continue;

    touched++;

    
    const dec = resolveStatusUpdate({
      current: l.status,
      currentAt: l.statusUpdatedAt,
      incoming: s.status,
      incomingAt: s.statusUpdatedAt,
      policy: "never-demote",
    });

    
    let winner = { ...l };
    if (dec.action === "set") {
      winner = { ...s };
      
      winner.status = dec.status;
      if (s.statusUpdatedAt) winner.statusUpdatedAt = s.statusUpdatedAt;
    } else {
      
      const useServerMeta = (s.lastSeen ?? "") > (l.lastSeen ?? "");
      if (useServerMeta) {
        winner.lastSeen = s.lastSeen;
        winner.firstSeen = l.firstSeen && s.firstSeen ? (l.firstSeen < s.firstSeen ? l.firstSeen : s.firstSeen) : (l.firstSeen || s.firstSeen);
        winner.seenCount = Math.max(l.seenCount ?? 0, s.seenCount ?? 0);
      }
      
      winner.status = dec.status;
    }

    
    if (s.srs && (!winner.srs || (s.statusUpdatedAt ?? "") > (winner.statusUpdatedAt ?? ""))) {
      winner.srs = s.srs;
    }
    
    if (s.flagged && !winner.flagged) winner.flagged = true;
    if (s.flagNote && !winner.flagNote) winner.flagNote = s.flagNote;
    winner.custom = { ...(l.custom ?? {}), ...(s.custom ?? {}) };
    winner.notes = winner.notes || s.notes;
    winner.tags = Array.from(new Set([...(l.tags ?? []), ...(s.tags ?? [])]));

    mergedStore.upsert(winner);

    if (dec.code === "never-demote" || (dec.action === "keep" && (s.status !== l.status))) {
      hadConflict = true;
    }
  }

  const mergedStoreDoc = mergedStore.toDoc({ now: () => new Date(nowIso) });
  const metrics = progressMetrics(mergedStore, "zh-Hant");

  const grammar = mergeGrammar(local.grammar, server.grammar);

  const merged: UserDoc = {
    schema: USER_DOC_SCHEMA,
    userId: local.userId || server.userId,
    updatedAt: nowIso,
    profile: mergedProfile,
    settings: mergedSettings,
    store: mergedStoreDoc,
    progress: {
      knownCount: metrics.knownCount,
      lastReadingId: local.progress?.lastReadingId || server.progress?.lastReadingId,
      history: (local.progress?.history || []).concat(server.progress?.history || []).slice(-20),
    },
    ...(grammar ? { grammar } : {}),
  };

  return {
    merged,
    report: {
      hadConflict,
      wordsTouched: touched,
      note: hadConflict ? "Conflicts resolved via clock/never-demote policy." : undefined,
    },
  };
}


export function mergeGrammar(
  local: GrammarKnown | undefined,
  server: GrammarKnown | undefined,
): GrammarKnown | undefined {
  const l = local?.entries ?? [];
  const s = server?.entries ?? [];
  if (l.length === 0 && s.length === 0) return undefined;

  const byId = new Map<string, GrammarEntry>();
  for (const e of l) byId.set(e.id, { ...e });
  for (const inc of s) {
    const cur = byId.get(inc.id);
    if (!cur) {
      byId.set(inc.id, { ...inc });
      continue;
    }
    const dec = resolveStatusUpdate({
      current: cur.status,
      currentAt: cur.statusUpdatedAt,
      incoming: inc.status,
      incomingAt: inc.statusUpdatedAt,
      policy: "never-demote",
    });
    const merged: GrammarEntry = {
      id: cur.id,
      status: dec.status,
      statusUpdatedAt:
        dec.action === "set" && inc.statusUpdatedAt ? inc.statusUpdatedAt : cur.statusUpdatedAt,
      notes: cur.notes || inc.notes,
      tags: Array.from(new Set([...(cur.tags ?? []), ...(inc.tags ?? [])])),
    };
    if ((merged.tags?.length ?? 0) === 0) delete merged.tags;
    if (!merged.notes) delete merged.notes;
    byId.set(cur.id, merged);
  }
  return { entries: Array.from(byId.values()) };
}


export function computeProgress(store: WordStore, lang = "zh-Hant"): {
  knownCount: number;
  trackedCount: number;
  byStatus: ProgressMetrics["byStatus"];
} {
  const m = progressMetrics(store, lang);
  return { knownCount: m.knownCount, trackedCount: m.trackedCount, byStatus: m.byStatus };
}
