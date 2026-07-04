// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { blogHref, createRouter, surfaceFromHash } from "./router.js";

describe("surfaceFromHash", () => {
  it("maps the marketing home at root/empty hashes", () => {
    expect(surfaceFromHash("#home").surface).toBe("home");
    expect(surfaceFromHash("#").surface).toBe("home");
    expect(surfaceFromHash("#/").surface).toBe("home");
    expect(surfaceFromHash("").surface).toBe("home");
  });

  it("maps library hashes (explicit + facet)", () => {
    expect(surfaceFromHash("#library").surface).toBe("library");
    expect(surfaceFromHash("#library?band=80").surface).toBe("library");
    expect(surfaceFromHash("#band=80").surface).toBe("library");
    expect(surfaceFromHash("#topics").surface).toBe("library");
  });

  it("maps static footer pages", () => {
    expect(surfaceFromHash("#about").surface).toBe("about");
    expect(surfaceFromHash("#privacy").surface).toBe("privacy");
    expect(surfaceFromHash("#feedback").surface).toBe("feedback");
  });

  it("maps the blog hash (static section redirected out of the SPA)", () => {
    expect(surfaceFromHash("#blog").surface).toBe("blog");
  });

  it("resolves the static blog index path (trailing-slashed, base-aware)", () => {
    expect(blogHref()).toBe("/blog/");
  });

  it("folds colophon + method into about", () => {
    expect(surfaceFromHash("#colophon").surface).toBe("about");
    expect(surfaceFromHash("#method").surface).toBe("about");
  });

  it("routes retired grammar/flashcards hashes to about (no crash)", () => {
    expect(surfaceFromHash("#grammar").surface).toBe("about");
    expect(surfaceFromHash("#flashcards").surface).toBe("about");
  });

  it("maps reader hashes with detail", () => {
    const parsed = surfaceFromHash("#read=fixtures/sample.prepared.json");
    expect(parsed.surface).toBe("reader");
    expect(parsed.detail).toContain("read");
  });
});

describe("navigate (deep-link preservation)", () => {
  beforeEach(() => {
    location.hash = "";
  });

  it("keeps an existing '#read=<path>' deep link when navigating to reader", () => {
    location.hash = "#read=readings%2Fzh-Hant%2Fsample.prepared.json";
    const router = createRouter();
    router.navigate("reader");
    expect(location.hash).toBe("#read=readings%2Fzh-Hant%2Fsample.prepared.json");
    expect(router.current).toBe("reader");
  });

  it("keeps library filter state when navigating to library", () => {
    location.hash = "#library=&lt=food&lq=abc";
    const router = createRouter();
    router.navigate("library");
    expect(location.hash).toBe("#library=&lt=food&lq=abc");
    expect(router.current).toBe("library");
  });

  it("still rewrites the hash when the surface actually changes", () => {
    location.hash = "#home";
    const router = createRouter();
    router.navigate("library");
    expect(location.hash).toBe("#library");
    expect(router.current).toBe("library");
  });
});
