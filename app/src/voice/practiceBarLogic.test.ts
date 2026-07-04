import { describe, it, expect } from "vitest";
import {
  loopBounds,
  nearestEdge,
  nudgeEdge,
  cycleSpeed,
  type Bounds,
} from "./practiceBarLogic.js";

describe("practiceBarLogic", () => {
  const dur = 10;

  it("loopBounds defaults to full cue", () => {
    expect(loopBounds(null, dur)).toEqual({ start: 0, end: 10 });
  });

  it("nearestEdge picks closer", () => {
    const b: Bounds = { start: 1, end: 4 };
    expect(nearestEdge(b, 1.1)).toBe("start");
    expect(nearestEdge(b, 3.9)).toBe("end");
  });

  it("nudgeEdge clamps and respects MIN", () => {
    const b: Bounds = { start: 2, end: 5 };
    const n1 = nudgeEdge(b, "start", -1, dur);
    expect(n1.start).toBe(1);
    const n2 = nudgeEdge(n1, "start", -2, dur);
    expect(n2.start).toBe(0);
  });

  it("cycleSpeed wraps presets", () => {
    expect(cycleSpeed(1)).toBe(0.85);
    expect(cycleSpeed(0.75)).toBe(1);
  });
});
