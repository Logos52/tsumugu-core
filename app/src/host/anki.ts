/**
 * Browser host for Anki `.apkg` download — engine returns bytes; host owns wasm URL.
 */

import { buildApkg } from "@tsumugu/engine";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { buildKnownDeck, type KnownDeckLang } from "../account/ankiExport.js";
import type { WordStore } from "@tsumugu/engine";

/** Build `.apkg` bytes for known + learning words. */
export async function exportAnki(store: WordStore, lang: KnownDeckLang = "zh-Hant"): Promise<Uint8Array> {
  const deck = buildKnownDeck(store, lang);
  if (deck.notes.length === 0) {
    throw new Error("No known or learning words to export.");
  }
  return buildApkg(deck, { locateFile: () => sqlWasmUrl });
}

/** Trigger a browser download of raw bytes. */
export function downloadBytes(bytes: Uint8Array, filename: string, mime = "application/octet-stream"): void {
  const part = new Uint8Array(bytes);
  const blob = new Blob([part.buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}