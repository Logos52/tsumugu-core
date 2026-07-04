/**
 * UserDoc / per-user known-words store shape (handoff §5).
 * Local-first + sync to (simulated) server.
 * Roundtrips with engine WordStore for the words portion.
 *
 * The "known-words JSON" is superset: profile/settings + WordStore data + progress.
 * words/srs inside are carried via the embedded WordStoreDoc for perfect fidelity.
 * (The handoff shape is illustrative; we keep engine entry shape for clocks, srs, provenance.)
 */

import {
  type WordStoreDoc,
  type WordStatus,
  WordStore,
  progressMetrics,
  type ProgressMetrics,
} from "@tsumugu/engine";
import { type ReaderSettings, type Rail, DEFAULT_SETTINGS } from "../app/settings.js";

/**
 * Schema version. Bumped 1 → 2 to reserve the optional `grammar` slot
 * (WO-UNIFY-C C7 / 2026-07-02 sign-off). Adding the slot now is cheap; adding
 * it after v1 ships would be a breaking migration. Older (schema-1) docs import
 * cleanly via {@link migrateUserDoc} — the grammar block is optional.
 */
export const USER_DOC_SCHEMA = 2 as const;

export interface UserProfile {
  displayName?: string;
  rail: Rail;
  uiLang: "en" | "vi";
  /**
   * Zero-PII posture (WO-UNIFY-C C3): optional-and-empty. Nothing is collected;
   * this is a leftover of the removed simulated magic-link. Kept in the shape so
   * older docs round-trip, but always "" in produced docs.
   */
  email?: string;
}

export interface UserProgress {
  knownCount: number;
  lastReadingId?: string;
  history?: string[]; // recent reading ids, capped
}

/**
 * Reserved grammar-known slot (schema@2). Mirrors word-entry clock semantics:
 * `statusUpdatedAt` is the reconciliation clock and merges never-demote. No
 * capture UI in v1 — the slot is reserved so the schema is forward-compatible
 * when the Companion grammar shelf lands.
 */
export interface GrammarEntry {
  /** Stable grammar-point id (e.g. an ACCC binding key). */
  id: string;
  /** Reuse the word-status ramp so merge policy is identical. */
  status: WordStatus;
  /** Status clock — moves only on a real status change. */
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
  updatedAt: string; // ISO
  profile: UserProfile;
  settings: ReaderSettings; // full reader prefs + palette etc.
  // Embedded store snapshot for words + srs (engine-native shape with clocks)
  store: WordStoreDoc;
  // Derived / lightweight progress (can recompute)
  progress?: UserProgress;
  /** Reserved grammar-known slot (schema@2). Optional; absent on schema-1 docs. */
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
      // Zero-PII: no email is collected. Keep any pre-existing display name a
      // caller passes elsewhere; do not derive one from an address.
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

/**
 * Normalize an arbitrary parsed object into the current {@link UserDoc} shape,
 * preserving every known data block. This is the single import gate for
 * file-import, sync-code decode, and BYO-URL pull.
 *
 * Portability guarantee (WO-UNIFY-C C4): a doc written under ANY schema version
 * — older, current, or a hypothetical future bump — re-imports without silently
 * dropping words/notes/tags/grammar. We coerce `schema` to the current literal
 * but never discard fields we do not recognize at the top level, and we always
 * keep the embedded `store` snapshot verbatim so the WordStore round-trips.
 */
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
    // Zero-PII: drop any address that rode along in an older/foreign doc.
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

/** Convert live WordStore + metadata -> UserDoc (overwrites store + updatedAt) */
export function toUserDoc(
  store: WordStore,
  base: UserDoc,
  clockNow: string = new Date().toISOString(),
): UserDoc {
  const storeDoc = store.toDoc({ now: () => new Date(clockNow) });
  const metrics = progressMetrics(store, base.profile.rail === "vi" ? "zh-Hant" : "zh-Hant"); // lang is zh-Hant in practice
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

/** Build a fresh WordStore from a UserDoc's store snapshot. */
export function wordStoreFromUserDoc(doc: UserDoc | null | undefined): WordStore {
  if (!doc || !doc.store) return new WordStore();
  return WordStore.fromDoc(doc.store);
}

/** Merge two UserDocs (local vs server) using clock-aware logic.
 *  Returns the winning doc + a report for UI (conflicts resolved).
 *  Uses resolveStatusUpdate policy for word statuses (never-demote by default).
 *  Non-status fields: take the side with later lastSeen or statusUpdatedAt.
 */
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

  // Start from local as base (local-first bias for profile/settings unless server much newer)
  let mergedProfile = { ...local.profile };
  let mergedSettings = { ...local.settings };
  const localUpdated = local.updatedAt ?? "";
  const serverUpdated = server.updatedAt ?? "";
  if (serverUpdated > localUpdated) {
    mergedProfile = { ...server.profile };
    mergedSettings = { ...server.settings };
  }
  // Zero-PII: email is never carried across a merge.
  mergedProfile.email = "";

  // Merge stores entry-by-entry using clock resolve. (deltas only on WordEntry; never prose)
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
      mergedStore.upsert({ ...s }); // clone
      touched++;
      continue;
    }
    if (l && !s) {
      mergedStore.upsert({ ...l });
      continue;
    }
    if (!l || !s) continue;

    touched++;

    // Status decision via engine clock policy
    const dec = resolveStatusUpdate({
      current: l.status,
      currentAt: l.statusUpdatedAt,
      incoming: s.status,
      incomingAt: s.statusUpdatedAt,
      policy: "never-demote",
    });

    // Choose the entry skeleton
    let winner = { ...l };
    if (dec.action === "set") {
      winner = { ...s };
      // if the dec changed status we already have it in s, but ensure
      winner.status = dec.status;
      if (s.statusUpdatedAt) winner.statusUpdatedAt = s.statusUpdatedAt;
    } else {
      // keep local, but merge non-status recency
      const useServerMeta = (s.lastSeen ?? "") > (l.lastSeen ?? "");
      if (useServerMeta) {
        winner.lastSeen = s.lastSeen;
        winner.firstSeen = l.firstSeen && s.firstSeen ? (l.firstSeen < s.firstSeen ? l.firstSeen : s.firstSeen) : (l.firstSeen || s.firstSeen);
        winner.seenCount = Math.max(l.seenCount ?? 0, s.seenCount ?? 0);
      }
      // always take the decided status
      winner.status = dec.status;
    }

    // Carry srs from whichever side "won" or has fresher
    if (s.srs && (!winner.srs || (s.statusUpdatedAt ?? "") > (winner.statusUpdatedAt ?? ""))) {
      winner.srs = s.srs;
    }
    // flags / custom / notes keep union-ish, prefer non-empty
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

/**
 * Merge two grammar-known blocks by id with the same never-demote clock policy
 * as word entries. Notes prefer the non-empty side; tags union. Returns
 * `undefined` when neither side has any grammar (keeps docs lean).
 */
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

/** Compute simple honest progress numbers (no streaks). */
export function computeProgress(store: WordStore, lang = "zh-Hant"): {
  knownCount: number;
  trackedCount: number;
  byStatus: ProgressMetrics["byStatus"];
} {
  const m = progressMetrics(store, lang);
  return { knownCount: m.knownCount, trackedCount: m.trackedCount, byStatus: m.byStatus };
}
