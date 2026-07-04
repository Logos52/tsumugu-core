import { describe, it, expect } from "vitest";
import {
  SHADOW_IDLE,
  shadowReducer,
  shadowActive,
  shadowCue,
} from "./shadowing.js";

describe("shadowing state machine", () => {
  it("start → playing", () => {
    const s = shadowReducer(SHADOW_IDLE, { type: "start", cue: 0 }, 3);
    expect(s).toEqual({ phase: "playing", cue: 0 });
    expect(shadowActive(s)).toBe(true);
    expect(shadowCue(s)).toBe(0);
  });

  it("audioEnded playing → waiting", () => {
    let s = shadowReducer(SHADOW_IDLE, { type: "start", cue: 1 }, 3);
    s = shadowReducer(s, { type: "audioEnded" }, 3);
    expect(s).toEqual({ phase: "waiting", cue: 1 });
  });

  it("advance waiting → next playing or done", () => {
    let s = shadowReducer(SHADOW_IDLE, { type: "start", cue: 1 }, 3);
    s = shadowReducer(s, { type: "audioEnded" }, 3);
    s = shadowReducer(s, { type: "advance" }, 3);
    expect(s).toEqual({ phase: "playing", cue: 2 });
    s = shadowReducer(s, { type: "advance" }, 3);
    expect(s).toEqual({ phase: "done" });
  });

  it("exit always idle", () => {
    const s = shadowReducer({ phase: "waiting", cue: 0 }, { type: "exit" }, 3);
    expect(s).toBe(SHADOW_IDLE);
  });
});
