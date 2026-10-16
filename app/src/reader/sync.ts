

import type { PreparedToken } from "@tsumugu/engine";


export interface TranscriptCue {
  text: string;
  
  start: string;
  end: string;
  
  tr?: string;
  
  speaker?: string;
}


export interface TranscriptSection {
  start: string;
  end: string;
  title?: string;
  
  summary: string;
  
  tr?: string;
}


export interface TranscriptDoc {
  cues: TranscriptCue[];
  
  videoId?: string;
  
  sections?: TranscriptSection[];
}


export interface CueRange {
  cueIndex: number;
  startToken: number;
  
  endToken: number;
}


function densify(s: string): string {
  return s.replace(/\s+/gu, "");
}


export function parseTimecode(tc: string): number {
  if (!tc) return 0;
  const parts = tc.trim().replace(",", ".").split(":");
  let seconds = 0;
  for (const part of parts) {
    const n = Number(part);
    seconds = seconds * 60 + (Number.isFinite(n) ? n : 0);
  }
  return seconds;
}


export function cueTimes(
  spans: readonly { start: string; end: string }[],
): { start: number; end: number }[] {
  return spans.map((c) => ({ start: parseTimecode(c.start), end: parseTimecode(c.end) }));
}


export function shouldLoopBack(t: number, bounds: { start: number; end: number }): boolean {
  return t >= bounds.end;
}


export function timelineTime(clientX: number, left: number, width: number, duration: number): number {
  if (width <= 0) return 0;
  const f = Math.max(0, Math.min(1, (clientX - left) / width));
  return f * Math.max(0, duration);
}


export function snapToBoundary(t: number, boundaries: readonly number[]): number {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const b of boundaries) {
    const d = Math.abs(t - b);
    if (d < bestDist) {
      best = b;
      bestDist = d;
    }
  }
  return best ?? t;
}


export function cueIndexAtTime(
  spans: readonly { start: string; end: string }[],
  seconds: number,
  times: { start: number; end: number }[] = cueTimes(spans),
): number {
  for (let i = 0; i < times.length; i++) {
    const t = times[i]!;
    if (seconds >= t.start && seconds < t.end) return i;
  }
  return -1;
}


export function alignCuesToTokens(
  tokens: readonly PreparedToken[],
  cues: readonly TranscriptCue[],
): CueRange[] {
  const ranges: CueRange[] = [];
  const n = tokens.length;
  let cursor = 0;

  for (let ci = 0; ci < cues.length; ci++) {
    const target = densify(cues[ci]!.text);
    const startToken = cursor;
    let acc = 0;
    while (cursor < n && (acc < target.length || densify(tokens[cursor]!.text).length === 0)) {
      const len = densify(tokens[cursor]!.text).length;
      if (acc >= target.length && len > 0) break;
      acc += len;
      cursor++;
    }
    ranges.push({ cueIndex: ci, startToken, endToken: cursor });
  }
  return ranges;
}
