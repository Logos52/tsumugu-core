# Federation routing Worker — CODE NOW, DEPLOY BLOCKED

One origin (`tsumugu.cc`) over two Pages builds: the core SPA and the tsumugu-ed
dictionary site. This Worker forwards dict URLs to the ed build and everything else
to the core build, and 301s the legacy `tsumugu-ed.com` host path-identically.

## Do NOT deploy until all of these hold

1. **tsumugu-ed lands to main** re-rendered with the `/dict-assets/` asset prefix and
   `SITE_ORIGIN=tsumugu.cc` canonicals (ED-REPO-BLOCKED — see contract below).
2. **`tsumugu.cc` resolves** to the core Pages project (core is the domain primary).
3. **Workers Paid** signed off (accepted 2026-07-02).

## Routing

| Request | Target |
|---------|--------|
| `tsumugu.cc/c/*`, `/w/*`, `/g/*`, `/browse*`, `/dict-assets/*` | ed Pages build (`env.ED`) |
| `tsumugu.cc/*` (everything else) | core Pages build (`env.CORE`) |
| `tsumugu-ed.com/<path>` | 301 → `tsumugu.cc/<path>` (path-identical) |

`DICT_PREFIXES` in `router.ts` is the source of truth for the dict URL set and MUST
stay in sync with the SW navigation denylist (`app/src/pwa/sw.ts` `DICT_NAV_DENYLIST`)
— both denote the same URLs (the SW must not swallow them; the Worker must forward them).

## ED-side prerequisite contract (ED-REPO-BLOCKED — for the ed agent)

The core build's Vite output emits hashed bundles under `/assets/`. tsumugu-ed's
`render_site.py` also emits `/assets/`. Under one origin these collide, so:

1. **Re-render ed assets under a dedicated `/dict-assets/` prefix** (site.css, search.js,
   `assets/search/*` shards, logos, fonts). Every ed page must reference `/dict-assets/…`
   instead of `/assets/…`. This is what makes prefix routing unambiguous.
2. **Rebake canonicals with `SITE_ORIGIN=tsumugu.cc`** (env already exists in
   `render_site.py`) so post-cutover pages don't 301 back to themselves.
3. **Sitemap/robots seam:** decide `robots.txt` ownership and route or merge `/sitemap.xml`.
   Core's sitemap lists only its live-origin root (see `scripts/build-sitemap.ts`).
4. **Param reader + `hv` ruby mode** per `docs/PRD-Dict-Handoff-Axes.md` §2.4.

## Cutover acceptance (documented, run at deploy)

- `tsumugu-ed.com/c/媽.html` 301s to `tsumugu.cc/c/媽.html`.
- The page renders styled (`/dict-assets/site.css` loads) with working search.
- Installed-PWA direct `/c/媽.html` returns the dict page, never the core `index.html`
  (SW `DICT_NAV_DENYLIST`).

## Deploy (only after unblock)

```
cd worker
npx wrangler deploy   # set real Pages service names + routes in wrangler.jsonc first
```
