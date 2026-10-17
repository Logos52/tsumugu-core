import { flushSave, setSync, login, logout, updateProfile, updateSettings, applySeedRecords } from "./userStoreMethods1.js";
import { forceConflictDemo, simulateOtherDeviceEdit, subscribe, emit, exportJSON, exportDoc, importUserDoc, pullFromUrl, deleteAccount, ensureAnonLoaded } from "./userStoreMethods2.js";

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

interface AuthSnapshot {
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

  }
UserStore.prototype.flushSave = flushSave;
UserStore.prototype.setSync = setSync;
UserStore.prototype.login = login;
UserStore.prototype.logout = logout;
UserStore.prototype.updateProfile = updateProfile;
UserStore.prototype.updateSettings = updateSettings;
UserStore.prototype.applySeedRecords = applySeedRecords;
UserStore.prototype.forceConflictDemo = forceConflictDemo;
UserStore.prototype.simulateOtherDeviceEdit = simulateOtherDeviceEdit;
UserStore.prototype.subscribe = subscribe;
UserStore.prototype.emit = emit;
UserStore.prototype.exportJSON = exportJSON;
UserStore.prototype.exportDoc = exportDoc;
UserStore.prototype.importUserDoc = importUserDoc;
UserStore.prototype.pullFromUrl = pullFromUrl;
UserStore.prototype.deleteAccount = deleteAccount;
UserStore.prototype.ensureAnonLoaded = ensureAnonLoaded;

let _instance: UserStore | null = null;

export function getUserStore(): UserStore {
  if (!_instance) _instance = new UserStore();
  return _instance;
}

export function resetUserStoreForTest(): void {
  _instance = null;
}
