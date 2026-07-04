import type { Band } from "./types.js";

export interface Rung {
  id: Band;
  name: string;
  subtitle: string;
  order: number;
}

export const RUNGS: Rung[] = [
  { id: "A1", name: "Starter", subtitle: "A1 · TOCFL 1", order: 0 },
  { id: "A2", name: "Elementary", subtitle: "A2 · TOCFL 2", order: 1 },
  { id: "B1", name: "Intermediate", subtitle: "B1 · TOCFL 3", order: 2 },
];

const BY_ID = new Map(RUNGS.map((r) => [r.id, r]));

export function rungFor(band: Band): Rung {
  return BY_ID.get(band)!;
}