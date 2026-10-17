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
export function renderWordFromPart(ctx: any, token: PreparedToken): HTMLSpanElement {
const word = token.text;
    const span = ctx.el("span", {
      class: ctx.statusClasses(word).join(" "),
      dataset: { word },
      tabIndex: 0,
    });

    const prepared = ctx.currentContent();
    const readingSetting = ctx.state.settings.reading;
    const readingMode = readingSetting === "zh" ? "zy" : readingSetting;
    const rtText = prepared ? ctx.readingForWord(prepared, word, readingMode) : undefined;
    const ruby = ctx.el("ruby");
    const chars = [...word];
    const isZhuyinMode = readingSetting === "zh" || readingSetting === "zy";
    const toneClasses =
      ctx.state.settings.toneColoring && isZhuyinMode
        ? ctx.toneClassesFromZhuyin(rtText ?? "")
        : undefined;
    if (toneClasses && toneClasses.length === chars.length) {
      chars.forEach((ch, i) => {
        const toneCls = ctx.CLS.tone(toneClasses[i]!);
        ruby.append(ctx.el("span", { class: toneCls, text: ch }));
      });
    } else {
      ruby.append(document.createTextNode(word));
    }
    
    
    
    const showRt = !!rtText;
    if (showRt) ruby.append(ctx.el("rt", { text: rtText }));
    span.append(ruby);

    span.addEventListener("mouseenter", (ev: any) => {
      ctx.setCurrent(word, span);
      
      
    });
    span.addEventListener("click", (ev: any) => {
      ev.stopPropagation();
      ctx.setCurrent(word, span);
      ctx.popup.open(word, span);
    });
    span.addEventListener("focus", () => {
      ctx.setCurrent(word, span);
    });

    return span;
}

export function onKeyDownFromPart(ctx: any, ev: KeyboardEvent): void {
const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (ev.key === "Escape") {
      ctx.popup.close();
      return;
    }

    if (!ctx.state.settings.knownStateOn) return;

    if (ev.key === "ArrowRight") {  
      ev.preventDefault();
      ctx.setActive(ctx.activeIndex + 1);
      return;
    }
    if (ev.key === "ArrowLeft" || ev.key === "h") {
      ev.preventDefault();
      ctx.setActive(ctx.activeIndex - 1);
      return;
    }
    if (ev.key === "n") {
      ev.preventDefault();
      ctx.nextUnknown();
      return;
    }

    const status = ctx.hotkeyToStatus(ev.key);
    if (status && ctx.currentWord) {
      ev.preventDefault();
      ctx.state.gradeWord(ctx.currentWord, status);
      ctx.popup.close();
    }

    
    if ((ev.key === "b" || ev.key === "B") && ctx.state.settings.knownStateOn) {
      ev.preventDefault();
      for (const { word } of ctx.wordSpans) {
        const st = ctx.state.getStatus(word);
        if (!ctx.isKnown(st)) ctx.state.gradeWord(word, "known");
      }
      ctx.popup.close();
    }
}

export function buildProseFromPart(ctx: any): void {
ctx.clear(ctx.proseRoot);
    ctx.wordSpans.length = 0;

    const prepared = ctx.currentContent();
    if (!prepared) {
      ctx.proseRoot.append(ctx.el("p", { text: "No content loaded." }));
      return;
    }

    let sentenceOpen = false;
    for (const token of prepared.tokens) {
      if (!sentenceOpen) {
        ctx.proseRoot.append(ctx.el("span", { class: ctx.CLS.sent }));
        sentenceOpen = true;
      }

      const sent = ctx.proseRoot.lastElementChild as HTMLElement;
      if (!token.isWord) {
        sent.append(ctx.renderPunct(token.text));
        if (token.text.includes("。") || token.text.includes("！") || token.text.includes("？")) {
          sentenceOpen = false;
        }
        continue;
      }

      const span = ctx.renderWord(token);
      ctx.wordSpans.push({ word: token.text, span });
      sent.append(span);
    }
}
