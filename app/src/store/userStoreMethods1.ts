import { WordStore } from "@tsumugu/engine";
import type { ReaderSettings } from "../app/settings.js";
import { loadSettings } from "../app/settings.js";
import {
  USER_DOC_SCHEMA,
  emptyUserDoc,
  toUserDoc,
  wordStoreFromUserDoc,
  mergeUserDocs,
  type UserDoc,
} from "./userDoc.js";
import type { SyncStatus } from "./userStore.js";

declare module "./userStore.js" {
  interface UserStore {
    flushSave(immediate?: boolean): void;
    setSync(s: SyncStatus): void;
    login(userId: string, email: string, initialSettings?: ReaderSettings): Promise<{ merged: boolean; report?: any }>;
    logout(): void;
    updateProfile(patch: Partial<{ displayName?: string; rail?: "en" | "vi"; uiLang?: "en" | "vi"; email?: string }>): void;
    updateSettings(patch: Partial<ReaderSettings>): void;
    applySeedRecords(records: Array<{ lang: string; word: string; status?: import("@tsumugu/engine").WordStatus; at?: string }>): { applied: number; conflicts: number };
  }
}

export function flushSave(this: any, immediate = false): void {
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

export function setSync(this: any, s: SyncStatus): void {
    this.syncStatus = s;
    void import("../build/analytics.js").then(({ trackEvent }) => trackEvent("sync", { status: s }));
    this.emit("sync", s);
  }

export async function login(this: any, userId: string, email: string, initialSettings?: ReaderSettings): Promise<{ merged: boolean; report?: any }> {
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

export function logout(this: any): void {
    if (this.auth.userId) {
      
      this.flushSave(true);
    }
    this.auth = { userId: null, email: null, status: "logged-out" };
    this.doc = null;
    this.setSync("idle");
    try { localStorage.removeItem("tsumugu-session"); } catch {}
    
    this.emit("doc");
  }

export function updateProfile(this: any, patch: Partial<{ displayName?: string; rail?: "en"|"vi"; uiLang?: "en"|"vi"; email?: string }>): void {
    if (!this.doc) return;
    this.doc.profile = { ...this.doc.profile, ...patch };
    this.doc.updatedAt = this.clock.now().toISOString();
    this.dirty = true;
    this.scheduleSave();
    this.emit("doc");
  }

export function updateSettings(this: any, patch: Partial<ReaderSettings>): void {
    if (!this.doc) {
      
      return;
    }
    this.doc.settings = { ...this.doc.settings, ...patch };
    this.doc.updatedAt = this.clock.now().toISOString();
    this.dirty = true;
    this.scheduleSave();
    this.emit("doc");
  }

export function applySeedRecords(this: any, records: Array<{ lang: string; word: string; status?: import("@tsumugu/engine").WordStatus; at?: string }>): { applied: number; conflicts: number } {
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
