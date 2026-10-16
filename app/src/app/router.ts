

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
  reader: "#read", 
  about: "#about",
  privacy: "#privacy",
  terms: "#terms",
  feedback: "#feedback",
  blog: "#blog",
};


export function surfaceFromHash(hash: string): { surface: Surface; detail?: string } {
  if (hash.startsWith("#read=") || hash === "#read") {
    return { surface: "reader", detail: hash };
  }
  if (hash.startsWith("#read")) return { surface: "reader", detail: hash };

  
  
  if (hash === "" || hash === "#" || hash === "#/") return { surface: "home" };

  
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
    
    case "blog":
      return { surface: "blog" };
    
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
      
      if (hash.includes("=")) return { surface: "library", detail: hash };
      return { surface: "home" };
  }
}

export function createRouter(): Router {
  let current: Surface = "home";
  const listeners = new Set<(s: Surface, detail?: string) => void>();
  let started = false;

  
  function redirectIfBlog(surface: Surface): boolean {
    if (surface !== "blog") return false;
    try {
      window.location.assign(blogHref());
    } catch {
      
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
      
      const h = SURFACE_HASH[to as Surface] || `#${to}`;
      const parsed = surfaceFromHash(h);
      
      
      
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
    applyI18n(); 
  }

  function onChange(fn: (s: Surface, detail?: string) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener("hashchange", onHashChange);
    
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


export function getCurrentHash(): string {
  return location.hash;
}
