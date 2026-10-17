import type { VaultIO } from "@tsumugu/engine";
import { resolveAudioPath, type VoiceNotesBinding } from "./manifest.js";
import { el } from "../ui/dom.js";
import { CLS } from "../ui/classes.js";
export function mountCueWaveformsTail1(ctx: any): any {
if (ctx.insts.length) ctx.setActive(0);

  function primaryOnRow(cue: number): any {
    return ctx.insts.find((x: any) => x.cue === cue && x.trackIdx === 0) ?? ctx.insts.find((x: any) => x.cue === cue);
  }

  function playActive(): void {
    const inst = ctx.insts[ctx.active] ?? primaryOnRow(ctx.insts[ctx.active]?.cue ?? 0);
    if (!inst) return;
    ctx.chaining = false;
    if (inst.ws.isPlaying()) inst.ws.pause();
    else ctx.playInst(inst, false);
  }

  return {
    setActive(cueIndex: any) {
      const i = ctx.idxByCue.get(cueIndex);
      if (i !== undefined) ctx.setActive(i);
    },
    setTranslationVisible(on: boolean) {
      ctx.showTr = on;
      ctx.container.classList.toggle("tsg-cue-tr-on", on);
    },
    key(ev: any) {
      if (!ctx.insts.length) return false;
      if (ev.key === " " || ev.code === "Space") {
        ev.preventDefault();
        playActive();
        return true;
      }
      if (ev.key === "ArrowDown" || ev.key === ".") {
        ev.preventDefault();
        const curCue = ctx.insts[ctx.active]?.cue ?? 0;
        const next = ctx.insts.find((x: any) => x.cue > curCue && x.trackIdx === 0);
        if (next) {
          ctx.setActive(ctx.insts.indexOf(next));
          next.row.scrollIntoView({ block: "nearest", behavior: "smooth" });
          ctx.onActivate?.(next.cue);
        }
        return true;
      }
      if (ev.key === "ArrowUp" || ev.key === ",") {
        ev.preventDefault();
        const curCue = ctx.insts[ctx.active]?.cue ?? 0;
        const prev = [...ctx.insts].reverse().find((x) => x.cue < curCue && x.trackIdx === 0);
        if (prev) {
          ctx.setActive(ctx.insts.indexOf(prev));
          prev.row.scrollIntoView({ block: "nearest", behavior: "smooth" });
          ctx.onActivate?.(prev.cue);
        }
        return true;
      }
      if (ev.key === "L" || ev.key === "l") {
        const inst = ctx.insts[ctx.active];
        if (inst) inst.lp.click();
        return true;
      }
      return false;
    },
    playThrough() {
      const inst = primaryOnRow(ctx.insts[ctx.active]?.cue ?? ctx.insts[0]!.cue);
      if (!inst) return;
      ctx.chaining = true;
      ctx.playInst(inst, true);
    },
    stop() {
      ctx.chaining = false;
      for (const i of ctx.insts) {
        try {
          i.ws.pause();
        } catch {
          
        }
      }
    },
    isPlaying() {
      return ctx.insts.some((i: any) => {
        try {
          return i.ws.isPlaying();
        } catch {
          return false;
        }
      });
    },
    destroy() {
      for (const i of ctx.insts) {
        try {
          i.ws.destroy();
        } catch {
          
        }
        if (i.url) URL.revokeObjectURL(i.url);
      }
      ctx.insts.length = 0;
      ctx.idxByCue.clear();
    },
  };
}
