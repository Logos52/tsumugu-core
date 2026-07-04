import { WordStore } from "@tsumugu/engine";
import { loadSettings, saveSettings, type ReaderSettings } from "./settings.js";
import { getUserStore } from "../store/userStore.js";

// Legacy shims kept for any stray callers. Real mutations now flow through UserStore.
const STORE_KEY = "tsumugu-core/word-store";

export function loadStore(): WordStore {
  // When userStore exists, it owns the live one (anon or merged).
  try {
    return getUserStore().getWordStore();
  } catch {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return new WordStore();
    return WordStore.fromJSON(raw);
  }
}

export function saveStore(store: WordStore): void {
  // No-op for words: UserStore debounces. Still write legacy key for safety.
  try { localStorage.setItem(STORE_KEY, store.toJSON()); } catch {}
  // Notify the central store if this path is used
  try { getUserStore().notifyChange(); } catch {}
}

export { loadSettings, saveSettings, type ReaderSettings };

// Re-export central auth/user layer for shell/nav consumers
export { getUserStore } from "../store/userStore.js";
export { subscribeSession, getSession, logout, devForceLogin } from "../auth/session.js";