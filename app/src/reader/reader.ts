import { renderWordFromPart, onKeyDownFromPart, buildProseFromPart } from "./reader.fns1.js";
import { mountReaderTail4 } from "./reader.fns2.js";
import { mountReaderTail5 } from "./reader.fns3.js";

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

const GRADE_LABELS = ["1", "2", "3", "4", "K", "X"] as const;

interface ReaderController {
  rebuildProse(): void;
  unmount(): void;
  
  attachVoice(demo?: boolean): Promise<VoicePlayer | null>;
  attachPracticeBar(container: HTMLElement): Promise<PracticeBar | null>;
  
  setTranscript(doc: TranscriptDoc | null): void;
  highlightCue(cueIdx: number): void;
  
  attachCueWaveforms(opts?: { vault?: VaultIO; tracks?: any }): Promise<CueWaveforms | null>;
}

export function mountReader(
  proseRoot: HTMLElement,
  state: ReaderState,
  popup: WordPopupController,
  vault?: VaultIO | null,
): ReaderController {
const ctx: any = {};

  function currentContent(): CorePreparedContent | null {
    return state.content;
  }

  const wordSpans: { word: string; span: HTMLSpanElement }[] = [];
  let activeIndex = 0;
  let currentWord: string | null = null;
  let activeSpan: HTMLElement | null = null;

  
  const voicePlayer: VoicePlayer | null = null;
ctx.voicePlayer = voicePlayer;
  const practice: PracticeBar | null = null;
ctx.practice = practice;
  const cueWaves: CueWaveforms | null = null;
ctx.cueWaves = cueWaves;
  const cueRanges: CueRange[] = [];
ctx.cueRanges = cueRanges;
  let currentCue = -1;
  const shadowState: ShadowState = SHADOW_IDLE;
ctx.shadowState = shadowState;
  const transcriptDoc: TranscriptDoc | null = null;
ctx.transcriptDoc = transcriptDoc;

  function renderPunct(text: string): HTMLSpanElement {
    const span = el("span", { class: CLS.punct });
    const parts = text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) span.append(el("br"));
      const piece = parts[i];
      if (piece) span.append(piece);
    }
    return span;
  }

  function statusClasses(word: string): string[] {
    const prepared = currentContent();
    const classes: string[] = [CLS.word];
    if (prepared && isNewTargetWord(prepared, word)) classes.push(CLS.nw);
    if (state.settings.knownStateOn) {
      classes.push(statusColorClass(state.getStatus(word)));
    }
    return classes;
  }

  ctx.el = el; ctx.statusClasses = statusClasses; ctx.currentContent = currentContent; ctx.state = state; ctx.readingForWord = readingForWord; ctx.toneClassesFromZhuyin = toneClassesFromZhuyin; ctx.CLS = CLS; ctx.setCurrent = setCurrent; ctx.popup = popup;
const renderWord = (token: PreparedToken) => renderWordFromPart(ctx, token);

  function recolorSpan(word: string, span: HTMLElement): void {
    const prepared = currentContent();
    for (const c of [...span.classList]) {
      if (c.startsWith("tsg-status-")) span.classList.remove(c);
    }
    span.classList.toggle(CLS.nw, prepared ? isNewTargetWord(prepared, word) : false);
    if (state.settings.knownStateOn) {
      span.classList.add(statusColorClass(state.getStatus(word)));
    }
  }

  function recolor(): void {
    for (const { word, span } of wordSpans) recolorSpan(word, span);
  }

  function highlightCue(cueIdx: number): void {
    currentCue = cueIdx;
    
    const sents = Array.from(proseRoot.querySelectorAll(".sent"));
    sents.forEach((s, i) => s.classList.toggle(CLS.sel, i === cueIdx)); 
    
    if (ctx.cueRanges.length && cueIdx >= 0) {
      const r = ctx.cueRanges[cueIdx];
      if (r) {
        wordSpans.forEach((ws, wi) => {
          const inRange = wi >= r.startToken && wi < r.endToken;
          ws.span.classList.toggle("cue-active", inRange);
        });
      }
    }
    
    if (ctx.practice) ctx.practice.setCue(Math.max(0, cueIdx));
    ctx.cueWaves?.setActive(Math.max(0, cueIdx));
  }

  
  function selectSentence(idx: number): void {
    if (idx < 0) return;
    highlightCue(idx);
    if (ctx.practice) ctx.practice.setCue(idx);
  }

  ctx.clear = clear; ctx.proseRoot = proseRoot; ctx.wordSpans = wordSpans; ctx.currentContent = currentContent; ctx.el = el; ctx.CLS = CLS; ctx.renderPunct = renderPunct; ctx.renderWord = renderWord;
const buildProse = () => buildProseFromPart(ctx);

  function setCurrent(word: string, span: HTMLElement): void {
    currentWord = word;
    ctx.currentWord = word;
    if (activeSpan && activeSpan !== span) activeSpan.classList.remove(CLS.sel);
    activeSpan = span;
    span.classList.add(CLS.sel);
    const idx = wordSpans.findIndex((w) => w.span === span);
    if (idx >= 0) activeIndex = idx;

    
    
    const sentEl = span.closest(".sent") as HTMLElement | null;
    if (sentEl) {
      const sents = Array.from(proseRoot.querySelectorAll(".sent"));
      const sidx = sents.indexOf(sentEl);
      if (sidx >= 0) selectSentence(sidx);
    }
  }

  function setActive(index: number): void {
    if (wordSpans.length === 0) return;
    const clamped = Math.max(0, Math.min(index, wordSpans.length - 1));
    const cur = wordSpans[clamped];
    if (!cur) return;
    setCurrent(cur.word, cur.span);
    cur.span.focus();
    popup.open(cur.word, cur.span);
  }

  ctx.wordSpans = wordSpans; ctx.activeIndex = activeIndex; ctx.isKnown = isKnown; ctx.state = state; ctx.setActive = setActive; ctx.popup = popup; ctx.hotkeyToStatus = hotkeyToStatus; ctx.currentWord = currentWord; ctx.recolor = recolor; ctx.currentContent = currentContent; ctx.CLS = CLS; ctx.isNewTargetWord = isNewTargetWord; ctx.buildProse = buildProse; ctx.setCurrent = setCurrent; ctx.proseRoot = proseRoot; ctx.selectSentence = selectSentence; ctx.currentCue = currentCue; ctx.el = el; ctx.highlightCue = highlightCue; ctx.shadowReducer = shadowReducer; ctx.SHADOW_IDLE = SHADOW_IDLE; ctx.createVoicePlayer = createVoicePlayer; ctx.vault = vault; ctx.createPracticeBar = createPracticeBar; ctx.alignCuesToTokens = alignCuesToTokens; ctx.clear = clear;
return mountReaderTail5(ctx);
}

;