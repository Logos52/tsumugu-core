

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

export interface ReaderController {
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
  function currentContent(): CorePreparedContent | null {
    return state.content;
  }

  const wordSpans: { word: string; span: HTMLSpanElement }[] = [];
  let activeIndex = 0;
  let currentWord: string | null = null;
  let activeSpan: HTMLElement | null = null;

  
  let voicePlayer: VoicePlayer | null = null;
  let practice: PracticeBar | null = null;
  let cueWaves: CueWaveforms | null = null;
  let cueRanges: CueRange[] = [];
  let currentCue = -1;
  let shadowState: ShadowState = SHADOW_IDLE;
  let transcriptDoc: TranscriptDoc | null = null;

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

  function renderWord(token: PreparedToken): HTMLSpanElement {
    const word = token.text;
    const span = el("span", {
      class: statusClasses(word).join(" "),
      dataset: { word },
      tabIndex: 0,
    });

    const prepared = currentContent();
    const readingSetting = state.settings.reading;
    const readingMode = readingSetting === "zh" ? "zy" : readingSetting;
    const rtText = prepared ? readingForWord(prepared, word, readingMode) : undefined;
    const ruby = el("ruby");
    const chars = [...word];
    const isZhuyinMode = readingSetting === "zh" || readingSetting === "zy";
    const toneClasses =
      state.settings.toneColoring && isZhuyinMode
        ? toneClassesFromZhuyin(rtText ?? "")
        : undefined;
    if (toneClasses && toneClasses.length === chars.length) {
      chars.forEach((ch, i) => {
        const toneCls = CLS.tone(toneClasses[i]!);
        ruby.append(el("span", { class: toneCls, text: ch }));
      });
    } else {
      ruby.append(document.createTextNode(word));
    }
    
    
    
    const showRt = !!rtText;
    if (showRt) ruby.append(el("rt", { text: rtText }));
    span.append(ruby);

    span.addEventListener("mouseenter", (ev) => {
      setCurrent(word, span);
      
      
    });
    span.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setCurrent(word, span);
      popup.open(word, span);
    });
    span.addEventListener("focus", () => {
      setCurrent(word, span);
    });

    return span;
  }

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
    
    if (cueRanges.length && cueIdx >= 0) {
      const r = cueRanges[cueIdx];
      if (r) {
        wordSpans.forEach((ws, wi) => {
          const inRange = wi >= r.startToken && wi < r.endToken;
          ws.span.classList.toggle("cue-active", inRange);
        });
      }
    }
    
    if (practice) practice.setCue(Math.max(0, cueIdx));
    cueWaves?.setActive(Math.max(0, cueIdx));
  }

  
  function selectSentence(idx: number): void {
    if (idx < 0) return;
    highlightCue(idx);
    if (practice) practice.setCue(idx);
  }

  function buildProse(): void {
    clear(proseRoot);
    wordSpans.length = 0;

    const prepared = currentContent();
    if (!prepared) {
      proseRoot.append(el("p", { text: "No content loaded." }));
      return;
    }

    let sentenceOpen = false;
    for (const token of prepared.tokens) {
      if (!sentenceOpen) {
        proseRoot.append(el("span", { class: CLS.sent }));
        sentenceOpen = true;
      }

      const sent = proseRoot.lastElementChild as HTMLElement;
      if (!token.isWord) {
        sent.append(renderPunct(token.text));
        if (token.text.includes("。") || token.text.includes("！") || token.text.includes("？")) {
          sentenceOpen = false;
        }
        continue;
      }

      const span = renderWord(token);
      wordSpans.push({ word: token.text, span });
      sent.append(span);
    }
  }

  function setCurrent(word: string, span: HTMLElement): void {
    currentWord = word;
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

  function nextUnknown(): void {
    if (wordSpans.length === 0) return;
    const n = wordSpans.length;
    for (let step = 1; step <= n; step++) {
      const idx = (activeIndex + step) % n;
      const entry = wordSpans[idx];
      if (entry && !isKnown(state.getStatus(entry.word))) {
        setActive(idx);
        return;
      }
    }
  }

  function onKeyDown(ev: KeyboardEvent): void {
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (ev.key === "Escape") {
      popup.close();
      return;
    }

    if (!state.settings.knownStateOn) return;

    if (ev.key === "ArrowRight") {  
      ev.preventDefault();
      setActive(activeIndex + 1);
      return;
    }
    if (ev.key === "ArrowLeft" || ev.key === "h") {
      ev.preventDefault();
      setActive(activeIndex - 1);
      return;
    }
    if (ev.key === "n") {
      ev.preventDefault();
      nextUnknown();
      return;
    }

    const status = hotkeyToStatus(ev.key);
    if (status && currentWord) {
      ev.preventDefault();
      state.gradeWord(currentWord, status);
      popup.close();
    }

    
    if ((ev.key === "b" || ev.key === "B") && state.settings.knownStateOn) {
      ev.preventDefault();
      for (const { word } of wordSpans) {
        const st = state.getStatus(word);
        if (!isKnown(st)) state.gradeWord(word, "known");
      }
      popup.close();
    }
  }

  document.addEventListener("keydown", onKeyDown);

  const offStatus = state.subscribe("status", recolor);
  const offSettings = state.subscribe("settings", () => {
    if (state.settings.knownStateOn) recolor();
    else {
      for (const { word, span } of wordSpans) {
        for (const c of [...span.classList]) {
          if (c.startsWith("tsg-status-")) span.classList.remove(c);
        }
        const cur = currentContent();
        span.classList.toggle(CLS.nw, cur ? isNewTargetWord(cur, word) : false);
      }
    }
  });

  buildProse();

  if (wordSpans.length > 0) {
    const first = wordSpans[0];
    if (first) setCurrent(first.word, first.span);
  }

  
  
  
  
  
  
  proseRoot.addEventListener("click", (ev) => {
    const sent = (ev.target as HTMLElement).closest(".sent");
    if (sent) {
      const sents = Array.from(proseRoot.querySelectorAll(".sent"));
      const idx = sents.indexOf(sent);
      if (idx >= 0) {
        selectSentence(idx);
      }

      
      
      
      const chinese = sent.querySelector(".chinese") || sent; 
      if (chinese.classList.contains("chinese-hidden") || (state.settings as any).audioOnly) {
        chinese.classList.remove("chinese-hidden");
        chinese.classList.add("revealed");
        
        if (voicePlayer && currentCue >= 0) {
          voicePlayer.playCue(currentCue);
        }
      }

      
      if (transcriptDoc && idx >= 0) {
        const cue = transcriptDoc.cues[idx];
        const tr = cue?.tr;
        if (tr) {
          let reveal = sent.querySelector(".sent-tr");
          if (reveal) {
            reveal.remove(); 
          } else {
            const transLang = state.settings.gloss === "vi" ? "vi" : "en";
            reveal = el("span", {
              class: `sent-tr ${transLang}`,
              text: ` 〔${tr}〕`
            });
            
            const anchor = sent.querySelector(".chinese") || sent;
            anchor.append(reveal);
          }
        }
      }
    }
  });

  
  
  
  
  
  
  
  
  
  const onVoiceKey = (ev: KeyboardEvent) => {
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (ev.key.toLowerCase() === "l") {
      ev.preventDefault();
      const shadowActive = shadowState.phase !== "idle";
      const practiceActive = !!practice;
      const hasVoice = !!voicePlayer;
      if (practiceActive || shadowActive || hasVoice) {
        
        if (practice) {
          practice.toggleLoop();
          
          if (practice.isLooping()) {
            const c = currentCue >= 0 ? currentCue : 0;
            if (voicePlayer) {
              voicePlayer.playCue(c);
            } else {
              
              practice.playPause();
            }
          }
        } else if (voicePlayer) {
          
          
          const c = currentCue >= 0 ? currentCue : 0;
          voicePlayer.playCue(c);
          highlightCue(c);
        }
      } else {
        
        setActive(activeIndex + 1);
      }
      return;
    }

    if (ev.key === " " && voicePlayer && shadowState.phase !== "idle") {
      ev.preventDefault();
      const nextEv = { type: "advance" as const };
      shadowState = shadowReducer(shadowState, nextEv, (transcriptDoc?.cues.length ?? cueRanges.length ?? 1));
      if (shadowState.phase === "playing") {
        const c = (shadowState as any).cue ?? 0;
        voicePlayer.playCue(c);
        highlightCue(c);
      }
    }
    if (ev.key.toLowerCase() === "s" && voicePlayer) {
      
      ev.preventDefault();
      const c = currentCue >= 0 ? currentCue : 0;
      shadowState = shadowReducer(SHADOW_IDLE, { type: "start", cue: c }, 99);
      voicePlayer.playCue(c, { onEnded: () => { shadowState = shadowReducer(shadowState, { type: "audioEnded" }, 99); } });
      highlightCue(c);
    }
  };
  document.addEventListener("keydown", onVoiceKey);

  async function attachVoice(demo = true): Promise<VoicePlayer | null> {
    if (voicePlayer) return voicePlayer;
    const cuesForVoice = (transcriptDoc?.cues.map(c => ({ text: c.text })) ?? [{ text: "demo" }]);
    voicePlayer = createVoicePlayer({
      vault: vault ?? undefined,
      binding: state.voiceBinding ?? undefined,
      cues: cuesForVoice,
      speak: (text: string) => {  },
    });
    return voicePlayer;
  }

  async function attachPracticeBar(container: HTMLElement): Promise<PracticeBar | null> {
    if (practice) practice.destroy();
    const p = await createPracticeBar({
      container,
      vault: vault ?? undefined,
      binding: state.voiceBinding ?? null,
      initialCue: Math.max(0, currentCue),
    });
    practice = p;
    if (practice && currentCue >= 0) practice.setCue(currentCue);
    return p;
  }

  
  async function attachCueWaveformsLocal(opts: { vault: VaultIO; binding?: any; tracks?: any }): Promise<CueWaveforms | null> {
    
    
    return null;
  }

  function setTranscript(doc: TranscriptDoc | null) {
    transcriptDoc = doc;
    state.setTranscript(doc);
    if (doc) {
      const prepared = currentContent();
      if (prepared) {
        cueRanges = alignCuesToTokens(prepared.tokens, doc.cues);
      }
      
      if (currentCue >= 0) highlightCue(currentCue);
    }
  }

  const origRebuild = () => {  };
  const origUnmount = () => {  };

  return {
    rebuildProse() {
      popup.close();
      buildProse();
      if (transcriptDoc) {
        
        const prepared = currentContent();
        if (prepared) cueRanges = alignCuesToTokens(prepared.tokens, transcriptDoc.cues);
      }
    },
    unmount() {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keydown", onVoiceKey);
      offStatus();
      offSettings();
      popup.close();
      if (practice) practice.destroy();
      if (voicePlayer) voicePlayer.destroy();
      if (cueWaves) { try { cueWaves.destroy(); } catch {} cueWaves = null; }
      clear(proseRoot);
    },
    attachVoice,
    attachPracticeBar,
    setTranscript,
    highlightCue,
    attachCueWaveforms: attachCueWaveformsLocal,
  };
}

export { GRADE_LABELS };