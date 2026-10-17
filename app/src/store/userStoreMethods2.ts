import { writeKnownChars } from "./knownChars.js";
import { loadSettings } from "../app/settings.js";
import {
  emptyUserDoc,
  toUserDoc,
  wordStoreFromUserDoc,
  mergeUserDocs,
  migrateUserDoc,
  type UserDoc,
  type MergeReport,
} from "./userDoc.js";
import type { UserStoreListener } from "./userStore.js";

declare module "./userStore.js" {
  interface UserStore {
    forceConflictDemo(word?: string, lang?: string): void;
    simulateOtherDeviceEdit(word?: string, status?: import("@tsumugu/engine").WordStatus, lang?: string): void;
    subscribe(fn: UserStoreListener): () => void;
    emit(ev: "doc" | "store" | "sync", data?: any): void;
    exportJSON(): string;
    exportDoc(): UserDoc;
    importUserDoc(incoming: unknown, nowIso?: string): { report: MergeReport };
    pullFromUrl(url: string): Promise<{ report: MergeReport }>;
    deleteAccount(): void;
    ensureAnonLoaded(): void;
  }
}

export function forceConflictDemo(this: any, word = "望", lang = "zh-Hant"): void {
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

export function simulateOtherDeviceEdit(this: any, word = "學習", status: import("@tsumugu/engine").WordStatus = "4", lang = "zh-Hant"): void {
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

export function subscribe(this: any, fn: UserStoreListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

export function emit(this: any, ev: "doc" | "store" | "sync", data?: any): void {
    
    
    if (ev === "store") writeKnownChars(this.wordStore);
    for (const fn of this.listeners) {
      try { fn(ev, data); } catch {}
    }
  }

export function exportJSON(this: any): string {
    return JSON.stringify(this.exportDoc(), null, 2);
  }

export function exportDoc(this: any): UserDoc {
    const base = this.doc ?? emptyUserDoc("export", "", loadSettings());
    return toUserDoc(this.wordStore, base);
  }

export function importUserDoc(this: any, incoming: unknown, nowIso: string = this.clock.now().toISOString()): { report: MergeReport } {
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

export async function pullFromUrl(this: any, url: string): Promise<{ report: MergeReport }> {
    const { UrlRemoteStore } = await import("./remoteStore.js");
    const remote = new UrlRemoteStore(url);
    const remoteDoc = await remote.get(this.auth.userId || "local");
    if (!remoteDoc) return { report: { hadConflict: false, wordsTouched: 0, note: "Nothing to pull." } };
    return this.importUserDoc(remoteDoc);
  }

export function deleteAccount(this: any): void {
    const uid = this.auth.userId;
    if (uid) void this.remote.delete(uid);
    try { localStorage.removeItem("tsumugu-core/user-doc"); } catch {}
    
    this.doc = null;
    this.auth = { userId: null, email: null, status: "logged-out" };
    
    this.setSync("idle");
    this.emit("doc");
  }

export function ensureAnonLoaded(this: any): void {
    
  }
