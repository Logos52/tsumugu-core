# WO-CORE-7 — Static hosting + deploy + analytics + PWA (desktop-first)

**For:** Composer (codegen). Drive with Composer's own subscription model — no metered/pay-per-token APIs for tooling.
**Parent contract:** `/Users/n1/Projects/tsumugu-core/docs/PRD-Tsumugu-Core-v1.md` (read §1.3, §4, §8, §10). This WO is row WO-CORE-7 in PRD §10.
**Repo:** the NEW Core repo from WO-CORE-0 (do NOT touch `/Users/n1/Projects/tsumugu` or `/Users/n1/Projects/tsumugu-ed` source). Paths below prefixed `core/` are in the new repo; `engine` = the extracted `@tsumugu/engine` package consumed as a versioned dep.

---

## Goal
Ship the Core reader as a static, CDN-served site: prepared readings fetched over plain GET via the reused `httpVault` read path, an env-gated analytics hook (build stays clean), an installable offline PWA shell, and a single-branch `main`-triggered deploy workflow — desktop-first, domain in config.

## Why / context
PRD §8.3 makes the reader fully client-side and PRD §3.1 serves `prepared.json` over a static CDN GET with NO server store and NO write-back. This WO is the hosting/deploy/PWA seam only; the reader shell (WO-CORE-5) and catalog/importer (WO-CORE-6) render what this serves. Analytics mirrors the proven env-gated pattern in `tsumugu-ed/scripts/render_site.py` (PRD §12.3) so dev/CI builds carry no tracker. Offline works because prepared content pre-resolves every gloss (PRD §8.2 `PREPARED_CONTENT_SCHEMA_V2`) — no lookup at render time.

---

## Exact deliverables

### 1. Static read path — fork `httpVault` to read-only
**File:** `core/apps/web/src/host/httpVault.ts` (port of `/Users/n1/Projects/tsumugu/apps/web/src/host/httpVault.ts`).
- Keep `createHttpVault(base)`, `staticVaultBase()`, `staticVaultAvailable()`, `listVaultReadings()`, `VaultReading`.
- **Remove `writeText`** from the returned `VaultIO` and remove the dev-bridge branch (`DEV_BASE = "/@vault/"`, `devVaultAvailable`, the `__readings` dev path). Core is static-only: read `prepared.json` + `__readings.json` over CDN GET, never PUT/POST. If `VaultIO` type requires `writeText`, implement it as `async () => { throw new Error("Core vault is read-only"); }` and keep it unreachable from chrome.
- `staticVaultBase()` resolves `import.meta.env.BASE_URL + "vault/"` (already does); for a custom domain at root this is `/vault/`. Keep the `__readings.json` discovery contract (`CatalogEntry[]`, see `core/apps/web/src/catalog/types.ts`).
- 404 → `null`, other non-ok → throw (unchanged). No CORS assumption: site and `vault/` are same-origin.

### 2. Site config (domain, base, analytics defaults)
**File (new):** `core/apps/web/src/config/site.ts`
```ts
export const SITE = {
  origin: import.meta.env.VITE_SITE_ORIGIN ?? "https://tsumugu.cc", // PRD §12 default;
  name: "Tsumugu Core",
  // base path: "/" for a custom domain at root; override via VITE_BASE for a sub-path host
} as const;
```
- Read `VITE_SITE_ORIGIN` / `VITE_BASE` from env at build; never hardcode the domain anywhere else (canonical URL, manifest `start_url`, sitemap, OG tags all derive from `SITE.origin`).

### 3. Vite build config — static, root base by default
**File:** `core/apps/web/vite.config.ts` (port of the tsumugu one, **delete the `devVault()` plugin** entirely — that is the personal File-System vault bridge, PRD §8.4 LEAVE BEHIND).
- `base: process.env.VITE_BASE ?? "/"` (custom domain serves at root; the personal `/tsumugu/app/` sub-path goes away).
- Keep: `resolve.alias` jieba-wasm bundler shim, `build.target: "es2022"`, `optimizeDeps.exclude: ["@tsumugu/engine", "jieba-wasm"]`, `assetsInclude: ["**/*.wasm"]`.
- Keep `server.host: "127.0.0.1"`, `port: 5173`, `strictPort: true`.

