import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildRobotsTxt, buildSitemapXml } from "./build-sitemap.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DIST = resolve(ROOT, "dist");

describe("build-sitemap (pure builders)", () => {
  it("lists the live-origin root URL", () => {
    const xml = buildSitemapXml("https://tsumugu.cc", "/");
    expect(xml).toContain("<loc>https://tsumugu.cc/</loc>");
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("</urlset>");
  });

  it("emits ONLY real URLs — root + static /blog/ paths, no /catalog or /read placeholder routes", () => {
    // Explicit blog slugs make the count deterministic regardless of how many
    // posts content/blog/posts holds. Real, distinct responses only: the origin
    // root, the static blog index, and one path per built post. Hash routes
    // (#library, #read=…) are fragments of index.html, never their own URLs.
    const xml = buildSitemapXml("https://tsumugu.cc", "/", ["rebuilding-dun", "word-first-character-later"]);
    expect(xml).not.toContain("/catalog");
    expect(xml).not.toContain("/read");
    expect(xml).toContain("<loc>https://tsumugu.cc/blog/</loc>");
    expect(xml.match(/<url>/g)?.length).toBe(4); // root + /blog/ + 2 posts
  });

  it("respects a non-root base for both sitemap and robots", () => {
    expect(buildSitemapXml("https://tsumugu.cc", "/sub")).toContain(
      "<loc>https://tsumugu.cc/sub/</loc>",
    );
    expect(buildRobotsTxt("https://tsumugu.cc", "/sub")).toContain(
      "Sitemap: https://tsumugu.cc/sub/sitemap.xml",
    );
  });

  it("robots.txt Sitemap pointer resolves to the emitted sitemap", () => {
    const robots = buildRobotsTxt("https://tsumugu.cc", "/");
    expect(robots).toContain("Sitemap: https://tsumugu.cc/sitemap.xml");
    expect(robots).toContain("User-agent: *");
  });
});

describe("build-sitemap (CLI writes dist artifacts)", () => {
  let madeDist = false;

  beforeAll(() => {
    if (!existsSync(DIST)) {
      mkdirSync(DIST, { recursive: true });
      madeDist = true;
    }
    execSync("node --experimental-strip-types scripts/build-sitemap.ts", {
      cwd: ROOT,
      env: { ...process.env, VITE_SITE_ORIGIN: "https://tsumugu.cc" },
    });
  });

  afterAll(() => {
    if (madeDist) rmSync(DIST, { recursive: true, force: true });
  });

  it("/sitemap.xml resolves and lists only the real root URL", () => {
    const xml = readFileSync(resolve(DIST, "sitemap.xml"), "utf8");
    expect(xml).toContain("https://tsumugu.cc/");
    expect(xml).not.toContain("/catalog");
    expect(xml).not.toContain("/read/");
  });

  it("writes a robots.txt pointing at the resolvable sitemap", () => {
    const robots = readFileSync(resolve(DIST, "robots.txt"), "utf8");
    expect(robots).toContain("Sitemap: https://tsumugu.cc/sitemap.xml");
  });
});
