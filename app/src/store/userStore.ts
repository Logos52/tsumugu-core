/**
 * UserStore — owns per-user known-words doc + WordStore + sync layer.
 *
 * - Local-first: works fully logged out (persists to same key as before for continuity).
 * - On login: pull simulated server doc, clock-aware merge (via userDoc helpers + resolve),
 *   replace in-memory store, push back.
 * - Debounced autosave to local + (if logged in) sim-server.
 * - Abstraction ready for real /store GET/PUT later: replace SIM with fetch impl.
 * - Exposes get/set that feed into progress + updatedAt.
 *
 * Callers (state, catalog, reader) continue to use the inner WordStore for getStatus etc.
 * Mutations should go through UserStore mutators OR notify after direct (we wire notifies).
 */

import { WordStore, type Clock, systemClock } from "@tsumugu/engine";
import {
  type UserDoc,
  USER_DOC_SCHEMA,
  emptyUserDoc,
  toUserDoc,
  wordStoreFromUserDoc,
  mergeUserDocs,
  migrateUserDoc,
  computeProgress,
  type MergeReport,
} from "./userDoc.js";
import { writeKnownChars } from "./knownChars.js";
import type { ReaderSettings } from "../app/settings.js";
import { loadSettings } from "../app/settings.js"; // for defaults
import {
  createDefaultRemoteStore,
  type RemoteStore,
} from "./remoteStore.js";

const LOCAL_STORE_KEY = "tsumugu-core/word-store"; // keep compat with prior persist
const USER_DOC_KEY = "tsumugu-core/user-doc"; // current logged-in user's local cache of full doc

// Simple debounce util (no deps)
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: any;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

export type SyncStatus = "idle" | "syncing" | "merged" | "conflict" | "offline" | "error";

export interface AuthSnapshot {
  userId: string | null;
  email: string | null;
  status: "logged-out" | "logging-in" | "logged-in";
}

export type UserStoreListener = (ev: "doc" | "store" | "sync", data?: any) => void;

export class UserStore {
  private wordStore: WordStore;
  private doc: UserDoc | null = null;
  private auth: AuthSnapshot = { userId: null, email: null, status: "logged-out" };
  private listeners = new Set<UserStoreListener>();
  private dirty = false;
  private saveTimer: any = null;
  private syncStatus: SyncStatus = "idle";

  private readonly clock: Clock;
  private readonly remote: RemoteStore;

  constructor(clock: Clock = systemClock, remote: RemoteStore = createDefaultRemoteStore()) {
    this.clock = clock;
    this.remote = remote;
    this.wordStore = this.loadLocalWordStore();
    // Seed the federation known-char mirror from whatever loaded (WO-UNIFY-C C5).
    writeKnownChars(this.wordStore);
    // Best-effort restore of last logged-in session (local cache + sim doc)
    this.tryRestoreSession();
  }

