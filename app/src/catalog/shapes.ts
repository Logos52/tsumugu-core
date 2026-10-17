import type { Band, ReadingKind } from "./types.js";

const BANDS: readonly Band[] = ["A1", "A2", "B1"];
export const KINDS: readonly ReadingKind[] = ["story", "dialogue", "explainer", "byo"];

export function isBand(value: string): value is Band {
  return (BANDS as readonly string[]).includes(value);
}

export function isReadingKind(value: string): value is ReadingKind {
  return (KINDS as readonly string[]).includes(value);
}
