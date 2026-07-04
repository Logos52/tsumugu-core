/**
 * Voice-notes manifest (data-free port of monorepo voice/manifest.ts).
 *
 * The reader's view of a `tsumugu/voice-notes@1` sidecar.
 * Inert without assets + demo hook: parse succeeds on demo manifests; player uses Web Speech fallback when no audio.
 * Per-sentence segmented audio support for readings (policy kept: per-sentence vs dict head+examples).
 */

export const VOICE_NOTES_SCHEMA = "tsumugu/voice-notes@1";

export interface VoiceNote {
  cueIndex: number;
  audio: string;
  audioSlow?: string;
}

export interface VoiceNotesManifest {
  schema: typeof VOICE_NOTES_SCHEMA;
  lang: string;
  slug: string;
  engine: string;
  voice: string;
  generatedAt?: string;
  notes: VoiceNote[];
}

export function parseVoiceNotes(raw: unknown, cueCount: number): VoiceNotesManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema !== VOICE_NOTES_SCHEMA || !Array.isArray(o.notes)) return null;

  const byIndex = new Map<number, VoiceNote>();
  for (const entry of o.notes) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const idx = r.cueIndex;
    if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx >= cueCount) continue;
    if (typeof r.audio !== "string" || r.audio.length === 0) continue;
    const note: VoiceNote = { cueIndex: idx, audio: r.audio };
    if (typeof r.audioSlow === "string" && r.audioSlow.length > 0) note.audioSlow = r.audioSlow;
    byIndex.set(idx, note);
  }
  const notes = [...byIndex.values()].sort((a, b) => a.cueIndex - b.cueIndex);

  const m: VoiceNotesManifest = {
    schema: VOICE_NOTES_SCHEMA,
    lang: typeof o.lang === "string" ? o.lang : "",
    slug: typeof o.slug === "string" ? o.slug : "",
    engine: typeof o.engine === "string" ? o.engine : "",
    voice: typeof o.voice === "string" ? o.voice : "",
    notes,
  };
  if (typeof o.generatedAt === "string") m.generatedAt = o.generatedAt;
  return m;
}

export function indexNotes(manifest: VoiceNotesManifest): ReadonlyMap<number, VoiceNote> {
  const map = new Map<number, VoiceNote>();
  for (const n of manifest.notes) map.set(n.cueIndex, n);
  return map;
}

export function resolveAudioPath(baseDir: string, rel: string): string {
  const b = baseDir.replace(/\/+$/, "");
  const r = rel.replace(/^\.?\/+/, "");
  return b ? `${b}/${r}` : r;
}

export interface VoiceNotesBinding {
  manifest: VoiceNotesManifest;
  baseDir: string;
  byCue: ReadonlyMap<number, VoiceNote>;
}

export function bindVoiceNotes(manifest: VoiceNotesManifest, baseDir: string): VoiceNotesBinding {
  return { manifest, baseDir, byCue: indexNotes(manifest) };
}

/** Demo hook: synthetic manifest for testing without assets. */
export function createDemoVoiceNotes(cueCount: number): VoiceNotesManifest {
  const notes: VoiceNote[] = [];
  for (let i = 0; i < cueCount; i++) {
    notes.push({ cueIndex: i, audio: `demo/cue-${i.toString().padStart(4, "0")}.mp3` });
  }
  return {
    schema: VOICE_NOTES_SCHEMA,
    lang: "zh-Hant",
    slug: "demo",
    engine: "demo",
    voice: "demo-serena",
    notes,
  };
}
