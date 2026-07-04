/**
 * Shared CSS class names for the Core reader shell.
 *
 * Status coloring classes come from the engine's `statusColorClass(status)`.
 */

export const CLS = {
  word: "w",
  punct: "punc",
  sent: "sent",
  prose: "prose",
  sel: "sel",
  nw: "nw",
  bridge: "bridge",
  ennote: "ennote",
  card: "card",
  dict: "dict",
  known: "known",
  add: "add",
  popupHidden: "tsg-popup-hidden",
  tone: (n: number) => `tone-${n}`,

  // Voice / transcript / practice additions (ported from monorepo for AB waveforms, cue rows, shadowing)
  cueActive: "cue-active",
  transcript: "tsg-transcript",
  player: "tsg-player",
  transport: "tsg-transport",
  scrubber: "tsg-scrubber",
  translation: "tsg-translation",
  cueTr: "tsg-cue-tr",
  section: "tsg-section",
  sectionTr: "tsg-section-tr",
  practiceBar: "tsg-practice",
  practiceWave: "tsg-practice-wave",
  loopStrip: "tsg-loop-strip",
  loopTrack: "tsg-loop-track",
  loopTick: "tsg-loop-tick",
  loopFill: "tsg-loop-fill",
  loopHandle: "tsg-loop-handle",
  loopPlayhead: "tsg-loop-playhead",
  btn: "tsg-btn",
  btnActive: "tsg-btn-active",
  metrics: "tsg-metrics",
} as const;