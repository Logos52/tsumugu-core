/**
 * Federation routing Worker — CODE NOW, DEPLOY BLOCKED.
 *
 * DO NOT DEPLOY until (all outside this lane):
 *   1. tsumugu-ed lands to main re-rendered with the `/dict-assets/` asset prefix
 *      and `SITE_ORIGIN=tsumugu.cc` canonicals (naive prefix routing collides
 *      otherwise: both builds currently emit `/assets/`).
 *   2. `tsumugu.cc` resolves to the core Pages project.
 *   3. Workers Paid is signed off (accepted 2026-07-02).
 *
 * Behaviour:
 *   - On the primary host: dict prefixes (`/c|/w|/g|/browse*|/dict-assets/*`) →
 *     the tsumugu-ed Pages build; everything else → the core Pages build.
 *   - On the legacy host (`tsumugu-ed.com`): 301 path-identical to `tsumugu.cc`.
 */

import { legacyRedirectTarget, routeFor } from "./router.js";

/** Minimal shapes so this type-checks without @cloudflare/workers-types. */
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  /** Service binding → core Pages build (domain primary). */
  CORE: Fetcher;
  /** Service binding → tsumugu-ed Pages build. */
  ED: Fetcher;
  /** Primary origin host, e.g. `tsumugu.cc`. */
  PRIMARY_HOST: string;
  /** Legacy dictionary host that 301s to the primary, e.g. `tsumugu-ed.com`. */
  LEGACY_HOST: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Legacy ed host → path-identical 301 to the primary origin.
    if (url.hostname === env.LEGACY_HOST || url.hostname === `www.${env.LEGACY_HOST}`) {
      return Response.redirect(legacyRedirectTarget(request.url, env.PRIMARY_HOST), 301);
    }

    // Primary origin: dict prefixes → ed build, everything else → core build.
    return routeFor(url.pathname) === "ed" ? env.ED.fetch(request) : env.CORE.fetch(request);
  },
};
