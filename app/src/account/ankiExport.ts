/**
 * Anki deck builder for account surface — pure deck construction from WordStore.
 * Browser download + wasm live in host/anki.ts.
 */

import {
  type AnkiDeck,
  type AnkiNote,
  type WordEntry,
  type WordStatus,
  type WordStore,
} from "@tsumugu/engine";

export type KnownDeckLang = string;

const EXPORT_STATUSES: WordStatus[] = ["1", "2", "3", "4", "known"];

/** Pull a captured context sentence from store entry custom fields or notes. */
function contextFromEntry(entry: WordEntry): string | undefined {
  const example = entry.custom?.examples?.[0];
  if (example?.text?.trim()) return example.text.trim();
  if (entry.notes?.trim()) return entry.notes.trim();
  return undefined;
}

function backFromEntry(entry: WordEntry): string {
  const parts: string[] = [];
  const reading = entry.custom?.reading?.trim();
  const gloss = entry.custom?.gloss?.trim();
  if (reading) parts.push(reading);
  if (gloss) parts.push(gloss);
  const ctx = contextFromEntry(entry);
  if (ctx) parts.push(`<div class="ctx">${ctx}</div>`);
  return parts.join("<br>") || "(no gloss)";
}

function noteFromEntry(entry: WordEntry): AnkiNote {
  const ctx = contextFromEntry(entry);
  const front = ctx ? `${entry.word}<br><small>${ctx}</small>` : entry.word;
  return {
    front,
    back: backFromEntry(entry),
    tags: ["tsumugu", entry.lang, entry.status],
    guidSeed: `${entry.lang}:${entry.word}`,
  };
}

/** Build an Anki deck from known + learning words in the store. */
export function buildKnownDeck(store: WordStore, lang: KnownDeckLang = "zh-Hant"): AnkiDeck {
  const entries = store.all(lang).filter((e) => EXPORT_STATUSES.includes(e.status));
  return {
    name: `Tsumugu ${lang}`,
    notes: entries.map(noteFromEntry),
  };
}