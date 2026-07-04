/**
 * Minimal client-side router for surfaces.
 * Surfaces: home | library | account | reader | about | privacy | feedback | blog
 * Uses hash for reader (#read=...) and facets; simple path-ish for others via #home, #library etc.
 * Default: home (the static marketing front). Library hub lives at #library.
 * Colophon + Method fold into About (their hashes redirect to #about).
 * `blog` is not an in-SPA surface: `#blog` bounces the browser to the static
 * `/blog/` index (built by scripts/build-blog.ts). The router intercepts it and
 * does a full-page navigation rather than emitting to surface listeners.
 * Library facets continue to use hash fragments (handled by catalog later).
 */

import { applyI18n } from "../i18n/strings.js";

export type Surface =
  | "home"
  | "library"
  | "account"
  | "reader"
  | "about"
  | "privacy"
  | "terms"
  | "feedback"
  | "blog";

/** Absolute path to the static blog index, respecting the Vite `base`. */
export function blogHref(): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  return `${base}/blog/`;
}

export interface Router {
  current: Surface;
  navigate(to: Surface | string): void;
  onChange(fn: (s: Surface, detail?: string) => void): () => void;
  start(): void;
  stop(): void;
}

const SURFACE_HASH: Record<Surface, string> = {
  home: "#home",
  library: "#library",
  account: "#account",
  reader: "#read", // prefix
  about: "#about",
  privacy: "#privacy",
  terms: "#terms",
  feedback: "#feedback",
  blog: "#blog",
};

/** Parse a location hash into a surface (exported for tests). */
export function surfaceFromHash(hash: string): { surface: Surface; detail?: string } {
  if (hash.startsWith("#read=") || hash === "#read") {
    return { surface: "reader", detail: hash };
  }
  if (hash.startsWith("#read")) return { surface: "reader", detail: hash };

  // The root / empty hash is the marketing home; never let the library-facet
  // greedy rule swallow it.
  if (hash === "" || hash === "#" || hash === "#/") return { surface: "home" };

  // Library facets: an explicit #library, or a catalog facet hash (band/topic).
  if (hash.startsWith("#library") || hash.includes("band") || hash.includes("topic")) {
    return { surface: "library", detail: hash };
  }

  const clean = ((hash || "").replace(/^#/, "").split(/[?&]/)[0] || "").toLowerCase();
  switch (clean) {
    case "home":
    case "":
      return { surface: "home" };
    case "library":
      return { surface: "library" };
    case "account":
      return { surface: "account" };
    // Blog is a static section outside the SPA; the router redirects on it.
    case "blog":
      return { surface: "blog" };
    // Colophon + Method fold into About; retired Grammar + Flashcards land there too.
    case "about":
    case "colophon":
    case "method":
    case "grammar":
    case "flashcards":
      return { surface: "about" };
    case "privacy":
      return { surface: "privacy" };
    case "terms":
      return { surface: "terms" };
    case "feedback":
      return { surface: "feedback" };
    default:
      // if looks like a leftover facet hash from catalog, go library
      if (hash.includes("=")) return { surface: "library", detail: hash };
      return { surface: "home" };
  }
}

export function createRouter(): Router {
  let current: Surface = "home";
  const listeners = new Set<(s: Surface, detail?: string) => void>();
  let started = false;

  /** Blog leaves the SPA: bounce to the static index instead of emitting. */
  function redirectIfBlog(surface: Surface): boolean {
    if (surface !== "blog") return false;
    try {
      window.location.assign(blogHref());
    } catch {
      /* navigation not available (e.g. jsdom) — best-effort */
    }
    return true;
  }

  function emit(s: Surface, detail?: string) {
    if (redirectIfBlog(s)) return;
    current = s;
    for (const fn of listeners) fn(s, detail);
  }

  function navigate(to: Surface | string) {
    if (typeof to === "string") {
      if (to.startsWith("#")) {
        if (location.hash !== to) location.hash = to;
        const parsed = surfaceFromHash(to);
        emit(parsed.surface, parsed.detail);
        return;
      }
      // treat bare name
      const h = SURFACE_HASH[to as Surface] || `#${to}`;
      const parsed = surfaceFromHash(h);
      // Keep an existing deep link (e.g. "#read=<path>", "#library=&lq=…") when
      // the current hash already resolves to the target surface; rewriting to
      // the bare prefix would clobber it.
      const cur = surfaceFromHash(location.hash);
      if (cur.surface === parsed.surface) {
        emit(cur.surface, cur.detail);
        return;
      }
      if (location.hash !== h) location.hash = h;
      emit(parsed.surface, parsed.detail);
      return;
    }
    const h = SURFACE_HASH[to] || `#${to}`;
    const cur = surfaceFromHash(location.hash);
    if (cur.surface === to) {
      emit(cur.surface, cur.detail);
      return;
    }
    if (location.hash !== h) location.hash = h;
    emit(to);
  }

  function onHashChange() {
    const parsed = surfaceFromHash(location.hash);
    emit(parsed.surface, parsed.detail);
    applyI18n(); // ensure chrome strings update
  }

  function onChange(fn: (s: Surface, detail?: string) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener("hashchange", onHashChange);
    // bootstrap current from url; owner will call navigate or we emit once
    const parsed = surfaceFromHash(location.hash || "#home");
    if (redirectIfBlog(parsed.surface)) return;
    current = parsed.surface;
  }

  function stop() {
    window.removeEventListener("hashchange", onHashChange);
    listeners.clear();
    started = false;
  }

  return {
    get current() {
      return current;
    },
    navigate,
    onChange,
    start,
    stop,
  };
}

// Utility for library facets preservation (existing)
export function getCurrentHash(): string {
  return location.hash;
}
