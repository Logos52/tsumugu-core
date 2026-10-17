import { WordStore } from "@tsumugu/engine";
import { loadSettings, saveSettings, type ReaderSettings } from "./settings.js";
import { getUserStore } from "../store/userStore.js";

const STORE_KEY = "tsumugu-core/word-store";

export function loadStore(): WordStore {
  
  try {
    return getUserStore().getWordStore();
  } catch {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return new WordStore();
    return WordStore.fromJSON(raw);
  }
}

export function saveStore(store: WordStore): void {
  
  try { localStorage.setItem(STORE_KEY, store.toJSON()); } catch {}
  
  try { getUserStore().notifyChange(); } catch {}
}

export { saveSettings, type ReaderSettings };

export { getUserStore } from "../store/userStore.js";