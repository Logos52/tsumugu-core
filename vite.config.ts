import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { analyticsSnippet, escapeHtmlAttr, gscMeta } from "./app/src/build/analytics.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ORIGIN = (process.env.VITE_SITE_ORIGIN ?? "https://tsumugu.cc").replace(/\/$/, "");
const BASE = process.env.VITE_BASE ?? "/";

const DICT_SOURCE = resolve(HERE, "../tsumugu-ed/exports/site/assets/search");
const DICT_DEST = resolve(HERE, "app/public/dict-search");


function copyDictSearchIndex(): Plugin {
  return {
    name: "copy-dict-search-index",
    buildStart() {
      if (!existsSync(DICT_SOURCE)) return;
      mkdirSync(DICT_DEST, { recursive: true });
      for (const name of readdirSync(DICT_SOURCE)) {
        if (name.endsWith(".json")) {
          cpSync(resolve(DICT_SOURCE, name), resolve(DICT_DEST, name), { force: true });
        }
      }
    },
  };
}


function sumJsonBytes(dir: string): { bytes: number; files: number } {
  let bytes = 0;
  let files = 0;
  if (!existsSync(dir)) return { bytes, files };
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      const sub = sumJsonBytes(full);
      bytes += sub.bytes;
      files += sub.files;
    } else if (name.endsWith(".json")) {
      bytes += st.size;
      files += 1;
    }
  }
  return { bytes, files };
}

const mib = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(2)}MB`;


function precacheByteReport(): Plugin {
  const DIST = resolve(HERE, "dist");
  return {
    name: "tsumugu-precache-byte-report",
    apply: "build",
    closeBundle() {
      const readings = sumJsonBytes(join(DIST, "vault"));
      const dict = sumJsonBytes(join(DIST, "dict-search"));
      const total = readings.bytes + dict.bytes;
      this.info?.(
        `precache JSON payload: readings ${mib(readings.bytes)} (${readings.files} files) + ` +
          `dict shards ${mib(dict.bytes)} (${dict.files} files) = ${mib(total)} total`,
      );
      
      console.log(
        `[precache] readings=${mib(readings.bytes)}/${readings.files}f ` +
          `dict-shards=${mib(dict.bytes)}/${dict.files}f total=${mib(total)}`,
      );
    },
  };
}

function siteHeadPlugin(): Plugin {
  return {
    name: "tsumugu-site-head",
    transformIndexHtml(html) {
      const base = BASE.endsWith("/") ? BASE : `${BASE}/`;
      const head = [
        `<link rel="manifest" href="${base}manifest.webmanifest">`,
        `<meta name="theme-color" content="#FBFAF7">`,
        `<meta name="theme-color" content="#14130F" media="(prefers-color-scheme: dark)">`,
        `<meta name="apple-mobile-web-app-capable" content="yes">`,
        `<link rel="apple-touch-icon" href="${base}icon-192.png">`,
        `<link rel="canonical" href="${SITE_ORIGIN}${base}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="${escapeHtmlAttr("Tsumugu Beta")}">`,
        `<meta property="og:title" content="${escapeHtmlAttr("Tsumugu Beta")}">`,
        `<meta property="og:url" content="${SITE_ORIGIN}${base}">`,
        `<meta property="og:description" content="${escapeHtmlAttr("Graded Traditional Chinese reader")}">`,
        analyticsSnippet(),
        gscMeta(),
      ]
        .filter(Boolean)
        .join("\n  ");
      return html.replace("</head>", `  ${head}\n</head>`);
    },
  };
}

export default defineConfig({
  root: "app",
  base: BASE,
  resolve: {
    alias: {
      "jieba-wasm": resolve(HERE, "../tsumugu/node_modules/jieba-wasm/pkg/bundler/jieba_rs_wasm.js"),
    },
  },
  plugins: [
    copyDictSearchIndex(),
    siteHeadPlugin(),
    precacheByteReport(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src/pwa",
      filename: "sw.ts",
      injectRegister: false,
      manifest: false,
      devOptions: { enabled: false },
      injectManifest: {
        
        
        
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,wasm,json}"],
        
        
        globIgnores: ["fonts/**"],
        
        
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        rollupFormat: "iife",
      },
    }),
  ],
  build: {
    target: "es2022",
    outDir: "../dist",
    emptyOutDir: true,
    manifest: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
  optimizeDeps: {
    exclude: ["@tsumugu/engine", "@tsumugu/gen-qa", "jieba-wasm"],
  },
  assetsInclude: ["**/*.wasm"],
});