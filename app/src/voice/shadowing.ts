/**
 * Shadowing / chorusing mode — pure state machine (data-free port from monorepo).
 *
 * Loop: play cue → highlight stays → user repeats → Space advances.
 * No auto-advance. Esc exits. Inert without assets + demo hook.
 * Keeps per-sentence policy.
 */

export type ShadowState =
  | { phase: "idle" }
  | { phase: "playing"; cue: number }
  | { phase: "waiting"; cue: number }
  | { phase: "done" };

export type ShadowEvent =
  | { type: "start"; cue: number }
  | { type: "audioEnded" }
  | { type: "advance" }
  | { type: "exit" };

export const SHADOW_IDLE: ShadowState = { phase: "idle" };

export function shadowCue(state: ShadowState): number | null {
  return state.phase === "playing" || state.phase === "waiting" ? state.cue : null;
}

export function shadowActive(state: ShadowState): boolean {
  return state.phase !== "idle";
}

export function shadowReducer(state: ShadowState, event: ShadowEvent, cueCount: number): ShadowState {
  switch (event.type) {
    case "exit":
      return SHADOW_IDLE;
    case "start":
      if (event.cue < 0 || event.cue >= cueCount) return SHADOW_IDLE;
      return { phase: "playing", cue: event.cue };
    case "audioEnded":
      return state.phase === "playing" ? { phase: "waiting", cue: state.cue } : state;
    case "advance": {
      if (state.phase !== "playing" && state.phase !== "waiting") return state;
      const next = state.cue + 1;
      return next < cueCount ? { phase: "playing", cue: next } : { phase: "done" };
    }
    default:
      return state;
  }
}
