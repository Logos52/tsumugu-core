import { describe, expect, it } from "vitest";
import { SITE } from "./site.js";

describe("SITE config", () => {
  it("exposes branding and a valid HTTPS origin", () => {
    expect(SITE.name).toBe("Tsumugu Beta");
    expect(SITE.origin).toMatch(/^https:\/\/.+/);
  });

  it("defaults origin to tsumugu.cc when VITE_SITE_ORIGIN is unset", () => {
    expect(SITE.origin).toBe("https://tsumugu.cc");
  });

  it("defaults dictOrigin to the live tsumugu-ed origin when VITE_DICT_ORIGIN is unset", () => {
    expect(SITE.dictOrigin).toBe("https://tsumugu-ed.com");
    expect(SITE.dictOrigin).toMatch(/^https:\/\/.+/);
  });
});