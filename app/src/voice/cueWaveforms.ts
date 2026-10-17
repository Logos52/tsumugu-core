import { mountCueWaveformsTail1 } from "./cueWaveforms.fns1.js";
import { mountCueWaveformsTail2 } from "./cueWaveforms.fns2.js";

import type { VaultIO } from "@tsumugu/engine";
import { resolveAudioPath, type VoiceNotesBinding } from "./manifest.js";
import { el } from "../ui/dom.js";
import { CLS } from "../ui/classes.js";

interface CueWaveTrack {
  label: string;
  binding: VoiceNotesBinding;
}

export interface CueWaveforms {
  setActive(cueIndex: number): void;
  
  setTranslationVisible(on: boolean): void;
  key(ev: KeyboardEvent): boolean;
  playThrough(): void;
  stop(): void;
  isPlaying(): boolean;
  destroy(): void;
}

interface CueWaveformOpts {
  ranges: readonly { startToken: number; endToken: number }[];
  tokenEls: readonly (HTMLElement | null)[];
  vault: VaultIO;
  
  tracks: readonly CueWaveTrack[];
  
  translations?: readonly (string | undefined)[];
  showTranslation?: boolean;
  onActivate?: (cueIndex: number) => void;
}

const NOOP: CueWaveforms = {
  setActive() {},
  setTranslationVisible() {},
  key: () => false,
  playThrough() {},
  stop() {},
  isPlaying: () => false,
  destroy() {},
};

export async function mountCueWaveforms(opts: CueWaveformOpts): Promise<CueWaveforms> {
const ctx: any = {};

  const { ranges, tokenEls, vault, tracks, translations, onActivate } = opts;
  const showTr = opts.showTranslation ?? false;
ctx.showTr = showTr;
  if (!vault.readBytes || tracks.length === 0) return NOOP;
  const container = tokenEls.find((e) => e)?.parentElement;
  if (!container) return NOOP;

  const { default: WaveSurfer } = await import("wavesurfer.js");
  const { default: RegionsPlugin } = await import("wavesurfer.js/plugins/regions");
  const cssVar = (n: string, f: string) =>
    (typeof getComputedStyle === "function" &&
      getComputedStyle(document.documentElement).getPropertyValue(n).trim()) ||
    f;

  interface Region {
    play: () => void;
  }
  interface Inst {
    cue: number;
    trackIdx: number;
    row: HTMLElement;
    ws: import("wavesurfer.js").default;
    region: Region | null;
    looping: boolean;
    lp: HTMLButtonElement;
    url: string | null;
  }

  container.classList.add("tsg-cue-rows");
  if (ctx.showTr) container.classList.add("tsg-cue-tr-on");
  const frag = document.createDocumentFragment();
  const pendings: {
    cue: number;
    row: HTMLElement;
    waveEl: HTMLElement;
    pp: HTMLButtonElement;
    lp: HTMLButtonElement;
    audio: string;
    binding: VoiceNotesBinding;
    trackIdx: number;
  }[] = [];

  for (let c = 0; c < ranges.length; c++) {
    const range = ranges[c]!;
    const row = document.createElement("div");
    row.className = "tsg-cue-row";
    const textEl = document.createElement("div");
    textEl.className = "tsg-cue-text";
    for (let i = range.startToken; i < range.endToken; i++) {
      const node = tokenEls[i];
      if (node) textEl.append(node);
    }
    const tr = translations?.[c]?.trim();
    if (tr) textEl.append(el("div", { class: CLS.cueTr ?? "tsg-cue-tr", text: tr }));
    row.append(textEl);

    const stack = document.createElement("div");
    stack.className = "tsg-cue-wavestack";
    let anyAudio = false;

    for (let t = 0; t < tracks.length; t++) {
      const track = tracks[t]!;
      const note = track.binding.byCue.get(c);
      if (!note) continue;
      anyAudio = true;
      const wrap = document.createElement("div");
      wrap.className = "tsg-cue-wavewrap";
      const label = document.createElement("span");
      label.className = "tsg-cw-label";
      label.textContent = track.label;
      const pp = document.createElement("button");
      pp.className = "tsg-cw-btn";
      pp.textContent = "▶";
      pp.title = `Play ${track.label} (Space on row)`;
      const waveEl = document.createElement("div");
      waveEl.className = "tsg-cw-wave";
      const lp = document.createElement("button");
      lp.className = "tsg-cw-btn";
      lp.textContent = "🔁";
      lp.title = "Loop highlighted region (L)";
      wrap.append(label, pp, waveEl, lp);
      stack.append(wrap);
      pendings.push({
        cue: c,
        row,
        waveEl,
        pp,
        lp,
        audio: note.audio,
        binding: track.binding,
        trackIdx: t,
      });
    }

    if (anyAudio) row.append(stack);
    frag.append(row);
  }
  ctx.container = container; ctx.frag = frag; ctx.pendings = pendings; ctx.cssVar = cssVar; ctx.resolveAudioPath = resolveAudioPath; ctx.WaveSurfer = WaveSurfer; ctx.RegionsPlugin = RegionsPlugin; ctx.vault = vault; ctx.onActivate = onActivate;
return mountCueWaveformsTail2(ctx);
}
