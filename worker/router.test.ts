import { describe, expect, it } from "vitest";
import { legacyRedirectTarget, routeFor } from "./router.js";

describe("federation router", () => {
  it("routes dict prefixes to the ed build", () => {
    expect(routeFor("/c/媽.html")).toBe("ed");
    expect(routeFor("/w/客棧.html")).toBe("ed");
    expect(routeFor("/g/le.html")).toBe("ed");
    expect(routeFor("/browse")).toBe("ed");
    expect(routeFor("/browse/band/A1")).toBe("ed");
    expect(routeFor("/dict-assets/site.css")).toBe("ed");
  });

  it("routes everything else to the core build", () => {
    expect(routeFor("/")).toBe("core");
    expect(routeFor("/index.html")).toBe("core");
    expect(routeFor("/assets/index-abc123.js")).toBe("core");
    expect(routeFor("/vault/__readings.json")).toBe("core");
    expect(routeFor("/dict-search/entries-0.json")).toBe("core");
    // does not over-match: /clean is not a /c dict page
    expect(routeFor("/clean")).toBe("core");
    expect(routeFor("/warmup")).toBe("core");
  });

  it("builds a path-identical 301 target (host only changes)", () => {
    expect(legacyRedirectTarget("https://tsumugu-ed.com/c/媽.html?s=trad&r=hv&g=vi", "tsumugu.cc")).toBe(
      "https://tsumugu.cc/c/%E5%AA%BD.html?s=trad&r=hv&g=vi",
    );
    expect(legacyRedirectTarget("http://tsumugu-ed.com/browse", "tsumugu.cc")).toBe(
      "https://tsumugu.cc/browse",
    );
  });
});
