import { mountCueWaveformsTail1 } from "./cueWaveforms.fns1.js";
import type { VaultIO } from "@tsumugu/engine";
import { resolveAudioPath, type VoiceNotesBinding } from "./manifest.js";
import { el } from "../ui/dom.js";
import { CLS } from "../ui/classes.js";
export async function mountCueWaveformsTail2(ctx: any): Promise<any> {
ctx.container.replaceChildren(ctx.frag);

  const insts: any[] = [];
  const idxByCue = new Map<number, number>();
  let active = 0;
  const chaining = false;
ctx.chaining = chaining;

  function setActive(i: number): void {
    if (i < 0 || i >= insts.length) return;
    const cue = insts[i]!.cue;
    document.querySelectorAll(".tsg-cue-row.tsg-cw-active").forEach((n) => n.classList.remove("tsg-cw-active"));
    insts[i]!.row.classList.add("tsg-cw-active");
    active = i;
    void cue;
  }
  function activateFrom(inst: any): void {
    const first = insts.findIndex((x) => x.cue === inst.cue);
    if (first >= 0) setActive(first);
    ctx.onActivate?.(inst.cue);
  }
  function playany(inst: any, fromStart: boolean): void {
    for (const o of insts) {
      if (o.cue === inst.cue && o !== inst) {
        try {
          o.ws.pause();
        } catch {

        }
      }
    }
    if (inst.looping && inst.region) {
      inst.region.play();
      return;
    }
    if (fromStart) inst.ws.setTime(0);
    void inst.ws.play();
  }
  function onFinish(inst: any): void {
    if (inst.looping && !inst.region) {
      void inst.ws.play();
      return;
    }
    if (ctx.chaining) {
      const curIdx = idxByCue.get(inst.cue)!;
      const nextCue = insts[curIdx + 1]?.cue;
      const next = nextCue !== undefined ? insts.find((x) => x.cue === nextCue && x.trackIdx === 0) : undefined;
      if (next) {
        activateFrom(next);
        next.row.scrollIntoView({ block: "nearest", behavior: "smooth" });
        playany(next, true);
      } else {
        ctx.chaining = false;
      }
    }
  }

  for (const p of ctx.pendings) {
    const ws = ctx.WaveSurfer.create({
      container: p.waveEl,
      height: 28,
      waveColor: ctx.cssVar("--wnac-overlay0", "#2e466b"),
      progressColor:
        p.trackIdx === 0
          ? ctx.cssVar("--wnac-blue", "#5089d8")
          : ctx.cssVar("--wnac-mauve", "#b36ef5"),
      cursorColor: ctx.cssVar("--wnac-blue-bright", "#66aaf7"),
      normalize: true,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });
    const regions = ws.registerPlugin(ctx.anysPlugin.create());
    regions.enableDragSelection({ color: "rgba(80,137,216,0.20)" });
    const inst: any = {
      cue: p.cue,
      trackIdx: p.trackIdx,
      row: p.row,
      ws,
      region: null,
      looping: false,
      lp: p.lp,
      url: null,
    };
    regions.on("region-created", (r: any) => {
      for (const o of regions.getanys()) if (o !== r) o.remove();
      inst.region = r as unknown as any;
      activateFrom(inst);
    });
    regions.on("region-updated", (r: any) => {
      inst.region = r as unknown as any;
    });
    regions.on("region-out", (r: any) => {
      if (inst.looping && (r as unknown as any) === inst.region) (r as unknown as any).play();
    });
    ws.on("finish", () => onFinish(inst));
    ws.on("interaction", () => activateFrom(inst));

    void (async () => {
      try {
        const bytes = await ctx.vault.readBytes!(ctx.resolveAudioPath(p.binding.baseDir, p.audio));
        if (!bytes) return;
        inst.url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer]));
        await ws.load(inst.url);
      } catch {

      }
    })();

    p.pp.onclick = () => {
      const i = insts.findIndex((x) => x.cue === p.cue && x.trackIdx === p.trackIdx);
      if (i >= 0) active = i;
      activateFrom(inst);
      ctx.chaining = false;
      if (inst.ws.isPlaying()) inst.ws.pause();
      else playany(inst, false);
    };
    p.lp.onclick = () => {
      activateFrom(inst);
      inst.looping = !inst.looping;
      p.lp.classList.toggle("on", inst.looping);
      if (inst.looping) playany(inst, true);
    };
    if (!idxByCue.has(p.cue)) idxByCue.set(p.cue, insts.length);
    insts.push(inst);
  }
  ctx.insts = insts; ctx.setActive = setActive; ctx.active = active; ctx.playany = playany; ctx.idxByCue = idxByCue;
return mountCueWaveformsTail1(ctx);
}
