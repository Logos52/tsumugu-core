/**
 * Pure logic for the segment-loop practice bar (data-free port).
 * No DOM, no wavesurfer. Used by practice bar impl and A/B loop.
 * Inert w/o assets; demo supports.
 */

export interface Bounds {
  start: number;
  end: number;
}

export const SPEED_PRESETS = [1, 0.85, 0.75] as const;

export const NUDGE_SEC = 0.05;

export const MIN_REGION_SEC = 0.05;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

export function loopBounds(region: Bounds | null, cueDuration: number): Bounds {
  return region ?? { start: 0, end: cueDuration };
}

export function nearestEdge(b: Bounds, t: number): "start" | "end" {
  return Math.abs(t - b.start) <= Math.abs(t - b.end) ? "start" : "end";
}

export function nudgeEdge(b: Bounds, edge: "start" | "end", deltaSec: number, duration: number): Bounds {
  if (edge === "start") {
    return { start: clamp(b.start + deltaSec, 0, b.end - MIN_REGION_SEC), end: b.end };
  }
  return { start: b.start, end: clamp(b.end + deltaSec, b.start + MIN_REGION_SEC, duration) };
}

export function cycleSpeed(current: number, speeds: readonly number[] = SPEED_PRESETS): number {
  const i = speeds.indexOf(current);
  return speeds[(i + 1) % speeds.length] ?? speeds[0]!;
}