### 4. Analytics hook — env-gated, injected at build, clean by default
Mirror `tsumugu-ed/scripts/render_site.py:206-222` precedence (ANALYTICS_SNIPPET wins → GoatCounter → Cloudflare beacon; then GSC verification meta). Empty env ⇒ no markup ⇒ dev/CI stays clean.
**File (new):** `core/apps/web/src/build/analytics.ts` (build-time helper) — pure function:
```ts
// All async/defer, cookieless. Reads process.env at build time only.
export function analyticsSnippet(env = process.env): string  // "" when nothing set
export function gscMeta(env = process.env): string            // "" when GSC_VERIFICATION unset
```
- `ANALYTICS_SNIPPET` → returned verbatim.
- `GOATCOUNTER_CODE` → `<script data-goatcounter="https://<code>.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>`.
- `CF_BEACON_TOKEN` → `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"<token>"}'></script>`.
- `GSC_VERIFICATION` → `<meta name="google-site-verification" content="<token>">`.
**Injection:** a small Vite plugin in `core/apps/web/vite.config.ts` (`transformIndexHtml`) injects `analyticsSnippet()` + `gscMeta()` immediately before `</head>` of `index.html`. Escape HTML-attribute values (mirror the `E()` escaping in render_site.py). Do not bundle into JS; it is markup in the HTML shell.

### 5. PWA — manifest + offline shell (installable, desktop-first)
**File (new):** `core/apps/web/public/manifest.webmanifest`
```json
{
  "name": "Tsumugu Core",
  "short_name": "Tsumugu",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#FBFAF7",
  "theme_color": "#FBFAF7",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- `background_color`/`theme_color` = Silk light paper `#FBFAF7` (PRD §4.2 silk token). When `data-theme="dark"` is active, also emit a dark `<meta name="theme-color" media="(prefers-color-scheme: dark)">` matching the dark-palette paper. Violet `#6B4BD6` is RESERVED (brand/bridge/known) — do NOT use it as the PWA theme color (PRD §4.2).
- Icons: generate `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` into `core/apps/web/public/` from the existing brand glyph (`/Users/n1/Projects/tsumugu/apps/web/public/logo-glyph.svg` is the source mark; re-export, do not invent a new logo). If PNG export tooling is unavailable, scaffold the manifest + reference paths and leave a `TODO(icons)` — flag in your summary, do not block.
- **Head wiring** in `core/apps/web/index.html`: `<link rel="manifest" href="/manifest.webmanifest">`, `<meta name="theme-color" content="#FBFAF7">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<link rel="apple-touch-icon" href="/icon-192.png">`, plus canonical + OG tags derived from `SITE.origin`.

**File (new):** `core/apps/web/src/pwa/sw.ts` — service worker, cache-first app shell + stale-while-revalidate readings.
- **Precache (install):** the app shell — `index.html`, the hashed JS/CSS bundle, fonts under `public/fonts/` (Kaiti/LXGW-WenKai + Inter, PRD §4.2), jieba wasm, sql.js wasm. Use a Vite manifest (`build.manifest: true`) or `vite-plugin-pwa` (Workbox) to get the precache list — prefer `vite-plugin-pwa` with `injectManifest` strategy so the precache list is generated, not hand-maintained.
- **Runtime — readings (`/vault/**`, i.e. `prepared.json`, `__readings.json`):** `stale-while-revalidate` — serve cached instantly, refresh in background. Prepared content is self-contained (glosses pre-resolved), so a cached reading is fully usable offline (PRD §8.2).
- **Runtime — analytics + CDN beacons:** `NetworkOnly`, never cache (cookieless trackers must not be served stale).
- **Navigation fallback:** offline navigations fall back to the cached `index.html` (SPA shell).
- **Do NOT cache or attempt to sync** any known-word state — that is localStorage/IndexedDB via `engine` `store/wordStore`, owned by the client, never server data (PRD §4.6, §1.3 no sync).
**File (new):** `core/apps/web/src/pwa/register.ts` — `registerSW()` registered from `main.ts`; on `controllerchange`/new SW, show a quiet "new version — reload" affordance (no forced reload). No-op under `import.meta.env.DEV`.

