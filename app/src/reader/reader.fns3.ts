import { onKeyDownFromPart } from "./reader.fns1.js";
import { mountReaderTail4 } from "./reader.fns2.js";
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
export function mountReaderTail5(ctx: any): any {
function nextUnknown(): void {
    if (ctx.wordSpans.length === 0) return;
    const n = ctx.wordSpans.length;
    for (let step = 1; step <= n; step++) {
      const idx = (ctx.activeIndex + step) % n;
      const entry = ctx.wordSpans[idx];
      if (entry && !ctx.isKnown(ctx.state.getStatus(entry.word))) {
        ctx.setActive(idx);
        return;
      }
    }
  } ctx.nextUnknown = nextUnknown;
const onKeyDown = (ev: KeyboardEvent) => onKeyDownFromPart(ctx, ev);

  document.addEventListener("keydown", onKeyDown);

  const offStatus = ctx.state.subscribe("status", ctx.recolor);
  const offSettings = ctx.state.subscribe("settings", () => {
    if (ctx.state.settings.knownStateOn) ctx.recolor();
    else {
      for (const { word, span } of ctx.wordSpans) {
        for (const c of [...span.classList]) {
          if (c.startsWith("tsg-status-")) span.classList.remove(c);
        }
        const cur = ctx.currentContent();
        span.classList.toggle(ctx.CLS.nw, cur ? ctx.isNewTargetWord(cur, word) : false);
      }
    }
  });

  ctx.buildProse();

  if (ctx.wordSpans.length > 0) {
    const first = ctx.wordSpans[0];
    if (first) ctx.setCurrent(first.word, first.span);
  }







  ctx.proseRoot.addEventListener("click", (ev: any) => {
    const sent = (ev.target as HTMLElement).closest(".sent");
    if (sent) {
      const sents = Array.from(ctx.proseRoot.querySelectorAll(".sent"));
      const idx = sents.indexOf(sent);
      if (idx >= 0) {
        ctx.selectSentence(idx);
      }




      const chinese = sent.querySelector(".chinese") || sent; 
      if (chinese.classList.contains("chinese-hidden") || (ctx.state.settings as any).audioOnly) {
        chinese.classList.remove("chinese-hidden");
        chinese.classList.add("revealed");

        if (ctx.voicePlayer && ctx.currentCue >= 0) {
          ctx.voicePlayer.playCue(ctx.currentCue);
        }
      }


      if (ctx.transcriptDoc && idx >= 0) {
        const cue = ctx.transcriptDoc.cues[idx];
        const tr = cue?.tr;
        if (tr) {
          let reveal = sent.querySelector(".sent-tr");
          if (reveal) {
            reveal.remove(); 
          } else {
            const transLang = ctx.state.settings.gloss === "vi" ? "vi" : "en";
            reveal = ctx.el("span", {
              class: `sent-tr ${transLang}`,
              text: ` 〔${tr}〕`
            });

            const anchor = sent.querySelector(".chinese") || sent;
            if (reveal) anchor.append(reveal);
          }
        }
      }
    }
  }); ctx.onKeyDown = onKeyDown; ctx.offStatus = offStatus; ctx.offSettings = offSettings;
return mountReaderTail4(ctx);
}
