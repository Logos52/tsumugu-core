import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsSnippet, escapeHtmlAttr, gscMeta, trackEvent } from "./analytics.js";

describe("analyticsSnippet", () => {
  it("returns empty string when no analytics env is set", () => {
    expect(analyticsSnippet({})).toBe("");
  });

  it("prefers ANALYTICS_SNIPPET verbatim when all sources are set", () => {
    const custom = '<script src="https://example.com/a.js"></script>';
    expect(
      analyticsSnippet({
        ANALYTICS_SNIPPET: custom,
        GOATCOUNTER_CODE: "my-site",
        CF_BEACON_TOKEN: "tok",
      }),
    ).toBe(custom);
  });

  it("emits GoatCounter when only GOATCOUNTER_CODE is set", () => {
    const out = analyticsSnippet({ GOATCOUNTER_CODE: "tsumugu" });
    expect(out).toContain("data-goatcounter=");
    expect(out).toContain("tsumugu.goatcounter.com/count");
    expect(out).toContain("//gc.zgo.at/count.js");
  });

  it("emits Cloudflare beacon with HTML-escaped token", () => {
    const out = analyticsSnippet({ CF_BEACON_TOKEN: 'a"b&c' });
    expect(out).toContain("cloudflareinsights.com/beacon.min.js");
    expect(out).toContain('a&quot;b&amp;c');
    expect(out).not.toContain('a"b&c');
  });
});

describe("gscMeta", () => {
  it("returns empty string when GSC_VERIFICATION is unset", () => {
    expect(gscMeta({})).toBe("");
  });

  it("emits verification meta with escaped content", () => {
    expect(gscMeta({ GSC_VERIFICATION: 'tok"1' })).toBe(
      '<meta name="google-site-verification" content="tok&quot;1">',
    );
  });
});

describe("trackEvent", () => {
  afterEach(() => {
    delete (window as unknown as { goatcounter?: unknown }).goatcounter;
  });

  it("fires a cookieless GoatCounter event when the beacon is present", () => {
    const count = vi.fn();
    (window as unknown as { goatcounter: { count: typeof count } }).goatcounter = { count };
    trackEvent("sync-export", { status: "ok" });
    expect(count).toHaveBeenCalledWith({ path: "event/sync-export", title: "sync-export", event: true });
  });

  it("is a safe no-op when GoatCounter is not loaded", () => {
    expect(() => trackEvent("catalog_open")).not.toThrow();
  });
});

describe("escapeHtmlAttr", () => {
  it("escapes attribute-sensitive characters", () => {
    expect(escapeHtmlAttr(`<&"'>`)).toBe("&lt;&amp;&quot;&#39;&gt;");
  });
});