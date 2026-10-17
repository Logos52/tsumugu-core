

import type { VaultIO } from "@tsumugu/engine";
import type { CatalogEntry } from "../catalog/types.js";
import { isCatalogEntry } from "./shapes.js";

const url = (base: string, path: string): string =>
  base + path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");


export function staticVaultBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base + (base.endsWith("/") ? "" : "/") + "vault/";
}


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
      if (isCatalogEntry(entry)) {
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