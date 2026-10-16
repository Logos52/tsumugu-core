
export function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

type Env = Record<string, string | undefined>;


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


export function gscMeta(env: Env = process.env): string {
  const token = env.GSC_VERIFICATION?.trim();
  if (!token) return "";
  return `<meta name="google-site-verification" content="${escapeHtmlAttr(token)}">`;
}


interface GoatCounter {
  count(vars: { path: string; title?: string; event?: boolean }): void;
}


export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __TSG_DEBUG?: boolean; goatcounter?: GoatCounter };
  if (w.__TSG_DEBUG) {
    console.info("[metrics]", name, data);
  }
  
  w.goatcounter?.count({ path: `event/${name}`, title: name, event: true });
}