/**
 * Build static blog pages into app/public/blog/ from content/blog/posts/*.md.
 * Run before `vite build` so Pages serves /blog/ alongside the SPA.
 *
 *   tsx scripts/build-blog.ts
 *
 * The pages are a self-contained static build (no app bundle) that wears the
 * SAME 冊 Bound Volume chrome as the SPA: shared sticky header (紡 seal +
 * Tsumugu + Beta pill + Home/Library/Reader/Blog nav + theme toggle), the
 * Verdigris token block (light + dark, plain backgrounds), the fonts (LXGW
 * WenKai TC prose · Noto Serif TC display/titles/obi · Inter chrome), and the
 * shared footer. Post pages set the title in the display serif, the body in a
 * comfortable reading measure, and a muted date · reading-time meta line styled
 * like the 書腰 obi band. The index lists posts as quiet cards.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const POSTS_DIR = resolve(ROOT, "content/blog/posts");
const OUT_DIR = resolve(ROOT, "app/public/blog");
const SITE_ORIGIN = (process.env.VITE_SITE_ORIGIN ?? "https://tsumugu.cc").replace(/\/$/, "");

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  body: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error("blog: missing YAML frontmatter");
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2]!.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[kv[1]!] = val;
  }
  return { meta, body: m[2]!.trim() };
}

export function parsePostFile(contents: string, filename: string): BlogPost {
  const { meta, body } = parseFrontmatter(contents);
  const slug = meta.slug || filename.replace(/\.md$/, "");
  const title = meta.title;
  const date = meta.date;
  const description = meta.description;
  if (!title || !date || !description) {
    throw new Error(`blog: ${filename} requires title, date, description in frontmatter`);
  }
  return { slug, title, date, description, body };
}

/** Drop editor-only tail sections (## Maintenance …) from published HTML. */
export function publishableBody(body: string): string {
  const cut = body.search(/\n## Maintenance\b/);
  return (cut >= 0 ? body.slice(0, cut) : body).trim();
}

/** Rough reading time in whole minutes (≈200 wpm), floored at 1. */
export function readingMinutes(body: string): number {
  const words = publishableBody(body)
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Inline markdown → safe HTML: links, bold, inline code. Escapes first. */
function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`)
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_m, label: string, href: string) =>
        `<a href="${href}" rel="noopener"${href.startsWith("http") ? ' target="_blank"' : ""}>${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, (_m, b: string) => `<strong>${b}</strong>`);
}

/**
 * Block-level markdown → HTML. Handles fenced code blocks, ATX headings,
 * unordered lists, and paragraphs — the subset the posts use. Fences are
 * scanned line-by-line so blank lines inside a code block never split it.
 */
export function bodyToHtml(body: string): string {
  const lines = publishableBody(body).split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${renderInline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      out.push(`<ul>${list.map((li) => `<li>${renderInline(li)}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // raw SVG block (charts): pass through untouched until the closing tag
    if (/^\s*<svg[\s>]/.test(line)) {
      flush();
      const raw: string[] = [line];
      while (i < lines.length && !/<\/svg>\s*$/.test(lines[i]!)) {
        i++;
        if (i < lines.length) raw.push(lines[i]!);
      }
      out.push(raw.join("\n"));
      continue;
    }

    // fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) {
        code.push(lines[i]!);
        i++;
      }
      const lang = fence[1] ? ` data-lang="${escapeHtml(fence[1])}"` : "";
      out.push(`<pre${lang}><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    // blank line = block boundary
    if (line.trim() === "") {
      flush();
      continue;
    }

    // ATX heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      const level = Math.min(h[1]!.length + 1, 6); // demote (# reserved for the post title)
      out.push(`<h${level}>${renderInline(h[2]!.trim())}</h${level}>`);
      continue;
    }

    // GFM pipe table: a | row whose next line is a |---| separator
    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[i + 1]!)
    ) {
      flush();
      const splitRow = (row: string): string[] =>
        row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
      const headCells = splitRow(line);
      i += 2; // skip header + separator
      const bodyRows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) {
        bodyRows.push(splitRow(lines[i]!));
        i++;
      }
      i--; // loop increment will advance past the last consumed row
      const thead = `<thead><tr>${headCells.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${bodyRows
        .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // unordered list item
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      flushPara();
      list.push(li[1]!.trim());
      continue;
    }

    // paragraph line
    flushList();
    para.push(line.trim());
  }

  flush();
  return out.join("\n");
}

/* ═══════════ shared Bound Volume chrome ═══════════ */

/** Verdigris tokens (light + dark) + chrome, lifted from the unified mockups. */
const CHROME_CSS = `
:root{
  color-scheme:light;
  --f-read:"LXGW WenKai TC","Kaiti TC","Songti TC","Noto Serif TC",serif;
  --f-disp:"Noto Serif TC","Songti TC","Kaiti TC",serif;
  --f-ui:"Inter","Be Vietnam Pro",-apple-system,"Segoe UI","PingFang TC","Microsoft JhengHei",sans-serif;
  --bg:#FBFBF9; --surface:#FFFFFF; --ink:#1D1B17; --muted:#6A655A; --faint:#757060;
  --border:#ECEAE4; --line:#F0EEE9;
  --kraft:#CDC9BF;
  --obi-bg:#F5F4F0; --obi-ink:#6A655A;
  --g:#3B8577; --g-text:#38806F; --on-g:#F2FBF9; --g-wash:rgba(59,133,119,.07); --halo:rgba(59,133,119,.11);
  --new:#B26179; --learn:#B08942;
  --shadow:0 1px 2px rgba(29,27,23,.05), 0 8px 26px rgba(29,27,23,.05);
  /* inert — Seal-red predecessor kept for reference, not used:
     --g:#9E3A34; --g-text:#9E3A34; --on-g:#FBF3F1; */
}
[data-theme="dark"]{
  color-scheme:dark;
  --bg:#141613; --surface:#1B1E19; --ink:#E9E7DF; --muted:#A8A294; --faint:#857F6E;
  --border:#2A2D26; --line:#23261F;
  --kraft:#57544B;
  --obi-bg:#20231E; --obi-ink:#A8A294;
  --g:#77C6B3; --g-text:#77C6B3; --on-g:#0B1713; --g-wash:rgba(119,198,179,.10); --halo:rgba(119,198,179,.17);
  --new:#C98BA0; --learn:#C9A25E;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 28px rgba(0,0,0,.35);
}

*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--f-ui);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
:focus-visible{outline:2px solid var(--g);outline-offset:2px;border-radius:4px}
button{font:inherit;color:inherit;background:none;border:none;padding:0;cursor:pointer}
a{color:inherit;text-decoration:none}

/* shared header */
.top{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
.top .in{max-width:1240px;margin:0 auto;padding:10px 24px;display:flex;align-items:center;gap:18px}
.brand{display:flex;align-items:center;gap:10px}
.brand .seal{width:28px;height:28px;border-radius:8px;background:var(--g);color:var(--on-g);font-family:var(--f-read);font-weight:700;font-size:17px;display:grid;place-items:center;box-shadow:0 0 10px var(--halo)}
.brand .word{font-family:var(--f-disp);font-weight:700;font-size:17px;letter-spacing:.01em}
.brand .beta{font-family:var(--f-ui);font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--g-text);background:var(--g-wash);border:1px solid color-mix(in srgb,var(--g) 30%,transparent);border-radius:999px;padding:2px 8px;line-height:1}
.nav{display:flex;gap:2px;margin-left:6px}
.nav a{padding:6px 13px;border-radius:8px;font-size:13.5px;font-weight:500;color:var(--muted);display:flex;align-items:baseline;gap:5px}
.nav a .en{font-size:12px;color:var(--faint)}
.nav a:hover{color:var(--ink);background:var(--line)}
.nav a[aria-current="page"]{color:var(--g-text);background:var(--g-wash)}
.nav a[aria-current="page"] .en{color:var(--g-text)}
.top .grow{flex:1}
.theme{width:32px;height:32px;border:1px solid var(--border);border-radius:8px;font-size:14px;color:var(--muted);display:grid;place-items:center}
.theme:hover{color:var(--ink);border-color:var(--kraft)}

main{max-width:1240px;margin:0 auto;padding:26px 24px 72px}

/* obi band (signature) — reused as the post meta line */
.obi{font-family:var(--f-disp);font-size:12.5px;color:var(--obi-ink);background:var(--obi-bg);border:1px solid var(--border);border-radius:8px;padding:8px 15px;letter-spacing:.01em;display:inline-block}
.obi b{font-weight:600}

/* section head */
.sec-head{display:flex;align-items:baseline;gap:12px;margin:0 0 6px}
.sec-head h1{font-family:var(--f-disp);font-weight:700;font-size:26px;margin:0}
.sec-en{font-size:13px;color:var(--faint)}
.sec-cnt{margin-left:auto;font-size:12.5px;color:var(--muted)}
.lede{margin:0 0 26px;font-size:14px;color:var(--muted);max-width:640px}

/* index: quiet cards */
.postlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px;max-width:760px}
.postlist li{margin:0}
.pcard{display:block;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px;transition:border-color .15s ease}
.pcard:hover{border-color:var(--kraft)}
.pcard .pt{font-family:var(--f-disp);font-weight:700;font-size:19px;line-height:1.3;color:var(--ink);margin:0 0 6px}
.pcard:hover .pt{color:var(--g-text)}
.pcard .pmeta{font-size:12px;color:var(--faint);font-variant-numeric:tabular-nums;margin:0 0 8px}
.pcard .pdesc{font-size:14px;color:var(--muted);line-height:1.55;margin:0}

/* post */
.post{max-width:680px;margin:0 auto}
.post .backlink{display:inline-block;font-size:13px;color:var(--muted);margin:0 0 20px}
.post .backlink:hover{color:var(--g-text)}
.post h1.ptitle{font-family:var(--f-disp);font-weight:700;font-size:clamp(28px,4.5vw,40px);line-height:1.18;letter-spacing:.005em;margin:0 0 14px}
.post .pmeta{margin:0 0 30px}
.prose{font-family:var(--f-read);font-size:18.5px;line-height:1.85;color:var(--ink)}
.prose p{margin:0 0 1.25em}
.prose h2{font-family:var(--f-disp);font-weight:700;font-size:22px;line-height:1.3;margin:1.8em 0 .6em}
.prose h3{font-family:var(--f-disp);font-weight:600;font-size:18px;margin:1.6em 0 .5em}
.prose ul{margin:0 0 1.25em;padding-left:1.3em}
.prose li{margin:0 0 .4em}
.prose a{color:var(--g-text);text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--g) 40%,transparent);text-underline-offset:2px}
.prose a:hover{text-decoration-color:var(--g)}
.prose strong{font-weight:700;color:var(--ink)}
.prose code{font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;font-size:.86em;background:var(--obi-bg);border:1px solid var(--border);border-radius:5px;padding:.05em .35em}
.prose pre{font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;font-size:13px;line-height:1.6;background:var(--obi-bg);border:1px solid var(--border);border-radius:10px;padding:16px 18px;overflow-x:auto;margin:0 0 1.5em}
.prose pre code{background:none;border:none;padding:0;font-size:inherit}
.prose table{width:100%;border-collapse:collapse;font-size:14.5px;line-height:1.55;margin:0 0 1.5em;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.prose th{font-family:var(--f-ui);font-weight:600;font-size:12.5px;letter-spacing:.02em;text-align:left;color:var(--muted);background:var(--obi-bg);border-bottom:1px solid var(--border);padding:9px 13px}
.prose td{border-bottom:1px solid var(--line);padding:9px 13px;vertical-align:top}
.prose tr:last-child td{border-bottom:none}

/* footer */
footer{border-top:1px solid var(--border)}
.ft{max-width:1240px;margin:0 auto;padding:18px 24px 30px;font-family:var(--f-ui);font-size:12px;color:var(--faint);display:flex;gap:6px 18px;flex-wrap:wrap}
.ft .fbrand{color:var(--muted)}

@media (max-width:640px){
  .top .in{padding:8px 14px;gap:10px}
  main{padding:20px 14px 56px}
  .nav a .en{display:none}
  .prose{font-size:17.5px}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important}html{scroll-behavior:auto}}
`.trim();

const FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem("tsu-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

const THEME_SCRIPT = `
(function(){
  var root=document.documentElement, btn=document.getElementById("themeBtn");
  if(!btn) return;
  function sync(){ btn.textContent = root.getAttribute("data-theme")==="dark" ? "\\u2600" : "\\u263e"; }
  sync();
  btn.addEventListener("click",function(){
    var next = root.getAttribute("data-theme")==="dark" ? "light" : "dark";
    root.setAttribute("data-theme",next);
    try{localStorage.setItem("tsu-theme",next);}catch(e){}
    sync();
  });
})();
`.trim();

/** Shared sticky header. `current` marks the active nav item (only Blog here). */
function header(current: "blog"): string {
  const cur = (k: string) => (k === current ? ' aria-current="page"' : "");
  return `<header class="top">
  <div class="in">
    <a class="brand" href="/" aria-label="Tsumugu Beta home">
      <span class="seal">紡</span>
      <span class="word">Tsumugu</span>
      <span class="beta">Beta</span>
    </a>
    <nav class="nav" aria-label="Primary">
      <a href="/#home">Home</a>
      <a href="/#library">課本架 <span class="en">Library</span></a>
      <a href="/#read">讀 <span class="en">Reader</span></a>
      <a href="/blog/"${cur("blog")}>誌 <span class="en">Blog</span></a>
    </nav>
    <span class="grow"></span>
    <button class="theme" id="themeBtn" type="button" aria-label="Light / dark theme">☾</button>
  </div>
</header>`;
}

const FOOTER = `<footer>
  <div class="ft">
    <span class="fbrand">紡 Tsumugu</span>
    <span>Notes on reading and remembering Chinese characters.</span>
    <span>預覽 preview · 原創語料 original corpus · 2026-07</span>
    <span>LXGW WenKai TC · Noto Serif TC · Inter</span>
  </div>
</footer>`;

function pageShell(opts: {
  title: string;
  description: string;
  canonical: string;
  main: string;
}): string {
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>${FOUC_SCRIPT}</script>
  <title>${escapeHtml(opts.title)} · Tsumugu</title>
  <meta name="description" content="${escapeHtml(opts.description)}">
  <link rel="canonical" href="${escapeHtml(opts.canonical)}">
  <link rel="stylesheet" href="/fonts/fonts.css">
  <style>
${CHROME_CSS}
  </style>
</head>
<body>
${header("blog")}
<main>
${opts.main}
</main>
${FOOTER}
<script>
${THEME_SCRIPT}
</script>
</body>
</html>
`;
}

export function renderIndex(posts: BlogPost[]): string {
  const items = [...posts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (p) =>
        `<li><a class="pcard" href="/blog/${escapeHtml(p.slug)}/">` +
        `<h2 class="pt">${escapeHtml(p.title)}</h2>` +
        `<p class="pmeta">${escapeHtml(p.date)}</p>` +
        `<p class="pdesc">${escapeHtml(p.description)}</p>` +
        `</a></li>`,
    )
    .join("\n");
  const main =
    `<div class="sec-head"><h1>誌</h1><span class="sec-en">Blog</span>` +
    `<span class="sec-cnt">${posts.length} post${posts.length === 1 ? "" : "s"}</span></div>` +
    `<p class="lede">Notes on reading and remembering Chinese characters — the method behind the readings.</p>` +
    `<ul class="postlist">${items}</ul>`;
  return pageShell({
    title: "Blog",
    description: "Notes on reading and remembering Chinese characters.",
    canonical: `${SITE_ORIGIN}/blog/`,
    main,
  });
}

export function renderPost(post: BlogPost): string {
  const mins = readingMinutes(post.body);
  const main =
    `<article class="post">` +
    `<a class="backlink" href="/blog/">← 誌 Blog</a>` +
    `<h1 class="ptitle">${escapeHtml(post.title)}</h1>` +
    `<div class="obi pmeta">${escapeHtml(post.date)} · ${mins} min read</div>` +
    `<div class="prose">${bodyToHtml(post.body)}</div>` +
    `</article>`;
  return pageShell({
    title: post.title,
    description: post.description,
    canonical: `${SITE_ORIGIN}/blog/${post.slug}/`,
    main,
  });
}

export function buildBlog(): BlogPost[] {
  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((f) =>
    parsePostFile(readFileSync(join(POSTS_DIR, f), "utf8"), f),
  );

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "index.html"), renderIndex(posts), "utf8");

  for (const post of posts) {
    const dir = join(OUT_DIR, post.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), renderPost(post), "utf8");
  }

  return posts;
}

const isCliEntry =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) {
  const posts = buildBlog();
  console.log(`blog: wrote ${posts.length} post(s) → app/public/blog/`);
}