  private tryRestoreSession(): void {
    try {
      const raw = localStorage.getItem("tsumugu-session");
      if (!raw) return;
      const sess = JSON.parse(raw) as { userId: string; email: string };
      if (sess?.userId && sess?.email) {
        // fire-and-forget async restore; will merge on load
        // Use setTimeout to let ctor finish
        setTimeout(() => {
          void (async () => {
            const sDoc = (await this.remote.get(sess.userId)) || this.loadLocalUserDoc();
            if (sDoc) {
              this.auth = { userId: sess.userId, email: sess.email, status: "logged-in" };
              this.doc = sDoc;
              this.wordStore = wordStoreFromUserDoc(sDoc);
              this.emit("doc");
              this.emit("store");
            }
          })();
        }, 0);
        return;
      }
    } catch {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public surface for existing code (reader/catalog/state)

  getWordStore(): WordStore {
    return this.wordStore;
  }

  getAuth(): AuthSnapshot {
    return { ...this.auth };
  }

  getDoc(): UserDoc | null {
    return this.doc ? { ...this.doc } : null;
  }

  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  // For settings/profile merge into doc when logged in
  getCurrentSettings(): ReaderSettings | null {
    return this.doc ? { ...this.doc.settings } : null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence (local always; server sim when logged in)

  private loadLocalWordStore(): WordStore {
    try {
      const raw = localStorage.getItem(LOCAL_STORE_KEY);
      if (!raw) return new WordStore();
      return WordStore.fromJSON(raw);
    } catch {
      return new WordStore();
    }
  }

  private saveLocalWordStore(): void {
    try {
      localStorage.setItem(LOCAL_STORE_KEY, this.wordStore.toJSON(this.clock));
    } catch {}
  }

  // Also keep a local copy of full doc for the logged in user
  private saveLocalUserDoc(doc: UserDoc): void {
    try {
      localStorage.setItem(USER_DOC_KEY, JSON.stringify(doc));
    } catch {}
  }

  private loadLocalUserDoc(): UserDoc | null {
    try {
      const raw = localStorage.getItem(USER_DOC_KEY);
      return raw ? (JSON.parse(raw) as UserDoc) : null;
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Save / sync

  private scheduleSave = debounce(() => {
    this.flushSave();
  }, 650);

  /** Call after any mutation to WordStore (from state or direct). */
  notifyChange(): void {
    this.dirty = true;
    this.scheduleSave();
    this.emit("store");
  }

  private flushSave(immediate = false): void {
    if (!this.dirty && !immediate) return;
    this.dirty = false;

    const now = this.clock.now().toISOString();

    if (this.doc && this.auth.userId) {
      // Update doc from current store + stamp
      this.doc = toUserDoc(this.wordStore, this.doc, now);
      this.saveLocalUserDoc(this.doc);
      // Push to remote store (local sim or fetch API)
      void this.remote.put(this.auth.userId, this.doc);
      this.setSync("syncing");
      // Simulate network roundtrip
      setTimeout(() => {
        this.setSync("idle");
      }, 120);
    } else {
      // Logged out: keep classic local word store
      this.saveLocalWordStore();
    }

    this.emit("doc");
  }

  private setSync(s: SyncStatus): void {
    this.syncStatus = s;
    void import("../build/analytics.js").then(({ trackEvent }) => trackEvent("sync", { status: s }));
    this.emit("sync", s);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Login / merge flow (core requirement)

  /** Perform login: load/create server snapshot, merge local work (clock-aware), adopt, push. */
  async login(userId: string, email: string, initialSettings?: ReaderSettings): Promise<{ merged: boolean; report?: any }> {
    this.auth = { userId, email, status: "logging-in" };
    this.emit("doc");

    const defaults = initialSettings ?? loadSettings();
    let serverDoc = await this.remote.get(userId);

    if (!serverDoc) {
      // First time: seed a fresh doc on "server"
      serverDoc = emptyUserDoc(userId, email, defaults);
      await this.remote.put(userId, serverDoc);
    }

    // Always merge from the live in-memory wordStore (anon work or prior) + server
    // This ensures "login again" or "second browser sim" pulls remote changes.
    const freshServer = (await this.remote.get(userId)) || serverDoc || emptyUserDoc(userId, email, defaults);
    const baseForLocal = this.doc && this.doc.userId === userId ? this.doc : (this.loadLocalUserDoc() || emptyUserDoc(userId, email, defaults));
    const effectiveLocal: UserDoc = {
      ...baseForLocal,
      store: this.wordStore.toDoc(this.clock),
      updatedAt: new Date().toISOString(),
    };

    // Core merge
    const { merged: mergedDoc, report } = mergeUserDocs(effectiveLocal, freshServer, this.clock.now().toISOString());

    // Adopt
    this.doc = mergedDoc;
    this.wordStore = wordStoreFromUserDoc(mergedDoc);
    this.auth = { userId, email, status: "logged-in" };

    // Persist session marker for restore + the reconciled
    try { localStorage.setItem("tsumugu-session", JSON.stringify({ userId, email })); } catch {}
    this.saveLocalWordStore();
    this.saveLocalUserDoc(this.doc);
    await this.remote.put(userId, this.doc); // push reconciled

    this.dirty = false;
    this.setSync(report.hadConflict ? "conflict" : "merged");

    this.emit("doc");
    this.emit("store");

    // settle sync status
    setTimeout(() => {
      if (this.syncStatus === "merged" || this.syncStatus === "conflict") this.setSync("idle");
    }, 900);

    return { merged: true, report };
  }

  /** Sign out: clear session. Keep the local word cache (and last doc) for next anon use or re-login merge. */
  logout(): void {
    if (this.auth.userId) {
      // Flush last state to local
      this.flushSave(true);
    }
    this.auth = { userId: null, email: null, status: "logged-out" };
    this.doc = null;
    this.setSync("idle");
    try { localStorage.removeItem("tsumugu-session"); } catch {}
    // Do NOT clear the wordStore or LOCAL_STORE_KEY — local-first parity
    this.emit("doc");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Profile / settings updates (when logged in)

  updateProfile(patch: Partial<{ displayName?: string; rail?: "en"|"vi"; uiLang?: "en"|"vi"; email?: string }>): void {
    if (!this.doc) return;
    this.doc.profile = { ...this.doc.profile, ...patch };
    this.doc.updatedAt = this.clock.now().toISOString();
    this.dirty = true;
    this.scheduleSave();
    this.emit("doc");
  }

  updateSettings(patch: Partial<ReaderSettings>): void {
    if (!this.doc) {
      // anon still works via old path; nothing to do here
      return;
    }
    this.doc.settings = { ...this.doc.settings, ...patch };
    this.doc.updatedAt = this.clock.now().toISOString();
    this.dirty = true;
    this.scheduleSave();
    this.emit("doc");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Import seed using engine reconcile machinery (re-exported resolve etc.)
  // Caller provides records already normalized (or we can accept raw for srsAdapter inside)

  applySeedRecords(
    records: Array<{ lang: string; word: string; status?: import("@tsumugu/engine").WordStatus; at?: string }>,
  ): { applied: number; conflicts: number } {
    if (records.length === 0) return { applied: 0, conflicts: 0 };
    // For simplicity we convert to WordEntry shape then run the same merge logic as server
    // Build a tiny "server" doc from the imported records and merge.
    const seedStore = new WordStore();
    const now = this.clock.now().toISOString();
    for (const r of records) {
      if (!r.word) continue;
      const lang = r.lang || "zh-Hant";
      seedStore.setStatus(lang, r.word, r.status ?? "4", this.clock, {
        source: "import",
        origin: "import",
        at: r.at ?? now,
      });
    }
    const seedDoc: UserDoc = {
      schema: USER_DOC_SCHEMA,
      userId: this.auth.userId || "import-seed",
      updatedAt: now,
      profile: this.doc?.profile ?? { rail: "vi", uiLang: "vi", email: "" },
      settings: this.doc?.settings ?? loadSettings(),
      store: seedStore.toDoc(this.clock),
    };

    const baseDoc = this.doc ?? {
      ...emptyUserDoc(this.auth.userId || "local", "", loadSettings()),
      store: this.wordStore.toDoc(this.clock),
    };

    const { merged: mergedDoc, report } = mergeUserDocs(baseDoc, seedDoc, now);

    this.doc = mergedDoc;
    this.wordStore = wordStoreFromUserDoc(mergedDoc);
    this.saveLocalWordStore();
    if (this.auth.userId) void this.remote.put(this.auth.userId, mergedDoc);
    this.dirty = false;

    this.emit("store");
    this.emit("doc");

    return { applied: report.wordsTouched, conflicts: report.hadConflict ? 1 : 0 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dev helpers for testing merge/conflict (per task)

  /** Force a word into local and a *different* status+older clock into sim-server (for same uid). */
  forceConflictDemo(word = "望", lang = "zh-Hant"): void {
    if (!this.auth.userId) {
      console.warn("[UserStore] forceConflict requires being logged in (sim)");
      return;
    }
    const uid = this.auth.userId;
    const now = Date.now();

    // Local: mark as known recently
    this.wordStore.setStatus(lang, word, "known", this.clock, { at: new Date(now - 1000).toISOString() });
    this.notifyChange();

    // Server side: put an older "new"
    void (async () => {
      let server = await this.remote.get(uid);
      if (!server) server = emptyUserDoc(uid, this.auth.email!, loadSettings());
      const sStore = wordStoreFromUserDoc(server);
      sStore.setStatus(lang, word, "1", this.clock, { at: new Date(now - 1000 * 3600 * 24 * 3).toISOString() }); // 3d ago
      server = toUserDoc(sStore, server, new Date(now - 1000 * 3600 * 24 * 2).toISOString());
      await this.remote.put(uid, server);
    })();

    this.setSync("conflict");
    console.info("[UserStore] Forced conflict on", `${lang}:${word}. Login or re-merge to observe.`);
  }

  /** Pretend another browser/device edited the sim server for current user. */
  simulateOtherDeviceEdit(word = "學習", status: import("@tsumugu/engine").WordStatus = "4", lang = "zh-Hant"): void {
    if (!this.auth.userId) {
      console.warn("[UserStore] simulateOther requires logged-in sim user");
      return;
    }
    const uid = this.auth.userId;
    void (async () => {
      let server = await this.remote.get(uid);
      if (!server) server = emptyUserDoc(uid, this.auth.email!, loadSettings());
      const sStore = wordStoreFromUserDoc(server);
      sStore.setStatus(lang, word, status, this.clock, { at: new Date().toISOString() });
      server = toUserDoc(sStore, server);
      await this.remote.put(uid, server);
    })();
    console.info("[UserStore] Other device wrote", `${lang}:${word}=${status} to sim remote.`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Events for UI

  subscribe(fn: UserStoreListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(ev: "doc" | "store" | "sync", data?: any): void {
    // Federation mirror: refresh the known-char set on every word-store change
    // (WO-UNIFY-C C5). Best-effort; writeKnownChars swallows its own errors.
    if (ev === "store") writeKnownChars(this.wordStore);
    for (const fn of this.listeners) {
      try { fn(ev, data); } catch {}
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Export / delete

  exportJSON(): string {
    return JSON.stringify(this.exportDoc(), null, 2);
  }

  /** Current UserDoc snapshot (store folded in), for file export / sync code. */
  exportDoc(): UserDoc {
    const base = this.doc ?? emptyUserDoc("export", "", loadSettings());
    return toUserDoc(this.wordStore, base);
  }

  /**
   * Import a full UserDoc (from file, sync code, or BYO-URL pull) and merge it
   * into the current state with the clock-aware, never-demote policy — the SAME
   * merge as login. No naive last-write-wins path. Adopts the merged store and
   * persists locally. Returns the merge report.
   */
  importUserDoc(incoming: unknown, nowIso: string = this.clock.now().toISOString()): { report: MergeReport } {
    const inc = migrateUserDoc(incoming);
    const base: UserDoc = this.doc
      ? { ...this.doc, store: this.wordStore.toDoc(this.clock), updatedAt: nowIso }
      : {
          ...emptyUserDoc(this.auth.userId || "local", "", loadSettings()),
          store: this.wordStore.toDoc(this.clock),
          updatedAt: nowIso,
        };

    const { merged, report } = mergeUserDocs(base, inc, nowIso);

    this.doc = merged;
    this.wordStore = wordStoreFromUserDoc(merged);
    this.saveLocalWordStore();
    if (this.auth.userId) {
      this.saveLocalUserDoc(merged);
      void this.remote.put(this.auth.userId, merged);
    }
    this.dirty = false;

    this.emit("store");
    this.emit("doc");
    return { report };
  }

  /**
   * Pull from a BYO URL (Stage-1 pull-only) and merge. Writes stay manual.
   * Reuses {@link importUserDoc}, so the never-demote invariant holds.
   */
  async pullFromUrl(url: string): Promise<{ report: MergeReport }> {
    const { UrlRemoteStore } = await import("./remoteStore.js");
    const remote = new UrlRemoteStore(url);
    const remoteDoc = await remote.get(this.auth.userId || "local");
    if (!remoteDoc) return { report: { hadConflict: false, wordsTouched: 0, note: "Nothing to pull." } };
    return this.importUserDoc(remoteDoc);
  }

  /** Delete account: nuke sim server + local doc cache. Keep a copy of words in anon store? */
  deleteAccount(): void {
    const uid = this.auth.userId;
    if (uid) void this.remote.delete(uid);
    try { localStorage.removeItem(USER_DOC_KEY); } catch {}
    // Clear memory doc but keep the wordStore content as local anon fallback (per spec "export + delete fully")
    this.doc = null;
    this.auth = { userId: null, email: null, status: "logged-out" };
    // Do not clear wordStore — user may want the data; they can export first.
    this.setSync("idle");
    this.emit("doc");
  }

  /** One-time bootstrap: if previously had anon store, it is already in memory. */
  ensureAnonLoaded(): void {
    // noop; ctor did it
  }
}

// Singleton for the app (simple global state, no DI needed)
let _instance: UserStore | null = null;

export function getUserStore(): UserStore {
  if (!_instance) _instance = new UserStore();
  return _instance;
}

export function resetUserStoreForTest(): void {
  _instance = null;
}