### 6. Robots + sitemap + canonical (static SEO)
**Files (new):** `core/apps/web/public/robots.txt` (allow all; `Sitemap: <SITE.origin>/sitemap.xml`), and a build step that emits `sitemap.xml` from `__readings.json` (one `<url>` per reading route + catalog + home), `lastmod` from `CatalogEntry.dateAdded`. Generate in the deploy assemble step (step 7), not committed.

### 7. Deploy workflow — single-branch `main`, static artifact
**File (new):** `core/.github/workflows/deploy.yml` (model on `/Users/n1/Projects/tsumugu/.github/workflows/pages.yml`, adapted to root-base + Core repo + the analytics/PWA seam). Single-branch `main` trigger only.
```yaml
name: Deploy Tsumugu Core
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 11.5.1 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r --filter "./packages/*" build   # build @tsumugu/engine etc.
      - run: pnpm --filter @tsumugu/web build
        env:
          VITE_SITE_ORIGIN: ${{ vars.SITE_ORIGIN }}        # repo Variable, default tsumugu.cc
          VITE_BASE: "/"
          ANALYTICS_SNIPPET: ${{ secrets.ANALYTICS_SNIPPET }}
          GOATCOUNTER_CODE: ${{ vars.GOATCOUNTER_CODE }}
          CF_BEACON_TOKEN: ${{ secrets.CF_BEACON_TOKEN }}
          GSC_VERIFICATION: ${{ vars.GSC_VERIFICATION }}
      - run: |
          mkdir -p _site
          cp -r apps/web/dist/. _site/
          # custom domain at root: write CNAME from the configured origin host
          node -e "const o=process.env.VITE_SITE_ORIGIN||'https://tsumugu.cc';require('fs').writeFileSync('_site/CNAME',new URL(o).host)"
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: _site }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
- Analytics env comes from repo Secrets/Variables (set in GitHub, NOT in the repo) — empty by default keeps the build clean.
- `vault/` (the published `prepared.json` + `__readings.json`) is produced by the content pipeline (WO-CORE-4/6) and lands under `apps/web/public/vault/` before this build, OR is copied into `_site/vault/` in the assemble step if it lives outside `public/`. Wire whichever WO-CORE-6 chose; default: it is in `public/vault/` and Vite copies it.

---

## Step-by-step (mechanical)
1. Confirm WO-CORE-0 landed (`@tsumugu/engine` resolves, `core/apps/web` exists with the reader from WO-CORE-5). If not, STOP — this WO is blocked.
2. Port `httpVault.ts` → strip writes + dev bridge (deliverable 1). Port `catalog/types.ts` if WO-CORE-6 hasn't.
3. Add `config/site.ts` (deliverable 2).
4. Port `vite.config.ts`, delete `devVault()`, set root base + analytics inject plugin (deliverables 3, 4).
5. Add `build/analytics.ts` + unit tests (deliverable 4).
6. Add `vite-plugin-pwa` (or hand-rolled SW), `pwa/sw.ts`, `pwa/register.ts`, wire `registerSW()` into `main.ts` (deliverable 5).
7. Add `manifest.webmanifest`, icons, head tags in `index.html` (deliverable 5).
8. Add `robots.txt` + sitemap emit (deliverable 6).
9. Add `deploy.yml` (deliverable 7).
10. Run the acceptance checks below. Commit scoped (NEVER `git add -A`; PRD §6.6). Do NOT push — Wedge pushes.

---

## Acceptance criteria / tests
- **`pnpm --filter @tsumugu/web typecheck` clean** and **`vitest` green** (new tests included).
- **Clean-by-default analytics:** `analyticsSnippet({})` === `""` and `gscMeta({})` === `""`; built `index.html` with no analytics env contains no `cloudflareinsights`/`goatcounter`/`google-site-verification` substring. (vitest + a grep assertion on `dist/index.html`.)
- **Analytics precedence:** unit test — with all four env set, `analyticsSnippet` returns the `ANALYTICS_SNIPPET` verbatim; with only `CF_BEACON_TOKEN`, returns the beacon snippet with the token HTML-escaped.
- **Read-only vault:** `createHttpVault().writeText` is either absent from the type or throws "read-only"; `listVaultReadings()` returns `CatalogEntry[]` from a stubbed `__readings.json` GET; a 404 prepared fetch returns `null`.
- **Anonymous render offline:** with an **empty WordStore** (no localStorage), a prepared reading renders, every word glosses from the prebaked glossary, and no network call is made for glosses (assert via a fetch spy in happy-dom). This proves PWA offline viability.
- **Build is static:** `pnpm --filter @tsumugu/web build` produces `dist/` with `index.html`, hashed assets, `manifest.webmanifest`, `sw.js` (or `service-worker.js`), no server entry. `base "/"` ⇒ asset URLs are root-relative.
- **SW registers + precaches the shell:** in a built-preview smoke (or a unit test of the generated precache manifest), the SW precache list includes `index.html`, the JS/CSS bundle, fonts, jieba + sql.js wasm; `/vault/**` is runtime SWR not precache; analytics origins are NetworkOnly.
- **Manifest valid:** `manifest.webmanifest` parses, `start_url` + `scope` = `/`, `theme_color`/`background_color` = `#FBFAF7` (NOT violet), three icon entries present (or `TODO(icons)` flagged).
- **Deploy workflow lints:** `deploy.yml` parses (e.g. `actionlint` if available), triggers only on `main` push + `workflow_dispatch`, writes `CNAME` from `VITE_SITE_ORIGIN`, passes analytics env through from Secrets/Variables.

---

## Dependencies (must land first)
- **WO-CORE-0** (repo + `@tsumugu/engine` package extraction) — HARD: this WO ports files into the Core repo and imports the engine package.
- **WO-CORE-5** (reader shell + restyle) — the `index.html` shell, `main.ts`, `--tsg-*` tokens/fonts this PWA caches and themes against.
- **WO-CORE-6** (catalog + BYO importer) — defines where `vault/` (`__readings.json` + `prepared.json`) lands; the sitemap reads `__readings.json`. If WO-CORE-6 is not yet merged, scaffold against the `CatalogEntry` contract and a stub `vault/`, and flag the integration point.

## Out of scope / do NOT
- **No accounts, no payments, no server sync, no write-back, no backend** (PRD §1.3, §4.6). The SW caches the app shell + readings only; it NEVER caches or syncs known-word state (that is client-owned localStorage/IndexedDB via `engine` `store/wordStore`).
- **Do NOT fork the `tsumugu` monorepo** (PRD §8.1). Port the named files into the Core repo; depend on `@tsumugu/engine` as a versioned package. Do not edit anything under `/Users/n1/Projects/tsumugu` or `/Users/n1/Projects/tsumugu-ed`.
- **LEAVE BEHIND** (PRD §8.4): `host/fsVault.ts` (File-System-Access grant), the `devVault()` Vite plugin, the whole voice/transcript/synced-video subsystem, `scripts/publish-public-vault.ts` personal-inbox map, Anki export from chrome, the in-app `#/encoding` route + review/encoding views. None of these ship in Core hosting.
- **No analytics in the repo.** Tokens live only in GitHub Secrets/Variables; the default build is tracker-free and cookieless.
- **`tsumugu-ed` is a separate static site** the reader taps OUT to via URL carrying `data-script`/`data-reading`/`data-gloss` (PRD §4.5) — it is NOT hosted by this WO and NOT an in-app route. Do not bundle the dictionary.
- **Composer uses its own subscription model** — no metered/pay-per-token APIs for any tooling here (PRD §10).
- No native wrapper, iOS/Android app, or browser extension (PRD §1.3) — PWA install is the only "app-like" surface in v1.

## Open question for Wedge/Claude (only if it blocks)
- **Domain ORIGIN.** PRD §12 default = `tsumugu.cc` (with `tsumugu.ink` as a 301). The workflow reads it from the `SITE_ORIGIN` repo Variable, so the build is unblocked at the default — **but the GitHub Pages custom-domain + DNS + the `CNAME` host are Wedge's account actions.** Confirm the final apex/subdomain before first production deploy. No code change needed if it stays `tsumugu.cc`.
