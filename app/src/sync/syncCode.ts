/**
 * Sync code = `base64url(deflate(UserDoc))` (WO-UNIFY-C C1).
 *
 * A copy/paste transport for the whole UserDoc (~120KB JSON at ~2,500 entries,
 * a few tens of KB after deflate). QR is intentionally CUT from the doc path.
 *
 * Compression uses the platform `CompressionStream("deflate")` when available.
 * A 1-char header records the codec so decode is always symmetric even where
 * `CompressionStream` is missing (the raw-base64url fallback):
 *   "D" = deflate,  "R" = raw (no compression).
 *
 * No network. Pure transform over a UserDoc.
 */

import { type UserDoc, migrateUserDoc } from "../store/userDoc.js";

const HDR_DEFLATE = "D";
const HDR_RAW = "R";

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hasCompression(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

async function streamThrough(bytes: Uint8Array, stream: TransformStream): Promise<Uint8Array> {
  const src = new Blob([bytes as unknown as BlobPart]).stream();
  const piped = src.pipeThrough(stream);
  const buf = await new Response(piped).arrayBuffer();
  return new Uint8Array(buf);
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  return streamThrough(bytes, new CompressionStream("deflate"));
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  return streamThrough(bytes, new DecompressionStream("deflate"));
}

/** Encode a UserDoc to a copy/paste sync code. */
export async function encodeSyncCode(doc: UserDoc): Promise<string> {
  const json = JSON.stringify(doc);
  const raw = new TextEncoder().encode(json);
  if (hasCompression()) {
    const packed = await deflate(raw);
    return HDR_DEFLATE + bytesToBase64url(packed);
  }
  return HDR_RAW + bytesToBase64url(raw);
}

/** Decode a sync code back into a normalized UserDoc (migrated + zero-PII). */
export async function decodeSyncCode(code: string): Promise<UserDoc> {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Empty sync code.");
  const hdr = trimmed[0];
  const body = trimmed.slice(1);
  const bytes = base64urlToBytes(body);
  let jsonBytes: Uint8Array;
  if (hdr === HDR_DEFLATE) {
    if (!hasCompression()) throw new Error("This sync code needs deflate support, unavailable here.");
    jsonBytes = await inflate(bytes);
  } else if (hdr === HDR_RAW) {
    jsonBytes = bytes;
  } else {
    throw new Error("Unrecognized sync code format.");
  }
  const json = new TextDecoder().decode(jsonBytes);
  return migrateUserDoc(JSON.parse(json));
}
