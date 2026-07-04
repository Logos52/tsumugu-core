/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkOnly, StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

/** Base the app is served under (respects Vite `base`, e.g. `/tsumugu/app/`). */
const BASE = import.meta.env.BASE_URL || "/";
/** Join `BASE` with a base-relative path, collapsing the slash seam. */
const underBase = (path: string): string =>
  `${BASE.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/**
 * Federated dictionary (tsumugu-ed) URLs served by the routing Worker from the ed
 * Pages build. These live at the ORIGIN ROOT (not under the core `BASE`) and must
 * NEVER be handled by the SPA navigation fallback below — otherwise an installed
 * PWA would serve `index.html` for `/c/媽.html`. Keep this list in sync with the
 * Worker route table (worker/index.ts DICT_PREFIXES). `ED_ROOT_PAGES` (ed's own
 * top-level pages, e.g. `/browse`) is finalized when tsumugu-ed lands (ED-REPO-BLOCKED).
 */
const DICT_NAV_DENYLIST: RegExp[] = [
  /^\/c(\/|$)/, // char pages   /c/媽.html
  /^\/w(\/|$)/, // word pages   /w/客棧.html
  /^\/g(\/|$)/, // grammar      /g/le.html
  /^\/browse(\/|$|\?)/, // ed browse index + facets
  /^\/dict-assets\//, // ed re-rendered assets (dedicated prefix, avoids /assets/ collision)
];

/** Prepared readings + catalog manifest — instant cache, background refresh. */
registerRoute(
  ({ url }) => url.pathname.startsWith(underBase("vault/")),
  new StaleWhileRevalidate({ cacheName: "vault-readings" }),
);

/**
 * Bundled dict search shards. Precached via workbox `globPatterns` (json) so they
 * resolve offline after install; this runtime route keeps them fresh for anything
 * not in the precache manifest. Base-relative so it works under a non-root base.
 */
registerRoute(
  ({ url }) => url.pathname.startsWith(underBase("dict-search/")),
  new StaleWhileRevalidate({ cacheName: "dict-search" }),
);

/** Analytics beacons — never cache (cookieless, must be fresh). */
registerRoute(
  ({ url }) =>
    url.hostname.endsWith("goatcounter.com") ||
    url.hostname === "gc.zgo.at" ||
    url.hostname === "static.cloudflareinsights.com",
  new NetworkOnly(),
);

/**
 * SPA shell — offline navigations fall back to cached index.html, EXCEPT federated
 * dict URLs (DICT_NAV_DENYLIST), which pass through to the network/Worker so the
 * installed PWA never swallows `/c/媽.html` with the core shell.
 */
const navHandler = createHandlerBoundToURL(`${BASE}index.html`);
registerRoute(new NavigationRoute(navHandler, { denylist: DICT_NAV_DENYLIST }));

/** Ensure installable + full offline shell + vault readings (SWR for freshness). */
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// PWA full: precache shell + vault JSON + dict shards done by workbox (globPatterns
// includes json); updates handled in register.ts (quiet banner).
