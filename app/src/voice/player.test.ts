import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVoicePlayer } from "./player.js";
import { parseVoiceNotes, bindVoiceNotes, createDemoVoiceNotes } from "./manifest.js";

describe("voice player (inert + demo)", () => {
  beforeEach(() => {
    // reset speech mock if any
    if (typeof window !== "undefined" && window.speechSynthesis) {
      vi.spyOn(window.speechSynthesis, "speak").mockImplementation(() => {});
      vi.spyOn(window.speechSynthesis, "cancel").mockImplementation(() => {});
    }
  });

  it("creates and stops without error when inert (no binding)", () => {
    const cues = [{ text: "你好。" }, { text: "世界。" }];
    const p = createVoicePlayer({ cues });
    expect(p).toBeTruthy();
    p.playCue(0);
    p.playFrom(0, { onDone: () => {} });
    p.stop();
    p.destroy();
  });

  it("demo hook accepts synthetic manifest", () => {
    const raw = { schema: "tsumugu/voice-notes@1", notes: [{ cueIndex: 0, audio: "d.mp3" }] };
    const m = parseVoiceNotes(raw, 1);
    expect(m).toBeTruthy();
    const b = bindVoiceNotes(m!, "demo");
    const cues = [{ text: "demo cue" }];
    const p = createVoicePlayer({ binding: b, cues });
    p.playCue(0, { slow: true });
    p.stop();
    expect(b.byCue.size).toBe(1);
  });

  it("demo manifest creator works", () => {
    const demo = createDemoVoiceNotes(2);
    expect(demo.notes.length).toBe(2);
  });
});
