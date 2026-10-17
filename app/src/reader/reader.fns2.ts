import {
  hotkeyToStatus,
  isKnown,
  statusColorClass,
  type PreparedToken,
  type VaultIO,
} from "@tsumugu/engine";
import type { ReaderState } from "../app/state.js";
import { isNewTargetWord, type CorePreparedContent } from "../types/corePrepared.js";
import { el, clear } from "../ui/dom.js";
import { CLS } from "../ui/classes.js";
import type { WordPopupController } from "../hover/wordPopup.js";
import { readingForWord } from "./reading.js";
import { toneClassesFromZhuyin } from "../packs/tones.js";
import type { TranscriptDoc, CueRange } from "./sync.js";
import { createVoicePlayer, type VoicePlayer } from "../voice/player.js";
import { createPracticeBar, type PracticeBar } from "../voice/practiceBar.js";
import { mountCueWaveforms, type CueWaveforms } from "../voice/cueWaveforms.js";
import { shadowReducer, SHADOW_IDLE, type ShadowState } from "../voice/shadowing.js";
import { alignCuesToTokens } from "./sync.js";
export async function mountReaderTail4(ctx: any): Promise<any> {
const onVoiceKey = (ev: KeyboardEvent) => {
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (ev.key.toLowerCase() === "l") {
      ev.preventDefault();
      const shadowActive = ctx.shadowState.phase !== "idle";
      const practiceActive = !!ctx.practice;
      const hasVoice = !!ctx.voicePlayer;
      if (practiceActive || shadowActive || hasVoice) {
        
        if (ctx.practice) {
          ctx.practice.toggleLoop();
          
          if (ctx.practice.isLooping()) {
            const c = ctx.currentCue >= 0 ? ctx.currentCue : 0;
            if (ctx.voicePlayer) {
              ctx.voicePlayer.playCue(c);
            } else {
              
              ctx.practice.playPause();
            }
          }
        } else if (ctx.voicePlayer) {
          
          
          const c = ctx.currentCue >= 0 ? ctx.currentCue : 0;
          ctx.voicePlayer.playCue(c);
          ctx.highlightCue(c);
        }
      } else {
        
        ctx.setActive(ctx.activeIndex + 1);
      }
      return;
    }

    if (ev.key === " " && ctx.voicePlayer && ctx.shadowState.phase !== "idle") {
      ev.preventDefault();
      const nextEv = { type: "advance" as const };
      ctx.shadowState = ctx.shadowReducer(ctx.shadowState, nextEv, (ctx.transcriptDoc?.cues.length ?? ctx.cueRanges.length ?? 1));
      if (ctx.shadowState.phase === "playing") {
        const c = (ctx.shadowState as any).cue ?? 0;
        ctx.voicePlayer.playCue(c);
        ctx.highlightCue(c);
      }
    }
    if (ev.key.toLowerCase() === "s" && ctx.voicePlayer) {
      
      ev.preventDefault();
      const c = ctx.currentCue >= 0 ? ctx.currentCue : 0;
      ctx.shadowState = ctx.shadowReducer(ctx.SHADOW_IDLE, { type: "start", cue: c }, 99);
      ctx.voicePlayer.playCue(c, { onEnded: () => { ctx.shadowState = ctx.shadowReducer(ctx.shadowState, { type: "audioEnded" }, 99); } });
      ctx.highlightCue(c);
    }
  };
  document.addEventListener("keydown", onVoiceKey);

  async function attachVoice(demo = true): Promise<VoicePlayer | null> {
    if (ctx.voicePlayer) return ctx.voicePlayer;
    const cuesForVoice = (ctx.transcriptDoc?.cues.map((c: any) => ({ text: c.text })) ?? [{ text: "demo" }]);
    ctx.voicePlayer = ctx.createVoicePlayer({
      vault: ctx.vault ?? undefined,
      binding: ctx.state.voiceBinding ?? undefined,
      cues: cuesForVoice,
      speak: (text: string) => {  },
    });
    return ctx.voicePlayer;
  }

  async function attachPracticeBar(container: HTMLElement): Promise<PracticeBar | null> {
    if (ctx.practice) ctx.practice.destroy();
    const p = await ctx.createPracticeBar({
      container,
      vault: ctx.vault ?? undefined,
      binding: ctx.state.voiceBinding ?? null,
      initialCue: Math.max(0, ctx.currentCue),
    });
    ctx.practice = p;
    if (ctx.practice && ctx.currentCue >= 0) ctx.practice.setCue(ctx.currentCue);
    return p;
  }

  
  async function attachCueWaveformsLocal(opts: { vault: VaultIO; binding?: any; tracks?: any }): Promise<CueWaveforms | null> {
    
    
    return null;
  }

  function setTranscript(doc: TranscriptDoc | null) {
    ctx.transcriptDoc = doc;
    ctx.state.setTranscript(doc);
    if (doc) {
      const prepared = ctx.currentContent();
      if (prepared) {
        ctx.cueRanges = ctx.alignCuesToTokens(prepared.tokens, doc.cues);
      }
      
      if (ctx.currentCue >= 0) ctx.highlightCue(ctx.currentCue);
    }
  }

  const origRebuild = () => {  };
  const origUnmount = () => {  };

  return {
    rebuildProse() {
      ctx.popup.close();
      ctx.buildProse();
      if (ctx.transcriptDoc) {
        
        const prepared = ctx.currentContent();
        if (prepared) ctx.cueRanges = ctx.alignCuesToTokens(prepared.tokens, ctx.transcriptDoc.cues);
      }
    },
    unmount() {
      document.removeEventListener("keydown", ctx.onKeyDown);
      document.removeEventListener("keydown", onVoiceKey);
      ctx.offStatus();
      ctx.offSettings();
      ctx.popup.close();
      if (ctx.practice) ctx.practice.destroy();
      if (ctx.voicePlayer) ctx.voicePlayer.destroy();
      if (ctx.cueWaves) { try { ctx.cueWaves.destroy(); } catch {} ctx.cueWaves = null; }
      ctx.clear(ctx.proseRoot);
    },
    attachVoice,
    attachPracticeBar,
    setTranscript,
    highlightCue: ctx.highlightCue,
    attachCueWaveforms: attachCueWaveformsLocal,
  };
}
