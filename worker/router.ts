/**
 * Pure routing decision for the federation Worker (worker/index.ts).
 * Kept side-effect-free so it can be unit-tested without a Cloudflare runtime.
 *
 * Federation shape (PRD-Site-Federation §"one origin, tsumugu.cc"):
 * - Core Pages build is the domain primary and owns `/`, `#library`, `#read=…`,
 *   and the app routes (all served from `/`).
 * - tsumugu-ed keeps its URL shapes `/c/`, `/w/`, `/g/`, `/browse*`, and its assets
 *   under a DEDICATED `/dict-assets/` prefix — the Worker forwards those to the ed
 *   Pages build so all indexed pages migrate with zero URL churn.
 * - `tsumugu-ed.com/<path>` 301s path-identically to `tsumugu.cc/<path>`.
 *
 * KEEP `DICT_PREFIXES` in sync with the SW navigation denylist
 * (`app/src/pwa/sw.ts` DICT_NAV_DENYLIST) — they must denote the same URL set.
 */

/** Dict URL prefixes routed to the tsumugu-ed Pages build. */
export const DICT_PREFIXES: readonly RegExp[] = [
  /^\/c(\/|$)/, // char pages   /c/媽.html
  /^\/w(\/|$)/, // word pages   /w/客棧.html
  /^\/g(\/|$)/, // grammar      /g/le.html
  /^\/browse(\/|$|\?)/, // ed browse index + facets
  /^\/dict-assets\//, // ed re-rendered assets (dedicated prefix; avoids /assets/ collision)
];

export type RouteTarget = "ed" | "core";

/** Which Pages build serves this pathname on the primary origin. */
export function routeFor(pathname: string): RouteTarget {
  return DICT_PREFIXES.some((re) => re.test(pathname)) ? "ed" : "core";
}

/**
 * Path-identical 301 target for a legacy `tsumugu-ed.com` URL.
 * Preserves path + query + hash; only the host (and scheme) change.
 */
export function legacyRedirectTarget(
  requestUrl: string,
  primaryHost: string,
): string {
  const dest = new URL(requestUrl);
  dest.protocol = "https:";
  dest.hostname = primaryHost;
  dest.port = "";
  return dest.toString();
}
