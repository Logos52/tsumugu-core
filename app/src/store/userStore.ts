

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
import { loadSettings } from "../app/settings.js"; 
import {
  createDefaultRemoteStore,
  type RemoteStore,
} from "./remoteStore.js";

const LOCAL_STORE_KEY = "tsumugu-core/word-store"; 
const USER_DOC_KEY = "tsumugu-core/user-doc"; 


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
    
    writeKnownChars(this.wordStore);
    
    this.tryRestoreSession();
  }

  private tryRestoreSession(): void {
    try {
      const raw = localStorage.getItem("tsumugu-session");
      if (!raw) return;
      const sess = JSON.parse(raw) as { userId: string; email: string };
      if (sess?.userId && sess?.email) {
        
        
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

  
  getCurrentSettings(): ReaderSettings | null {
    return this.doc ? { ...this.doc.settings } : null;
  }

  
  

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

  
  

  private scheduleSave = debounce(() => {
    this.flushSave();
  }, 650);

  
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
      
      this.doc = toUserDoc(this.wordStore, this.doc, now);
      this.saveLocalUserDoc(this.doc);
      
      void this.remote.put(this.auth.userId, this.doc);
      this.setSync("syncing");
      
      setTimeout(() => {
        this.setSync("idle");
      }, 120);
    } else {
      
      this.saveLocalWordStore();
    }

    this.emit("doc");
  }

  private setSync(s: SyncStatus): void {
    this.syncStatus = s;
    void import("../build/analytics.js").then(({ trackEvent }) => trackEvent("sync", { status: s }));
    this.emit("sync", s);
  }

  
  

  
  async login(userId: string, email: string, initialSettings?: ReaderSettings): Promise<{ merged: boolean; report?: any }> {
    this.auth = { userId, email, status: "logging-in" };
    this.emit("doc");

    const defaults = initialSettings ?? loadSettings();
    let serverDoc = await this.remote.get(userId);

    if (!serverDoc) {
      
      serverDoc = emptyUserDoc(userId, email, defaults);
      await this.remote.put(userId, serverDoc);
    }

    
    
    const freshServer = (await this.remote.get(userId)) || serverDoc || emptyUserDoc(userId, email, defaults);
    const baseForLocal = this.doc && this.doc.userId === userId ? this.doc : (this.loadLocalUserDoc() || emptyUserDoc(userId, email, defaults));
    const effectiveLocal: UserDoc = {
      ...baseForLocal,
      store: this.wordStore.toDoc(this.clock),
      updatedAt: new Date().toISOString(),
    };

    
    const { merged: mergedDoc, report } = mergeUserDocs(effectiveLocal, freshServer, this.clock.now().toISOString());

    
    this.doc = mergedDoc;
    this.wordStore = wordStoreFromUserDoc(mergedDoc);
    this.auth = { userId, email, status: "logged-in" };

    
    try { localStorage.setItem("tsumugu-session", JSON.stringify({ userId, email })); } catch {}
    this.saveLocalWordStore();
    this.saveLocalUserDoc(this.doc);
    await this.remote.put(userId, this.doc); 

    this.dirty = false;
    this.setSync(report.hadConflict ? "conflict" : "merged");

    this.emit("doc");
    this.emit("store");

    
    setTimeout(() => {
      if (this.syncStatus === "merged" || this.syncStatus === "conflict") this.setSync("idle");
    }, 900);

    return { merged: true, report };
  }

  
  logout(): void {
    if (this.auth.userId) {
      
      this.flushSave(true);
    }
    this.auth = { userId: null, email: null, status: "logged-out" };
    this.doc = null;
    this.setSync("idle");
    try { localStorage.removeItem("tsumugu-session"); } catch {}
    
    this.emit("doc");
  }

  
  

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
      
      return;
    }
    this.doc.settings = { ...this.doc.settings, ...patch };
    this.doc.updatedAt = this.clock.now().toISOString();
    this.dirty = true;
    this.scheduleSave();
    this.emit("doc");
  }

  
  
  

  applySeedRecords(
    records: Array<{ lang: string; word: string; status?: import("@tsumugu/engine").WordStatus; at?: string }>,
  ): { applied: number; conflicts: number } {
    if (records.length === 0) return { applied: 0, conflicts: 0 };
    
    
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

  
  

  
  forceConflictDemo(word = "望", lang = "zh-Hant"): void {
    if (!this.auth.userId) {
      console.warn("[UserStore] forceConflict requires being logged in (sim)");
      return;
    }
    const uid = this.auth.userId;
    const now = Date.now();

    
    this.wordStore.setStatus(lang, word, "known", this.clock, { at: new Date(now - 1000).toISOString() });
    this.notifyChange();

    
    void (async () => {
      let server = await this.remote.get(uid);
      if (!server) server = emptyUserDoc(uid, this.auth.email!, loadSettings());
      const sStore = wordStoreFromUserDoc(server);
      sStore.setStatus(lang, word, "1", this.clock, { at: new Date(now - 1000 * 3600 * 24 * 3).toISOString() }); 
      server = toUserDoc(sStore, server, new Date(now - 1000 * 3600 * 24 * 2).toISOString());
      await this.remote.put(uid, server);
    })();

    this.setSync("conflict");
    console.info("[UserStore] Forced conflict on", `${lang}:${word}. Login or re-merge to observe.`);
  }

  
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

  
  

  subscribe(fn: UserStoreListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(ev: "doc" | "store" | "sync", data?: any): void {
    
    
    if (ev === "store") writeKnownChars(this.wordStore);
    for (const fn of this.listeners) {
      try { fn(ev, data); } catch {}
    }
  }

  
  

  exportJSON(): string {
    return JSON.stringify(this.exportDoc(), null, 2);
  }

  
  exportDoc(): UserDoc {
    const base = this.doc ?? emptyUserDoc("export", "", loadSettings());
    return toUserDoc(this.wordStore, base);
  }

  
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

  
  async pullFromUrl(url: string): Promise<{ report: MergeReport }> {
    const { UrlRemoteStore } = await import("./remoteStore.js");
    const remote = new UrlRemoteStore(url);
    const remoteDoc = await remote.get(this.auth.userId || "local");
    if (!remoteDoc) return { report: { hadConflict: false, wordsTouched: 0, note: "Nothing to pull." } };
    return this.importUserDoc(remoteDoc);
  }

  
  deleteAccount(): void {
    const uid = this.auth.userId;
    if (uid) void this.remote.delete(uid);
    try { localStorage.removeItem(USER_DOC_KEY); } catch {}
    
    this.doc = null;
    this.auth = { userId: null, email: null, status: "logged-out" };
    
    this.setSync("idle");
    this.emit("doc");
  }

  
  ensureAnonLoaded(): void {
    
  }
}


let _instance: UserStore | null = null;

export function getUserStore(): UserStore {
  if (!_instance) _instance = new UserStore();
  return _instance;
}

export function resetUserStoreForTest(): void {
  _instance = null;
}
