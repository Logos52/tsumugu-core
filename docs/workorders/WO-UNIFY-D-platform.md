# WO-UNIFY-D — Platform (federation origin, routing Worker, service worker, dict/build seams)

**Repo:** `/Users/n1/Projects/tsumugu-core` · **App source:** `app/src` · **Package manager:** pnpm@11.5.1
**You are one of four parallel implementation agents.** You will NOT see the PRDs — this brief is complete and self-contained. Do only your lane's work.

---

## 0. Your mission in one paragraph

Own the platform seams that let `tsumugu.cc` become one origin over two builds (the core SPA + the separate dictionary site): make the dictionary origin env-driven (killing the hardcoded dead deep-link), write the axis-param contract, fix the service-worker navigation fallback so dict URLs never get swallowed by the SPA, fix precache to include vault JSON + base-relative dict shards, add the sitemap/robots fixes, build the routing Worker (code now, deploy blocked on other lanes), add the dict-shard freshness gate, and clean up the gen→publisher seam + build-time byte measurement. You own `pwa/`, `vite.config.ts`, `dict/`, `build/`, `host/httpVault.ts`, `config/site.ts`, `import/`, and `scripts/`. You do not touch styling (Lane A), shell/router/i18n (Lane B), or store/sync (Lane C).

---

## 1. Hard rules

- **Strict file ownership.** Edit ONLY §2 files. Seams → PR notes.
- **Forbidden paths for ALL lanes:** `scripts/companion/`, `out/companion/`, `docs/companion/`, `mockups/`, `app/public/vault/`. You may READ `mockups/site/_shell.html` for Task D11 (shell-contract source) but never write under `mockups/`. The **content pipeline** (the drafts→prepared converter, `reading_checks`, and the manifest emitter that writes `app/public/vault/__readings.json`) is a SEPARATE workflow — not this WO. Your gen-seam tasks (D9/D10) touch only `scripts/gen/*` + `pipeline/*` code, never `app/public/vault/`.
- **Cross-repo dependency awareness.** `vite.config.ts` aliases jieba-wasm to `../tsumugu/node_modules/...` (ln 69) and copies dict-search from `../tsumugu-ed/exports/...` (ln 12, silently skipped if absent). The sibling repos are `~/Projects/tsumugu` (public engine) and `~/Projects/tsumugu-ed` (dictionary). **You do not commit in those repos** — the ed-side render changes (asset prefix, param reader, hv ruby, SEO rebake, shell injection) are a DIFFERENT (ED-REPO-BLOCKED) work item; write your core-side code so it's ready for them, and document the ed-side requirements in PR notes.
- **The Worker is CODE-NOW, DEPLOY-BLOCKED.** Build the routing Worker + SW denylist, but they DEPLOY only after: tsumugu-ed lands to main, `tsumugu.cc` resolves, and Wedge signs off on Workers Paid (all WEDGE-ONLY / other-lane items). Do not attempt to deploy.
- **Lint gate:** `npx eslint app` exit 0 (root `pnpm lint` shows unrelated mockups/workflows errors). Plus `pnpm typecheck` + named tests + `pnpm build` green.

---

## 2. Files you OWN

```
app/src/pwa/sw.ts, pwa/register.ts
app/src/build/analytics.ts + analytics.test.ts   (also imported by vite.config.ts:6)
app/src/dict/dictLink.ts + dictLink.test.ts, dictResolve.ts + dictResolve.test.ts
app/src/import/copy.ts, importPanel.ts + importPanel.test.ts, noNetwork.test.ts,
  prepareFromText.ts + prepareFromText.test.ts
app/src/host/httpVault.ts + httpVault.test.ts
app/src/config/site.ts + site.test.ts
app/public/robots.txt
vite.config.ts, vitest.config.ts (root)
scripts/build-sitemap.ts + .test.ts
scripts/gen/cli.ts, scripts/gen/reading-pipeline.ts + test, scripts/gen/lib/dualRail.ts
scripts/accc/{reconcile-grammar-index,resolve-lesson-target,validate-grammar-index,eval-g2pw-polyphones}.ts + tests
pipeline/publish-readings.ts, pipeline/lib/catalogEnrich.ts
docs/PRD-Dict-Handoff-Axes.md   (write the axis-param contract here)
app/src/engine.test.ts (advisory guard)
```
You may CREATE: a new `worker/` directory (routing Worker), `scripts/dict-sync.ts` (freshness copy), and a `docs/handoffs/README.md` gen-seam doc.

