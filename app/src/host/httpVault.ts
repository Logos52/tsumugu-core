/**
 * HTTP-backed vault: read-only static publish (`/vault/`).
 */

import type { VaultIO } from "@tsumugu/engine";
import type { CatalogEntry } from "../catalog/types.js";

const url = (base: string, path: string): string =>
  base + path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");

/** Published static vault root (respects Vite `base`, e.g. `/tsumugu/app/vault/`). */
export function staticVaultBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base + (base.endsWith("/") ? "" : "/") + "vault/";
}

/** A read-only VaultIO backed by HTTP fetch (static publish). */
export function createHttpVault(base = staticVaultBase()): VaultIO {
  return {
    async readText(path: string): Promise<string | null> {
      const r = await fetch(url(base, path));
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`vault read ${path}: ${r.status}`);
      return r.text();
    },
    async readBytes(path: string): Promise<Uint8Array | null> {
      const r = await fetch(url(base, path));
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`vault read ${path}: ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
    async writeText(): Promise<void> {
      throw new Error("httpVault is read-only");
    },
  };
}

/**
 * A catalog entry is only usable if it carries the facet fields the library UI
 * indexes on. A thin/partial manifest (e.g. a hand-stubbed `__readings.json` with
 * only `path`) must NOT masquerade as a live catalog — the caller (main.ts) falls
 * back to the bundled fixture set when this yields **zero valid entries**.
 */
function isValidCatalogEntry(entry: unknown): entry is CatalogEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.band === "string" &&
    typeof e.kind === "string" &&
    typeof e.wordCounts === "object" &&
    e.wordCounts !== null
  );
}

/**
 * List prepared readings from static `__readings.json`.
 *
 * Runtime validity guard: each entry must have `band` + `kind` + `wordCounts`;
 * invalid entries are skipped with a `console.warn`. Returns only valid entries,
 * so a thin manifest yields `[]` and lets the caller trigger the fixture fallback
 * on **validity** (zero valid entries) rather than raw manifest length.
 */
export async function listVaultReadings(vaultBase = staticVaultBase()): Promise<CatalogEntry[]> {
  try {
    const r = await fetch(url(vaultBase, "__readings.json"));
    if (!r.ok) return [];
    const raw = (await r.json()) as unknown;
    if (!Array.isArray(raw)) {
      console.warn("[vault] __readings.json is not an array; ignoring");
      return [];
    }
    const valid: CatalogEntry[] = [];
    for (const entry of raw) {
      if (isValidCatalogEntry(entry)) {
        valid.push(entry);
      } else {
        const path =
          typeof entry === "object" && entry !== null
            ? String((entry as Record<string, unknown>).path ?? "?")
            : "?";
        console.warn(`[vault] skipping invalid catalog entry (missing band/kind/wordCounts): ${path}`);
      }
    }
    return valid;
  } catch {
    return [];
  }
}