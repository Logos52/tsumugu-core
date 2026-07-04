/**
 * Remote user-doc persistence abstraction.
 * Default: LocalSimRemoteStore (localStorage `tsumugu-sim-server/`).
 * Production sync: FetchRemoteStore when VITE_SYNC_API_URL is set.
 */

import { type UserDoc, migrateUserDoc } from "./userDoc.js";

export interface RemoteStore {
  get(userId: string): Promise<UserDoc | null>;
  put(userId: string, doc: UserDoc): Promise<void>;
  delete(userId: string): Promise<void>;
}

export const SIM_SERVER_PREFIX = "tsumugu-sim-server/";

export class LocalSimRemoteStore implements RemoteStore {
  private key(userId: string): string {
    return SIM_SERVER_PREFIX + userId;
  }

  async get(userId: string): Promise<UserDoc | null> {
    try {
      const raw = localStorage.getItem(this.key(userId));
      if (!raw) return null;
      return JSON.parse(raw) as UserDoc;
    } catch {
      return null;
    }
  }

  async put(userId: string, doc: UserDoc): Promise<void> {
    try {
      localStorage.setItem(this.key(userId), JSON.stringify(doc));
    } catch {
      /* ignore quota errors */
    }
  }

  async delete(userId: string): Promise<void> {
    try {
      localStorage.removeItem(this.key(userId));
    } catch {
      /* ignore */
    }
  }
}

/**
 * Sync Stage 1 — BYO-URL, PULL-ONLY (WO-UNIFY-C C1).
 *
 * The user pastes a URL that serves their exported UserDoc JSON (any static host:
 * a gist raw URL, an R2/S3 object, a personal endpoint). We GET it, normalize it
 * through {@link migrateUserDoc}, and hand it back for the clock-aware merge.
 *
 * Writes stay MANUAL (file export / sync code) — `put`/`delete` are intentional
 * no-ops. This is NOT the deferred Stage-2 Worker+D1 store ({@link FetchRemoteStore}
 * is the untouched Stage-2 seam); do not add push/auth here.
 */
export class UrlRemoteStore implements RemoteStore {
  constructor(private readonly url: string) {}

  async get(_userId: string): Promise<UserDoc | null> {
    if (!this.url) return null;
    const res = await fetch(this.url, { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Sync pull failed: ${res.status}`);
    const raw = (await res.json()) as unknown;
    return migrateUserDoc(raw);
  }

  /** No-op: Stage-1 writes stay manual (export / sync code). */
  async put(): Promise<void> {
    /* pull-only */
  }

  /** No-op: Stage-1 has nothing to delete remotely. */
  async delete(): Promise<void> {
    /* pull-only */
  }
}

export class FetchRemoteStore implements RemoteStore {
  constructor(private readonly baseUrl: string) {}

  private storeUrl(userId: string): string {
    const base = this.baseUrl.replace(/\/$/, "");
    return `${base}/store?userId=${encodeURIComponent(userId)}`;
  }

  async get(userId: string): Promise<UserDoc | null> {
    const res = await fetch(this.storeUrl(userId), { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`RemoteStore GET failed: ${res.status}`);
    return (await res.json()) as UserDoc;
  }

  async put(userId: string, doc: UserDoc): Promise<void> {
    const res = await fetch(this.storeUrl(userId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new Error(`RemoteStore PUT failed: ${res.status}`);
  }

  async delete(userId: string): Promise<void> {
    const res = await fetch(this.storeUrl(userId), { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      throw new Error(`RemoteStore DELETE failed: ${res.status}`);
    }
  }
}

export function createDefaultRemoteStore(): RemoteStore {
  const url = import.meta.env.VITE_SYNC_API_URL;
  if (url) return new FetchRemoteStore(url);
  return new LocalSimRemoteStore();
}