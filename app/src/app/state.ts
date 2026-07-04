import {
  type Clock,
  type PreparedContent,
  type WordStatus,
  WordStore,
  systemClock,
} from "@tsumugu/engine";
import type { CorePreparedContent } from "../types/corePrepared.js";
import { saveSettings, saveStore, type ReaderSettings, getUserStore } from "./persist.js";
import { trackEvent } from "../build/analytics.js";
import type { TranscriptDoc } from "../reader/sync.js";
import type { VoiceNotesBinding } from "../voice/manifest.js";

export type ReaderEvent = "status" | "settings" | "content";

type Listener = () => void;

export interface ReaderState {
  content: CorePreparedContent | null;
  lang: string;
  store: WordStore;
  settings: ReaderSettings;
  clock: Clock;
  transcript?: TranscriptDoc | null;
  voiceBinding?: VoiceNotesBinding | null;
  getStatus(word: string): WordStatus;
  gradeWord(word: string, status: WordStatus): void;
  recordSeen(word: string): void;
  setContent(content: CorePreparedContent): void;
  setTranscript(t: TranscriptDoc | null): void;
  setVoiceBinding(b: VoiceNotesBinding | null): void;
  subscribe(ev: ReaderEvent, fn: Listener): () => void;
  updateSettings(patch: Partial<ReaderSettings>): void;
}

export function createReaderState(
  content: CorePreparedContent,
  store: WordStore,
  settings: ReaderSettings,
  clock: Clock = systemClock,
): ReaderState {
  const listeners: Record<ReaderEvent, Set<Listener>> = {
    status: new Set(),
    settings: new Set(),
    content: new Set(),
  };

  function emit(ev: ReaderEvent): void {
    for (const fn of listeners[ev]) fn();
  }

  const state: ReaderState = {
    content,
    lang: content.lang,
    store,
    settings,
    clock,

    getStatus(word: string): WordStatus {
      return store.getStatus(state.lang, word);
    },

    gradeWord(word: string, status: WordStatus): void {
      store.setStatus(state.lang, word, status, clock);
      saveStore(store);
      // Notify central user store (debounced sync + metadata)
      try { getUserStore().notifyChange(); } catch {}
      trackEvent("grade", { word, status });
      emit("status");
    },

    recordSeen(word: string): void {
      store.recordSeen(state.lang, word, clock);
      saveStore(store);
      try { getUserStore().notifyChange(); } catch {}
      emit("status");
    },

    setContent(next: CorePreparedContent): void {
      state.content = next;
      state.lang = next.lang;
      emit("content");
    },

    setTranscript(t: TranscriptDoc | null): void {
      state.transcript = t || null;
      emit("content"); // reuse for re-render cues
    },

    setVoiceBinding(b: VoiceNotesBinding | null): void {
      state.voiceBinding = b || null;
    },

    subscribe(ev: ReaderEvent, fn: Listener): () => void {
      listeners[ev].add(fn);
      return () => listeners[ev].delete(fn);
    },

    updateSettings(patch: Partial<ReaderSettings>): void {
      state.settings = { ...state.settings, ...patch };
      saveSettings(state.settings);
      // Push into user doc (profile/settings) when logged in
      try { getUserStore().updateSettings(patch); } catch {}
      emit("settings");
    },
  };

  return state;
}

export type { PreparedContent };