
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkOnly, StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};


const BASE = import.meta.env.BASE_URL || "/";

const underBase = (path: string): string =>
  `${BASE.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();


const DICT_NAV_DENYLIST: RegExp[] = [
  /^\/c(\/|$)/, 
  /^\/w(\/|$)/, 
  /^\/g(\/|$)/, 
  /^\/browse(\/|$|\?)/, 
  /^\/dict-assets\//, 
];


registerRoute(
  ({ url }) => url.pathname.startsWith(underBase("vault/")),
  new StaleWhileRevalidate({ cacheName: "vault-readings" }),
);


registerRoute(
  ({ url }) => url.pathname.startsWith(underBase("dict-search/")),
  new StaleWhileRevalidate({ cacheName: "dict-search" }),
);


registerRoute(
  ({ url }) =>
    url.hostname.endsWith("goatcounter.com") ||
    url.hostname === "gc.zgo.at" ||
    url.hostname === "static.cloudflareinsights.com",
  new NetworkOnly(),
);


const navHandler = createHandlerBoundToURL(`${BASE}index.html`);
registerRoute(new NavigationRoute(navHandler, { denylist: DICT_NAV_DENYLIST }));


self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});



