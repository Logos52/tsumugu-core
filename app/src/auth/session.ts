/**
 * Auth session abstraction + login flow (passwordless magic-link simulation for v1 dev).
 * Clean client: later swap the login impl to real POST /auth/* without callers changing.
 *
 * Exposes observable snapshot. Use subscribe.
 * Login does NOT talk network; simulates the round-trip + "confirm".
 */

import { getUserStore, type UserStore } from "../store/userStore.js";
import { trackEvent } from "../build/analytics.js";

export type AuthStatus = "logged-out" | "logging-in" | "logged-in" | "sync-conflict" | "offline";

export interface SessionSnapshot {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  displayName?: string;
}

type SessionListener = (snap: SessionSnapshot) => void;

let _store: UserStore | null = null;
const listeners = new Set<SessionListener>();
let lastSnap: SessionSnapshot = { status: "logged-out", userId: null, email: null };

function getStore(): UserStore {
  if (!_store) _store = getUserStore();
  return _store;
}

function refreshSnap(): SessionSnapshot {
  const u = getStore().getAuth();
  const doc = getStore().getDoc();
  const sync = getStore().getSyncStatus();
  let status: AuthStatus = u.status;
  if (u.status === "logged-in") {
    if (sync === "conflict") status = "sync-conflict";
    else if (sync === "offline") status = "offline";
  }
  const snap: SessionSnapshot = {
    status,
    userId: u.userId,
    email: u.email,
    displayName: doc?.profile?.displayName,
  };
  lastSnap = snap;
  return snap;
}

export function getSession(): SessionSnapshot {
  return { ...lastSnap };
}

export function subscribeSession(fn: SessionListener): () => void {
  listeners.add(fn);
  // emit current immediately
  fn({ ...lastSnap });
  return () => listeners.delete(fn);
}

function emit(): void {
  const s = refreshSnap();
  for (const fn of listeners) {
    try { fn({ ...s }); } catch (e) { console.error(e); }
  }
}

// Wire into UserStore events so session always fresh for nav/chrome consumers
getStore().subscribe((ev) => {
  if (ev === "doc" || ev === "sync") emit();
});

// Seed snapshot from UserStore (constructor may async-restore `tsumugu-session` shortly after)
refreshSnap();

/**
 * Direct login (dev / tests). The simulated magic-link UI path is REMOVED
 * (WO-UNIFY-C C1) — this is the only login entry point now, and it never talks
 * to the network. It drives the same clock-aware merge as any future real auth.
 */
export async function devForceLogin(email: string): Promise<void> {
  const store = getStore();
  const userId = `u_${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  await store.login(userId, email);
  emit();
}

// --- Compatibility shims for main integration ---

/**
 * No-op: session restore is delegated to UserStore constructor, which reads `tsumugu-session`.
 */
export function restoreSession(): null {
  return null;
}

export function isLoggedIn(): boolean {
  const snap = refreshSnap();
  if (snap.status === "logged-in") return true;
  try {
    const raw = localStorage.getItem("tsumugu-session");
    if (!raw) return false;
    const sess = JSON.parse(raw) as { userId?: string; email?: string };
    return !!(sess?.userId && sess?.email);
  } catch {
    return false;
  }
}

export function logout(): void {
  const store = getStore();
  store.logout();
  trackEvent("logout", {});
  emit();
}

/** Expose raw userStore for account view (import/export/dev tools). */
export function getUserStoreForAccount(): UserStore {
  return getStore();
}

/** Test helper: reset cached store reference after singleton reset. */
export function resetSessionForTest(): void {
  _store = null;
  lastSnap = { status: "logged-out", userId: null, email: null };
  refreshSnap();
}
