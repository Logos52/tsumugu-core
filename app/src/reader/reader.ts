/**
 * Reader view — token-by-token render with status coloring and keyboard nav.
 * Core v1 reader — no synced-media or encoding-route coupling.
 * Words open def+form popup on *click* (see wordPopup.ts; hover is passive).
 */

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
  /** Voice / shadowing / practice with real assets when vault + binding present; fallback otherwise. */
  attachVoice(demo?: boolean): Promise<VoicePlayer | null>;
  attachPracticeBar(container: HTMLElement): Promise<PracticeBar | null>;
  /** For transcript sync + karaoke style cue highlight */
  setTranscript(doc: TranscriptDoc | null): void;
  highlightCue(cueIdx: number): void;
  /** Mount per-cue multi-row waveforms (cueWaveforms) when voice tracks + vault available. */
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

  // Voice / transcript extensions (inert + demo)
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
    // Known words keep a DIMMED ruby (design contract: known = no underline + dimmed
    // ruby, mockup .w.k rt). CSS (.w.tsg-status-known rt) does the dimming; render the
    // ruby whenever a reading exists so the mark is present to dim.
    const showRt = !!rtText;
    if (showRt) ruby.append(el("rt", { text: rtText }));
    span.append(ruby);

    span.addEventListener("mouseenter", (ev) => {
      setCurrent(word, span);
      // Popup opens on explicit mouse click only (def + form view).
      // Hover/shift logic retained for other behaviors (no auto popup).
    });
    span.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setCurrent(word, span);
      popup.open(word, span);
    });
    span.addEventListener("focus", () => {
      setCurrent(word, span);
      // Do not auto-open popup on focus; click or explicit setActive handles.
    });

    // hygiene 11.5: lazy wavesurfer stub for future audio (Phase2 port from monorepo)
    // dynamic import + LRU for regions only when audio manifest present. Inert otherwise.
    // (perf: no wavesurfer in initial bundle; see public pack tests too)
    if (import.meta.env.DEV && word.length > 3) {
      // placeholder for: import('wavesurfer.js').then(w => { /* LRU cache attach */ })
    }

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
    // highlight matching .sent that contains the cue's tokens (simple scan)
    const sents = Array.from(proseRoot.querySelectorAll(".sent"));
    sents.forEach((s, i) => s.classList.toggle(CLS.sel, i === cueIdx)); // crude but works for sentence-aligned
    // if ranges known, use token ranges to be more precise
    if (cueRanges.length && cueIdx >= 0) {
      const r = cueRanges[cueIdx];
      if (r) {
        wordSpans.forEach((ws, wi) => {
          const inRange = wi >= r.startToken && wi < r.endToken;
          ws.span.classList.toggle("cue-active", inRange);
        });
      }
    }
    // Follow with practice bar (Audacity-style AB) and cue waveforms when present
    if (practice) practice.setCue(Math.max(0, cueIdx));
    cueWaves?.setActive(Math.max(0, cueIdx));
  }

  /** Select a sentence/cue (by index among .sent elements) as loop target.
   *  Used by mouse clicks on sentences/waves and by word activation to keep
   *  the 'l' target in sync. */
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

    // Sync sentence/cue selection so that word nav or clicks make the containing
    // sentence/waveform the target for 'l' (loop). Mouse clicks on sentences also select.
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

    if (ev.key === "ArrowRight") {  // 'l' reclaimed exclusively for loop (see onVoiceKey context-aware handler)
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

    // Bulk mark as known (all visible non-known)
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

  // Sentence click for meaning reveal (gradable/hover/loopable text support)
  // Also: click selects sentence/wave so that 'l' triggers loop on it.
  // Enhanced for "audio only" + tap-to-reveal:
  // - In audioOnly mode (or always for practice): tap sentence reveals Chinese if hidden.
  // - Tap always toggles translation (EN/VI from cue.tr).
  // - Individual words inside still open dict popup (bubbles stopped at word level).
  proseRoot.addEventListener("click", (ev) => {
    const sent = (ev.target as HTMLElement).closest(".sent");
    if (sent) {
      const sents = Array.from(proseRoot.querySelectorAll(".sent"));
      const idx = sents.indexOf(sent);
      if (idx >= 0) {
        selectSentence(idx);
      }

      // 1. Tap-to-reveal Chinese text (for audio-only / waveforms-first mode)
      //    Add .audio-only class to root or sent to hide Chinese initially.
      //    Clicking .sent (or a .chinese wrapper) reveals it.
      const chinese = sent.querySelector(".chinese") || sent; // fallback to whole sent
      if (chinese.classList.contains("chinese-hidden") || (state.settings as any).audioOnly) {
        chinese.classList.remove("chinese-hidden");
        chinese.classList.add("revealed");
        // optional: auto-play the cue when revealing in audio mode
        if (voicePlayer && currentCue >= 0) {
          voicePlayer.playCue(currentCue);
        }
      }

      // 2. Tap to reveal / toggle sentence translation (EN or VI)
      if (transcriptDoc && idx >= 0) {
        const cue = transcriptDoc.cues[idx];
        const tr = cue?.tr;
        if (tr) {
          let reveal = sent.querySelector(".sent-tr");
          if (reveal) {
            reveal.remove(); // toggle off
          } else {
            const transLang = state.settings.gloss === "vi" ? "vi" : "en";
            reveal = el("span", {
              class: `sent-tr ${transLang}`,
              text: ` 〔${tr}〕`
            });
            // append after the main Chinese content
            const anchor = sent.querySelector(".chinese") || sent;
            anchor.append(reveal);
          }
        }
      }
    }
  });

  // Keyboard support for shadowing A/B advance (Space) + demo
  // 'l' (lowercase) reclaimed for loop on currently selected sentence/waveform
  // (ties to practiceBar.toggleLoop or region/cue play). Context/mode aware:
  // when practice bar or shadowing is active (or voicePlayer present for a
  // selected waveform/sentence), 'l' triggers loop/play; else falls back to
  // next-word nav (preserves old behavior in pure-text mode).
  // Does not affect grading hotkeys (1-4/k/K/x handled via hotkeyToStatus in onKeyDown).
  // Space/s conflict handled: Space only advances when shadow active; 's' starts.
  // 'l' is independent.
  const onVoiceKey = (ev: KeyboardEvent) => {
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (ev.key.toLowerCase() === "l") {
      ev.preventDefault();
      const shadowActive = shadowState.phase !== "idle";
      const practiceActive = !!practice;
      const hasVoice = !!voicePlayer;
      if (practiceActive || shadowActive || hasVoice) {
        // Voice/practice/shadow context: trigger loop on current selected sentence/wave
        if (practice) {
          practice.toggleLoop();
          // When enabling loop, kick off play on the selected cue (ties region play)
          if (practice.isLooping()) {
            const c = currentCue >= 0 ? currentCue : 0;
            if (voicePlayer) {
              voicePlayer.playCue(c);
            } else {
              // practice bar fallback play
              practice.playPause();
            }
          }
        } else if (voicePlayer) {
          // No bar attached yet, but voice present: 'l' plays/initiates on selected
          // (proxy for waveform region play / sentence loop)
          const c = currentCue >= 0 ? currentCue : 0;
          voicePlayer.playCue(c);
          highlightCue(c);
        }
      } else {
        // No voice mode active: fall back to nav (reclaim only affects voice contexts)
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
      // demo shadow start on current
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
      speak: (text: string) => { /* no-op or caller override in full app wiring */ },
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

  // Stub for optional cueWaveforms attach (full impl lives in voice/cueWaveforms; wired when assets present)
  async function attachCueWaveformsLocal(opts: { vault: VaultIO; binding?: any; tracks?: any }): Promise<CueWaveforms | null> {
    // In real would: if (cueWaves) cueWaves.destroy(); cueWaves = await mountCueWaveforms({...})
    // For now return null (inert); highlightCue already does safe cueWaves?.setActive
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
      // re-highlight if active cue
      if (currentCue >= 0) highlightCue(currentCue);
    }
  }

  const origRebuild = () => { /* capture later */ };
  const origUnmount = () => { /* */ };

  return {
    rebuildProse() {
      popup.close();
      buildProse();
      if (transcriptDoc) {
        // re-attach cue ranges
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