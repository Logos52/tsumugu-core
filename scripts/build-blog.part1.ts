import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

import { dirname, join, resolve } from "node:path";

import { fileURLToPath, pathToFileURL } from "node:url";

import { SITE_ORIGIN, bodyToHtml, escapeHtml, parsePostFile, readingMinutes } from "./build-blog.part3.js";

import type { BlogPost } from "./build-blog.part3.js";

import { CHROME_CSS } from "./build-blog.part2.js";

import { OUT_DIR, POSTS_DIR } from "./build-blog.part4.js";

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