---

## 3. Shared seams — what you expose, what you may assume

### 3a. `dict/dictLink.ts` + `dictResolve.ts` — you own; A & B consume read-only
`hover/wordPopup.ts:11-12` (Lane B) and `catalog/catalogView.ts:17-18` (Lane A) import your dict linkers. Keep the exported function signatures stable while you swap the origin to be env-driven and add axis params. If you must change a signature, announce it — A's dict-hits search and B's popup both depend on it.

### 3b. `config/site.ts` — origin/branding; currently ZERO runtime importers
`VITE_SITE_ORIGIN` is duplicated in `vite.config.ts:9` and `scripts/build-sitemap.ts:18`. `config/site.ts` defaults to `tsumugu.cc` (site.test.ts pins HTTPS + tsumugu.cc default). You're adding `VITE_DICT_ORIGIN` here (Task D1). Wire `dictLink.ts` to read it through `config/site.ts` so there's one source of truth.

### 3c. `host/httpVault.ts` — the vault fetch layer; `main.ts` consumes
`main.ts` (Lane B) calls your `listVaultReadings`. **Task D3** adds a runtime validity guard here. `main.ts:98-101` (Lane B) is the fixture-fallback decision (currently triggers on manifest-empty OR every-entry-lacks-band). Your guard makes `listVaultReadings` require `band` + `kind` + `wordCounts` per entry (skip + `console.warn` invalid ones). Coordinate with Lane B: the fixture fallback should then trigger on **validity** (zero valid entries), not raw length. You own the httpVault guard; flag the `main.ts:88`/`main.ts:98-101` trigger change for Lane B in PR notes (they own main.ts). Lane A owns the demo-mode banner UI.

### 3d. `build/analytics.ts` `trackEvent` — you own; B & C consume
`state.ts:10`, `main.ts:27`, `shell/home.ts:18` (Lane B, being deleted), `auth/session.ts:10` (Lane C), and `vite.config.ts:6` use it. Lane C's Sync panel calls `trackEvent("sync-export"/"sync-import")` for kill-gate counters — keep `trackEvent` accepting an event name. Don't change its signature without telling C. Fix the `trackEvent` GoatCounter orphan-call issue (item 58) if it's a no-op today.

### 3e. `config/features.ts` (Lane C owns) — you read `FEATURES` read-only
`main.ts` (Lane B) gates on it; you generally don't. If your precache policy needs a flag, request it from Lane C; don't add flags yourself.

### 3f. Sibling repos (`~/Projects/tsumugu-ed`, `~/Projects/tsumugu`) — DO NOT COMMIT
Your Worker + shell-contract + freshness gate must interoperate with ed-side render changes that another (ED-REPO-BLOCKED) work item lands: ed re-render with `/dict-assets/` prefix, ed `site.js` param reader for `?s=&r=&g=`, ed `hv` ruby mode, ed SEO `SITE_ORIGIN=tsumugu.cc`, ed shell injection into `render_site.py`. Write your core side so it's ready and DOCUMENT the ed-side contract precisely in PR notes so the ed agent can implement against it. Do not edit those repos.

---

## 4. Your tasks

### D1 — `VITE_DICT_ORIGIN` env, default `https://tsumugu-ed.com` *(item 19)*
Replace the hardcoded dead dict origin in `dict/dictLink.ts:2` with an env-driven value via `config/site.ts` (a `VITE_` var, default `https://tsumugu-ed.com`). This immediately kills the 100%-dead deep-link class (dict links currently point nowhere). At federation cutover the default flips to same-origin, but ship the env default NOW. Update `dictLink.test.ts`.

