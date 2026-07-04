/**
 * Cue-aware voice-note player (ported from monorepo voice/player.ts).
 *
 * Plays per-cue local audio through one HTMLAudioElement, loading blobs lazily
 * via the host vault (httpVault readBytes or File System) with a small LRU of
 * decoded object-URLs. Slow playback pitch-corrects via playbackRate (0.85×).
 * Any missing/unreadable file falls back to the Web Speech path for that cue.
 *
 * Supports real assets when vault + binding present; otherwise demo speak fallback.
 * The slow-vs-natural decision reuses selectPlayback (pure).
 */

import type { VaultIO } from "@tsumugu/engine";
import type { VoiceNote, VoiceNotesBinding } from "./manifest.js";
import { resolveAudioPath } from "./manifest.js";

/** Gap between cues in "play from here" / shadowing auto-advance. */
export const CHAIN_GAP_MS = 350;
/** How many decoded cue object-URLs to keep alive. */
export const AUDIO_LRU = 10;
/** Reader-side slow speed (pitch-corrected). */
export const SLOW_PLAYBACK_RATE = 0.85;

/** Which file to play and at what rate for a cue — pure. */
export function selectPlayback(
  note: VoiceNote | undefined,
  slow: boolean,
): { rel: string; rate: number } | null {
  if (!note) return null;
  if (slow && note.audioSlow) return { rel: note.audioSlow, rate: 1 };
  if (slow) return { rel: note.audio, rate: SLOW_PLAYBACK_RATE };
  return { rel: note.audio, rate: 1 };
}

export interface VoicePlayer {
  /** Play one cue; `onEnded` fires when its audio (or speech fallback) completes. */
  playCue(index: number, opts?: { slow?: boolean; onEnded?: () => void }): void;
  /** Play consecutively from `index`, advancing the highlight via `onAdvance`. */
  playFrom(index: number, opts?: { slow?: boolean; onAdvance?: (index: number) => void; onDone?: () => void }): void;
  /** Stop playback and cancel any pending chained advance. */
  stop(): void;
  /** Tear down: stop + revoke all cached object-URLs. */
  destroy(): void;
}

export interface VoicePlayerDeps {
  vault?: VaultIO | null;
  binding?: VoiceNotesBinding | null;
  cues: readonly { text: string }[];
  /** Web Speech fallback. */
  speak?: (text: string) => void;
}

export function createVoicePlayer(deps: VoicePlayerDeps): VoicePlayer {
  const { vault, binding, cues, speak } = deps;
  const audio = new Audio();
  const cache = new Map<string, string>(); // resolved path → object URL (insertion-ordered LRU)
  let token = 0;
  let chainStopped = true;
  let chainTimer: ReturnType<typeof setTimeout> | undefined;
  let warnedMissing = false;

  async function loadUrl(rel: string): Promise<string | null> {
    if (!binding) return null;
    const path = resolveAudioPath(binding.baseDir, rel);
    const hit = cache.get(path);
    if (hit !== undefined) {
      cache.delete(path);
      cache.set(path, hit);
      return hit;
    }
    if (!vault?.readBytes) return null;
    let bytes: Uint8Array | null;
    try {
      bytes = await vault.readBytes(path);
    } catch {
      return null;
    }
    if (!bytes) return null;
    const part = new Uint8Array(bytes);
    const url = URL.createObjectURL(new Blob([part.buffer]));
    cache.set(path, url);
    while (cache.size > AUDIO_LRU) {
      const oldest = cache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      const u = cache.get(oldest);
      cache.delete(oldest);
      if (u) URL.revokeObjectURL(u);
    }
    return url;
  }

  function fallback(index: number): void {
    const text = cues[index]?.text ?? "";
    if (!warnedMissing) {
      console.warn("[voice] missing/unreadable audio for a cue — falling back to Web Speech");
      warnedMissing = true;
    }
    if (text && speak) speak(text);
  }

  function startTake(index: number, slow: boolean, onEnded?: () => void): void {
    token++;
    const tk = token;
    if (!binding) {
      fallback(index);
      onEnded?.();
      return;
    }
    const sel = selectPlayback(binding.byCue.get(index), slow);
    if (!sel) {
      fallback(index);
      onEnded?.();
      return;
    }
    void loadUrl(sel.rel).then((url) => {
      if (tk !== token) return;
      if (!url) {
        fallback(index);
        onEnded?.();
        return;
      }
      audio.onended = () => {
        if (tk === token) onEnded?.();
      };
      audio.src = url;
      audio.playbackRate = sel.rate;
      void audio.play().catch(() => {
        if (tk === token) {
          fallback(index);
          onEnded?.();
        }
      });
    });
  }

  function haltChain(): void {
    chainStopped = true;
    if (chainTimer) {
      clearTimeout(chainTimer);
      chainTimer = undefined;
    }
  }

  return {
    playCue(index, opts) {
      haltChain();
      startTake(index, !!opts?.slow, opts?.onEnded);
    },
    playFrom(index, opts) {
      haltChain();
      chainStopped = false;
      const slow = !!opts?.slow;
      const step = (i: number): void => {
        if (chainStopped || i >= cues.length) {
          opts?.onDone?.();
          return;
        }
        opts?.onAdvance?.(i);
        startTake(i, slow, () => {
          chainTimer = setTimeout(() => step(i + 1), CHAIN_GAP_MS);
        });
      };
      step(index);
    },
    stop() {
      haltChain();
      token++;
      audio.onended = null;
      audio.pause();
    },
    destroy() {
      haltChain();
      token++;
      audio.onended = null;
      audio.pause();
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    },
  };
}
