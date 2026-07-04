import { describe, it, expect } from "vitest";

import type { PreparedToken } from "@tsumugu/engine";
import {
  parseTimecode,
  cueIndexAtTime,
  alignCuesToTokens,
  shouldLoopBack,
  timelineTime,
  snapToBoundary,
  type TranscriptCue,
} from "./sync.js";

const w = (text: string): PreparedToken => ({ text, isWord: true });
const p = (text: string): PreparedToken => ({ text, isWord: false });

describe("parseTimecode", () => {
  it("parses HH:MM:SS,mmm (SRT comma) and dot forms", () => {
    expect(parseTimecode("00:00:03,000")).toBe(3);
    expect(parseTimecode("00:00:03.500")).toBe(3.5);
    expect(parseTimecode("01:02:03,500")).toBeCloseTo(3723.5, 3);
  });
  it("parses MM:SS and bare seconds", () => {
    expect(parseTimecode("02:05")).toBe(125);
    expect(parseTimecode("7.25")).toBe(7.25);
  });
  it("does not NaN-poison on junk", () => {
    expect(parseTimecode("")).toBe(0);
    expect(parseTimecode("aa:bb")).toBe(0);
  });
});

describe("cueIndexAtTime", () => {
  const cues = [
    { start: "00:00:00,000", end: "00:00:02,000" },
    { start: "00:00:02,000", end: "00:00:05,000" },
  ];
  it("finds cue in range", () => {
    expect(cueIndexAtTime(cues, 1)).toBe(0);
    expect(cueIndexAtTime(cues, 3)).toBe(1);
  });
  it("returns -1 outside", () => {
    expect(cueIndexAtTime(cues, 6)).toBe(-1);
  });
});

describe("alignCuesToTokens", () => {
  it("aligns simple sequential cues", () => {
    const tokens = [w("你"), w("好"), p("。"), w("世"), w("界")];
    const cues: TranscriptCue[] = [
      { text: "你好。", start: "0", end: "1" },
      { text: "世界", start: "1", end: "2" },
    ];
    const ranges = alignCuesToTokens(tokens, cues);
    expect(ranges.length).toBe(2);
    expect(ranges[0]).toEqual({ cueIndex: 0, startToken: 0, endToken: 3 });
    expect(ranges[1]).toEqual({ cueIndex: 1, startToken: 3, endToken: 5 });
  });
});

describe("shouldLoopBack", () => {
  it("detects end of loop region", () => {
    expect(shouldLoopBack(5, { start: 0, end: 5 })).toBe(true);
    expect(shouldLoopBack(4.9, { start: 0, end: 5 })).toBe(false);
  });
});

describe("timelineTime + snap", () => {
  it("maps pointer and snaps to boundary", () => {
    expect(timelineTime(50, 0, 100, 10)).toBe(5);
    expect(snapToBoundary(4.1, [0, 2, 5, 10])).toBe(5);
  });
});
