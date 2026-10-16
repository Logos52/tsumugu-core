

import type { VaultIO } from "@tsumugu/engine";
import type { Region } from "wavesurfer.js/plugins/regions";

import { resolveAudioPath, type VoiceNotesBinding } from "./manifest.js";
import {
  cycleSpeed as nextSpeedPreset,
  nearestEdge,
  nudgeEdge,
  NUDGE_SEC,
  type Bounds,
} from "./practiceBarLogic.js";

export interface PracticeBar {
  
  setCue(cueIndex: number): void;
  
  toggleLoop(): void;
  
  nudge(dir: -1 | 1): void;
  
  cycleSpeed(): number;
  
  playPause(): void;
  isLooping(): boolean;
  
  destroy(): void;
}

export interface PracticeBarArgs {
  
  container: HTMLElement;
  vault?: VaultIO | null;
  binding?: VoiceNotesBinding | null;
  
  initialCue: number;
}

export async function createPracticeBar(args: PracticeBarArgs): Promise<PracticeBar | null> {
  const { container, vault, binding, initialCue } = args;
  if (!vault?.readBytes || !binding) {
    
    
    const noop: PracticeBar = {
      setCue() {},
      toggleLoop() {},
      nudge() {},
      cycleSpeed() { return 1; },
      playPause() {},
      isLooping() { return false; },
      destroy() {},
    };
    
    const ph = document.createElement("div");
    ph.textContent = "[practice bar: no audio vault/binding]";
    ph.style.cssText = "font-size:10px;opacity:0.6;padding:4px;";
    container.appendChild(ph);
    (noop as any)._ph = ph; 
    return noop;
  }

  
  const { default: WaveSurfer } = await import("wavesurfer.js");
  const { default: RegionsPlugin } = await import("wavesurfer.js/plugins/regions");

  const cssVar = (name: string, fallback: string): string => {
    if (typeof getComputedStyle !== "function") return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  const ws = WaveSurfer.create({
    container,
    height: 64,
    waveColor: cssVar("--wnac-overlay0", "#2e466b"),
    progressColor: cssVar("--wnac-blue", "#5089d8"),
    cursorColor: cssVar("--wnac-blue-bright", "#66aaf7"),
  });
  const regions = ws.registerPlugin(RegionsPlugin.create());
  regions.enableDragSelection({ color: "rgba(80,137,216,0.20)" });

  let looping = false;
  let region: Region | null = null;
  let rate = 1;
  const urlCache = new Map<number, string>(); 
  let loadToken = 0;

  
  regions.on("region-created", (r: Region) => {
    for (const other of regions.getRegions()) if (other !== r) other.remove();
    region = r;
  });
  regions.on("region-updated", (r: Region) => {
    region = r;
  });
  
  regions.on("region-out", (r: Region) => {
    if (looping && r === region) r.play();
  });

  async function urlForCue(i: number): Promise<string | null> {
    const hit = urlCache.get(i);
    if (hit !== undefined) {
      urlCache.delete(i);
      urlCache.set(i, hit);
      return hit;
    }
    const b = binding; 
    const v = vault;
    if (!b || !v?.readBytes) return null;
    const note = b.byCue.get(i);
    if (!note || !v.readBytes) return null;
    let bytes: Uint8Array | null;
    try {
      bytes = await v.readBytes(resolveAudioPath(b.baseDir, note.audio));
    } catch {
      return null;
    }
    if (!bytes) return null;
    const part = new Uint8Array(bytes); 
    const url = URL.createObjectURL(new Blob([part.buffer]));
    urlCache.set(i, url);
    while (urlCache.size > 12) {
      const oldest = urlCache.keys().next().value as number | undefined;
      if (oldest === undefined) break;
      const u = urlCache.get(oldest);
      urlCache.delete(oldest);
      if (u) URL.revokeObjectURL(u);
    }
    return url;
  }

  async function loadCue(i: number): Promise<void> {
    loadToken++;
    const tk = loadToken;
    const url = await urlForCue(i);
    if (tk !== loadToken) return;
    if (!url) return; 
    looping = false;
    region = null;
    try {
      regions.clearRegions();
    } catch {
      
    }
    try {
      await ws.load(url);
      if (tk !== loadToken) return;
      ws.setPlaybackRate(rate, true);
    } catch {
      
    }
  }

  await loadCue(initialCue);

  return {
    setCue(i) {
      void loadCue(i);
    },
    toggleLoop() {
      looping = !looping;
      if (!looping) {
        ws.pause();
        return;
      }
      if (!region) {
        const end = ws.getDuration() || 0;
        if (end <= 0) {
          looping = false;
          return;
        }
        region = regions.addRegion({ start: 0, end, color: "rgba(80,137,216,0.20)" });
      }
      region.play();
    },
    nudge(dir) {
      if (!region) return;
      const b: Bounds = { start: region.start, end: region.end };
      const edge = nearestEdge(b, ws.getCurrentTime());
      const nb = nudgeEdge(b, edge, dir * NUDGE_SEC, ws.getDuration() || b.end);
      region.setOptions({ start: nb.start, end: nb.end });
    },
    cycleSpeed() {
      rate = nextSpeedPreset(rate);
      ws.setPlaybackRate(rate, true);
      return rate;
    },
    playPause() {
      void ws.playPause();
    },
    isLooping() {
      return looping;
    },
    destroy() {
      loadToken++;
      try { ws.destroy(); } catch {}
      for (const u of urlCache.values()) URL.revokeObjectURL(u);
      urlCache.clear();
    },
  };
}
