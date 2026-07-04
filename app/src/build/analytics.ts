/** HTML-attribute escape (mirrors `html.escape` in tsumugu-ed `render_site.py`). */
export function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

type Env = Record<string, string | undefined>;

/**
 * Env-gated analytics snippet injected at build time.
 * Precedence: ANALYTICS_SNIPPET → GoatCounter → Cloudflare beacon.
 * Empty env ⇒ "" (dev/CI stays clean).
 */
export function analyticsSnippet(env: Env = process.env): string {
  const raw = env.ANALYTICS_SNIPPET?.trim();
  if (raw) return raw;

  const gc = env.GOATCOUNTER_CODE?.trim();
  if (gc) {
    return (
      `<script data-goatcounter="https://${escapeHtmlAttr(gc)}.goatcounter.com/count" ` +
      `async src="//gc.zgo.at/count.js"></script>`
    );
  }

  const cf = env.CF_BEACON_TOKEN?.trim();
  if (cf) {
    return (
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" ` +
      `data-cf-beacon='{"token":"${escapeHtmlAttr(cf)}"}'></script>`
    );
  }

  return "";
}

/** Google Search Console verification meta — empty when unset. */
export function gscMeta(env: Env = process.env): string {
  const token = env.GSC_VERIFICATION?.trim();
  if (!token) return "";
  return `<meta name="google-site-verification" content="${escapeHtmlAttr(token)}">`;
}

/** GoatCounter's injected global (present only when the snippet loaded). */
interface GoatCounter {
  count(vars: { path: string; title?: string; event?: boolean }): void;
}

/** Ops: metrics instrumentation hooks (login/sync/health/catalog taps etc).
 *
 * Fires a cookieless GoatCounter event when the beacon is present (the snippet is
 * injected by `analyticsSnippet` only when `GOATCOUNTER_CODE` is set), so these
 * calls are real in prod and a no-op locally/in CI. Signature is stable — callers
 * (state/main/auth/sync kill-gate counters) pass an event name (+ optional data).
 */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __TSG_DEBUG?: boolean; goatcounter?: GoatCounter };
  if (w.__TSG_DEBUG) {
    console.info("[metrics]", name, data);
  }
  // Real event beacon when GoatCounter is loaded (event=true keeps it out of pageviews).
  w.goatcounter?.count({ path: `event/${name}`, title: name, event: true });
}