### D2 — Axis-param contract + core emit alignment *(item 20)*
Write the axis-param contract into `docs/PRD-Dict-Handoff-Axes.md` §2: param **names, values, defaults, and precedence** (rule: URL params win at open; the dict's own popover wins + persists after the user interacts). Then align core's link emit to it. **Value-vocabulary fix:** core currently emits `r=py|zh|hv` while ed expects `pinyin|zhuyin` — reconcile to one vocabulary (define the canonical set in the contract; make `dictLink.ts` emit it). Params to cover: `s` (script), `r` (reading), `g` (gloss). Update `dictLink.test.ts`. Document the ed-side reader requirement (parse `?s=&r=&g=` into `ted-*`/`data-*` axes pre-paint) in PR notes for the ED-REPO-BLOCKED agent, including: `r=hv` maps to Hán-Việt ruby (ed must ship that mode; until then `r=hv`→pinyin is an explicit signed downgrade).

### D3 — Fixture fallback on validity + httpVault runtime guard *(item 7)*
In `host/httpVault.ts` `listVaultReadings`, require each entry to have `band` + `kind` + `wordCounts`; skip invalid entries with a `console.warn`. This makes the catalog robust to a thin/partial manifest. Coordinate with Lane B (they own `main.ts:88`/`:98-101`): the fixture fallback should trigger on **zero valid entries**, not raw manifest length. Add a regression test feeding the real thin manifest (1 entry, no band) → guard yields zero valid → (Lane B's fallback fires). Test the guard in `httpVault.test.ts`.

### D4 — Core `robots.txt` + sitemap fix *(item 25)*
`app/public/robots.txt` currently points at a nonexistent `/sitemap.xml`. Fix `scripts/build-sitemap.ts` so `/sitemap.xml` actually resolves and lists **live-origin URLs only** (no fixture/placeholder routes). Reconcile robots to reference the real sitemap. Test: `/sitemap.xml` resolves and contains only real URLs. (Note `build-sitemap.ts:46` writes a `catalog` route — align if the URL scheme changed; coordinate with Lane B's router changes.)

### D5 — SW navigation denylist (HARD pre-cutover gate) *(item 27)*
`pwa/sw.ts:35-36` has a `NavigationRoute` SPA fallback with NO denylist today — an installed PWA would serve `index.html` for dict URLs. Add a denylist so these are EXCLUDED from the SPA navigation fallback and pass through to the network/Worker: prefixes `/c`, `/w`, `/g`, `/browse*`, and `/dict-assets/`, plus ed root pages. Test (documented, run on an installed PWA at cutover): direct `/c/媽.html` returns the dict page, never `index.html`. This ships in the SAME deploy as the Worker (Task D8).

### D6 — Base-relative dict index + SW literal matchers *(item 53)*
`dictResolve.ts` hardcodes `INDEX_BASE='/dict-search'` and `sw.ts:21` uses literal path matchers. Derive both from `import.meta.env.BASE_URL` (reuse the `httpVault.staticVaultBase` pattern). This is unconditional and policy-independent — it makes the app work under a non-root base. CI check: `vite build --base=/sub/` produces working dict + SW paths.

### D7 — Precache policy + false offline-claim fix *(items 54, 55)*
- **Byte measurement (D-owned, item 54):** print a build-time byte measurement of readings + dict shards in the `vite build` output (record it in the PR). The 15MB-line policy pick is Wedge's (default expectation A = precache everything) — implement the measurement now; leave the threshold decision to Wedge but wire the default-A path.
- **Precache policy (item 55):** add `json` to the workbox `globPatterns` and un-ignore the vault per policy so vault JSON + dict shards are precached (default expectation A). Note `vite.config.ts` currently ignores `**/vault/**` with a 5MB cap — raise/adjust per the measured size.
- **False-claim fix:** `sw.ts:19` claims "offline resolve on cold install" which is not currently true — fix the comment/behavior to match measured reality. Coordinate: Lane B's privacy/about copy must NOT claim offline until this lands (tell Lane B when it's real). Test: airplane-mode matrix (desktop + one real phone) + SW update flow verified on one real deploy.

### D8 — Routing Worker (code now, deploy blocked) *(item 26)*
Create a new `worker/` directory with a Cloudflare routing Worker: route dict prefixes `/c|/w|/g|/browse*` + `/dict-assets/*` + ed root pages → the tsumugu-ed Pages build; everything else → the core Pages build (core Pages = the domain primary). Include a 301 map so `tsumugu-ed.com/<path>` → `tsumugu.cc/<same-path>` (path-identical). **Do NOT deploy** — deploy is blocked on: tsumugu-ed landing to main, `tsumugu.cc` resolving, and Wedge's Workers-Paid sign-off. Test (documented, at cutover): `tsumugu-ed.com/c/媽.html` 301s to `tsumugu.cc/c/媽.html`, the page renders styled with working search. In PR notes, spell out the ed-side prereq: ed must re-render assets under a dedicated `/dict-assets/` prefix (both builds currently emit `/assets/`, so naive prefix routing collides).

### D9 — Gen→publisher seam *(item 8)*
In `scripts/gen/cli.ts`, default `--out` to the vault publish path (or add an explicit copy step), and document the gen→publisher flow in `docs/handoffs/README.md`. This closes the seam where generated readings weren't landing where the publisher expects. **You touch only `scripts/gen/*` + `pipeline/*` — never write to `app/public/vault/` yourself** (the content workflow owns that directory; the seam just makes the path the default target). Integration test for the CLI `--out` default.

### D10 — `dualRail.ts` → `CatalogEntry`-compatible shape *(item 9)*
In `scripts/gen/lib/dualRail.ts`, make `CoreMetadata` emit a `CatalogEntry`-compatible shape: object-form `binding`, numeric `tocfl` / `newWords`, and `topic`. Add an integration test piping real `populateDualRail` output into `pipeline/lib/catalogEnrich.ts` `enrichCatalogEntry` (the two must compose without shape mismatch). `CatalogEntry` / `Band` types are owned by Lane A (`catalog/types.ts`) — consume read-only; if the type needs a field, request it from Lane A.

### D11 — Shell-contract artifact + freshness gate *(items 28, 32)*
- **Shell contract (item 28):** generate a versioned artifact from `mockups/site/_shell.html` (READ-only source) — `shell-tokens.css` + a topnav fragment + a nav JSON — that core vendors via a Vite copy step; both properties stamp `data-shell="v3"`; add a CI check that curls both and diffs (fails on drift). The ed-side injection into `render_site.py` is ED-REPO-BLOCKED — document the injection contract in PR notes. **Caveat:** `mockups/site/_shell.html` is STALE (silk-default, no seal/mist) per the design spec — coordinate with Lane A/B on whether the shell artifact is regenerated from the live Seal chrome or from `_shell.html`; if `_shell.html` is stale, note that the artifact source must be the current Seal shell, and flag that `mockups/` is a forbidden write path (so the artifact generator reads it but the canonical Seal shell may need to come from Lane A/B's committed CSS instead).
- **Freshness gate (item 32):** create `scripts/dict-sync.ts` that copies the vendored `app/public/dict-search/` from ed `exports/site/assets/search/` with a build-hash check that fails CI on staleness. Ship the FULL set (target ~5.0MB / 248 files / 10,260 rows; the current copy is 3.1MB / 82 files / 10,178 rows — missing 82 pattern entries + newer pinyin/VI/zhuyin/EN/facet shard families). The full-freshness *content* depends on tsumugu-ed landing to main (ED-REPO-BLOCKED) — build the gate + hash check now; it will pass once ed lands. Test: hash check runs at every core deploy.

### D12 — Audit tail sweep (your files) *(items 57, 58)*
Wire-or-delete in YOUR files (lint + tsc green both this repo and, advisory, the engine repo):
- `scripts/accc/resolve-lesson-target.ts:152` `resolveLessonTargetFromAuthoritative` — add a fixture test or flag it (#34).
- `scripts/accc/eval-g2pw-polyphones.ts` — confirm the log path (#35).
- `scripts/gen/reading-pipeline.ts` `buildUserPrompt` regression placeholder — wire or down-scope it (#36).
- Orphan exports if in your files: gen-qa `verifyExamples`, `trackEvent` GoatCounter call (#37, wire the real call), LRU in `packs/index.ts` (packs is a frozen shared zone — if it's imported by your `import/` code, flag rather than edit), `deploy.yml` sibling-repo checkout (#38), empty `render/` dir (#39, delete), stale engine doc comments (#49 — engine repo, advisory; **exclude the Anki `new:` deck key at `anki/exporter.ts:241` from any codemod**).
- `import/importPanel.ts:47-53` gated-capture skeleton (#30) — flag-or-remove.
- `staticVaultAvailable` (#43), `getCurrentLocale` (#46, if in your files) — wire or delete.

---

## 5. Booby traps

- **T7 — `noNetwork.test.ts` token regex.** `\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b` is BANNED (including in comments and strings) inside `import/prepareFromText.ts` + `import/importPanel.ts`. Do not add those tokens to those two files, even in a comment.
- **T12 — `vite.config.ts` cross-repo deps.** jieba-wasm alias → `../tsumugu/node_modules/...` (ln 69); dict-search copy from `../tsumugu-ed/exports/...` (ln 12, silently skipped if the sibling repo is absent). SW is `injectManifest` with `srcDir "src/pwa"` / `filename "sw.ts"` (ln 77-78) — moving/renaming `pwa/sw.ts` breaks the build. Precache ignores `**/vault/**` with a 5MB cap (Task D7 changes this deliberately).
- **T15 — `state.store` rebind hack** (Lane C's event names `"store"|"doc"|"sync"`). If your SW or analytics work touches store events, don't rename them.
- **T6 — `coupling.test.ts` scans every lane.** Bans `#/encoding` in all non-test `app/src` `.ts`, and `splitter/theater/fsVault/dictionaryProvider` in `reader.ts`/`wordPopup.ts`. Don't introduce those tokens.
- **Cross-repo silent skip** — the dict-search Vite copy step silently no-ops if `../tsumugu-ed/exports/...` is absent. Your freshness gate (D11) must FAIL loudly instead of silently shipping a stale/empty shard set.
- **`config/site.ts` has zero runtime importers today** — when you route `dictLink.ts` through it, you're creating the first runtime consumer; make sure the module is tree-shake-safe and that `VITE_SITE_ORIGIN`/`VITE_DICT_ORIGIN` stay single-sourced (don't leave the vite.config.ts:9 + build-sitemap.ts:18 duplication drifting).

---

## 6. Acceptance checks

1. `pnpm typecheck` → exit 0.
2. `npx eslint app` → exit 0.
3. `pnpm test` → green, including: `dictLink.test.ts` (env origin + axis-param vocabulary), `dictResolve.test.ts` (base-relative index), `httpVault.test.ts` (validity guard + thin-manifest regression), `site.test.ts`, `build-sitemap.test.ts` (real URLs only), `analytics.test.ts`, `reading-pipeline.test.ts`, dualRail↔catalogEnrich integration, dict-sync hash check.
4. `pnpm build` → green; build output prints reading + dict-shard byte totals; `vite build --base=/sub/` CI check passes (dict + SW paths resolve).
5. **Behavior:** dict links resolve to `https://tsumugu-ed.com/...` (not the dead origin); installed-PWA direct `/c/媽.html` does NOT return `index.html` (denylist); `/sitemap.xml` resolves; the Worker code exists (undeployed) with a documented ed-side prereq contract; the freshness gate fails on a stale shard set.

## 7. Umbrella §5 defects you must burn down

- 100%-dead dict deep-link class → D1.
- SW swallows dict navigations → D5.
- vault JSON + dict shards not precached / hardcoded base → D6/D7.
- false "offline on cold install" claim → D7.
- gen→publisher seam + dualRail type mismatch → D9/D10.
- stale/undersized dict-search shard set → D11.
- audit-tail orphans in scripts/import → D12.

## 8. You must NOT do

- Do NOT deploy the Worker or SW denylist (deploy is blocked on ed-landing, `tsumugu.cc` resolving, and Wedge's Workers-Paid sign-off).
- Do NOT commit in `~/Projects/tsumugu-ed` or `~/Projects/tsumugu` (ED-REPO-BLOCKED work is a separate item; document the contracts instead).
- Do NOT write to `app/public/vault/` (content workflow owns it) — gen-seam work stays in `scripts/gen/*` + `pipeline/*`.
- Do NOT edit `styles/*`, `catalog/*`, `library/*`, `fixtures/*` (Lane A); `main.ts`, `router.ts`, `nav.ts`, `strings.ts`, `staticPages.ts`, `home.ts`, `wordPopup.ts`, `seo/meta.ts`, `app/settings.ts` (Lane B); `store/`, `auth/`, `account/`, `settings/SettingsView.ts`, `config/features.ts` (Lane C).
- Do NOT rename/move `pwa/sw.ts` (breaks the injectManifest build).
- Do NOT add `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` tokens to `import/prepareFromText.ts` or `import/importPanel.ts` (even in comments).
- Do NOT un-gate encoding/voice; do NOT build Sync Stage-2 Worker/D1 (Lane C's deferred item).
- Do NOT touch forbidden paths beyond READ-only `mockups/site/_shell.html`.

## Amendments — 2026-07-02 sign-offs (binding; read before starting)

1. Workers Paid is SIGNED (accepted by name) — cutover checklist items may assume it; nothing deploys this lane regardless.
2. The converter/gate/manifest already exist under `scripts/companion/` (forbidden path — do not rebuild any of it). Your gen-seam task (`scripts/gen/cli.ts --out`) stands unchanged.
3. `DICT_ORIGIN` env default `https://tsumugu-ed.com` is confirmed — ship it; deep-links must resolve against the LIVE dictionary today.
