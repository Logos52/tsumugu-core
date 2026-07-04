/**
 * Emit sitemap.xml + robots.txt into dist/ for the core SPA.
 * Run after `vite build` (see `pnpm build`) — not committed to the repo.
 *
 * Core is a hash-routed SPA (PRD-Site-Federation §"core owns `/`, `#library`,
 * `#read=…`"). `#library` and `#read=<slug>` are fragments of the root document,
 * NOT distinct server responses — a crawler hitting `/catalog` or `/read/<slug>`
 * receives `index.html` regardless of slug. Those are placeholder routes, so the
 * sitemap lists ONLY the live-origin root URL (the one URL that resolves to a
 * distinct, real response). Reading-level sitemap entries require Lane B to add
 * path-based deep-linking (pushState) or prerender first.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

interface CatalogEntry {
  path: string;
  title?: string;
  dateAdded: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const ORIGIN = (process.env.VITE_SITE_ORIGIN ?? "https://tsumugu.cc").replace(/\/$/, "");
const BASE = (process.env.VITE_BASE ?? "/").replace(/\/?$/, "/");
const READINGS_PATH = resolve(ROOT, "app/public/vault/__readings.json");
const OUT_PATH = resolve(ROOT, "dist/sitemap.xml");

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function urlEntry(loc: string, lastmod?: string): string {
  const last = lastmod ? `    <lastmod>${xmlEscape(lastmod)}</lastmod>\n` : "";
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n${last}  </url>\n`;
}

/** Static blog slugs emitted by scripts/build-blog.ts (keep in sync with content/blog/posts/). */
const BLOG_SLUGS = ["rebuilding-dun", "word-first-character-later"];

/**
 * Every published blog slug, read from content/blog/posts/ frontmatter so the
 * sitemap always matches what build-blog.ts emitted (not a hand-kept list).
 * Falls back to BLOG_SLUGS if the posts dir can't be read.
 */
function readBlogSlugs(): string[] {
  try {
    const dir = resolve(ROOT, "content/blog/posts");
    const slugs = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const fm = readFileSync(resolve(dir, f), "utf8").split(/^---$/m)[1] ?? "";
        const m = fm.match(/^slug:\s*(.+?)\s*$/m);
        return m ? m[1].replace(/^["']|["']$/g, "") : f.replace(/\.md$/, "");
      });
    return slugs.length ? [...new Set(slugs)].sort() : BLOG_SLUGS;
  } catch {
    return BLOG_SLUGS;
  }
}

/** Build the sitemap XML: root + static /blog/ paths (hash routes are not URLs). */
export function buildSitemapXml(origin: string, base: string, blogSlugs: string[] = BLOG_SLUGS): string {
  const cleanOrigin = origin.replace(/\/$/, "");
  const cleanBase = base.replace(/\/?$/, "/");
  const urls = [
    urlEntry(`${cleanOrigin}${cleanBase}`),
    urlEntry(`${cleanOrigin}${cleanBase}blog/`),
    ...blogSlugs.map((slug) => urlEntry(`${cleanOrigin}${cleanBase}blog/${slug}/`)),
  ];
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join("") +
    "</urlset>\n"
  );
}

/** Build robots.txt whose Sitemap pointer resolves to the emitted sitemap. */
export function buildRobotsTxt(origin: string, base: string): string {
  const cleanOrigin = origin.replace(/\/$/, "");
  const cleanBase = base.replace(/\/?$/, "/");
  return "User-agent: *\nAllow: /\n\n" + `Sitemap: ${cleanOrigin}${cleanBase}sitemap.xml\n`;
}

function main(): void {
  const slugs = readBlogSlugs();
  const xml = buildSitemapXml(ORIGIN, BASE, slugs);
  writeFileSync(OUT_PATH, xml, "utf8");
  writeFileSync(resolve(ROOT, "dist/robots.txt"), buildRobotsTxt(ORIGIN, BASE), "utf8");
  console.log(`wrote ${OUT_PATH} (1 origin + blog index + ${slugs.length} post url(s))`);
}

/** Morning Conductor script equivalent (Phase2 mechanical, cos PRD-morning-conductor inspired).
 * Local-first chain stub: health scan + digest + (future publish). Callable from node.
 * Usage: import and call morningConductor(catalog)
 */
export async function morningConductor(catalog: CatalogEntry[]): Promise<{
  digest: { date: string; recent: string[]; backlog: number };
  health: { ok: boolean; scanned: number; summary: string };
  ranAt: string;
}> {
  const { libraryHealthScan, generateDailyDigestThinStrip } = await import(
    "../app/src/catalog/coverage.js"
  );
  const digest = generateDailyDigestThinStrip(catalog);
  const health = libraryHealthScan(catalog);
  console.log("[morning-conductor] health:", health.summary, "digest:", digest.date);
  return { digest, health, ranAt: new Date().toISOString() };
}

// Run only as a CLI entry (never on import, so tests can pull the pure builders).
const isCliEntry =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntry) {
  // allow direct: tsx scripts/build-sitemap.ts --conductor
  if (process.argv.includes("--conductor")) {
    const cat = JSON.parse(readFileSync(READINGS_PATH, "utf8")) as CatalogEntry[];
    void morningConductor(cat);
  } else {
    main();
  }
}
