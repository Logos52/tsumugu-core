---
title: "PRD — Site Federation: tsumugu-core × tsumugu-ed as one origin"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Wedge (sign-off) + Claude Code
owns: The core×ed unification architecture — origin/routing, deep-link contract, shell contract, shard freshness, shared word-status. Umbrella: PRD-Super-App-Unification.md. The URL-param work item absorbed here was PRD-Dict-Handoff-Axes.md.
authority: Wedge directive 2026-07-02 ("fuse tsumugu-core and tsumugu-ed" if feasible); measurements 2026-07-02; amends PRD-Tsumugu-Core-v1.md §4.5
---

# PRD — Site Federation

**Verdict: federate, don't merge. Both build systems survive — ed's 8.4s stdlib-Python SSG and core's Vite PWA — and unify at the HTTP layer: one origin at `tsumugu.cc`, path-split by a small routing Worker, so the user sees one site and one localStorage while the repos, builds, and deploys stay independent.** Cost ≈ 7–9 sessions, including one ed re-render (asset prefix + origin rebake — the two config-level changes federation does ask of ed) and a pre-cutover service-worker guard in core; reversal = delete the Worker and revert DNS. This amends PRD-Tsumugu-Core-v1.md §4.5 ("The dictionary is not an in-app route — it is a separate static site the reader taps out to"): the dictionary remains a separate build, and it stops being a separate *site*.

## 1. What is actually being compared

The real comparison is **where unification happens**: at the repo/build layer (merge), at the HTTP layer (federation), or at the data layer (ship ed's entry data into the app and render in-app) — rather than the surface framing of "merge the repos vs keep two sites." The user-visible requirement — one nav, one design, one word-status brain, no dead links — is satisfiable at any of the three layers; they differ in cost, risk, and reversibility.

## 2. Measured facts (2026-07-02)

- tsumugu-ed built output: **10,277 HTML pages, 161 MB, 10,533 files** (c/ 2,662 = 51 MB · w/ 7,001 = 87 MB · g/ 597 = 9.9 MB). Full rebuild: **8.4s**, stdlib-only Python, zero pip deps.
- Search shards: 5.0 MB / 248 files. Core vendors a **stale manual copy** (3.1 MB / 82 files, dated to the Jun-22 build — 10,178 rows vs ed's current 10,260, missing the 82 pattern entries added 2026-07-01 and the newer pinyin/VI/zhuyin/EN/facet shard families).
- Ed's built pages hard-reference `/assets/` (site.css, search.js, `assets/search/*` shards, logos), and every page bakes a `<link rel="canonical">` to `https://tsumugu-ed.com/...`; ed's `sitemap.xml` and `robots.txt` live at root. Core's Vite build **also** emits `/assets/` (hashed bundles), and core's `robots.txt` points at a `/sitemap.xml` that does not exist.
- Deploy: Cloudflare Pages from ed repo **main**, domain `tsumugu-ed.com`, live (HTTP 200 today). Ed's checked-out branch `feat/story-cards-modified-loci` is **ahead of main** — the live site is a Jun-22 build without the grammar fuse or the Simplified-VI rail.
- Core's `dictLink.ts:2` hardcodes `DICT_ORIGIN = "https://tsumugu.cc"`, which **does not resolve** — every dictionary deep-link in the app is dead today.
- The `?s=&r=&g=` axis params are **emit-only**: ed's shipped `site.js` contains zero `URLSearchParams` parsing, and the value vocabularies mismatch (core sends `r=py|zh|hv`; ed stores `pinyin|zhuyin`, no hv mode).
- localStorage partitions by **origin** (scheme+host+port). `dict.tsumugu.cc` and `tsumugu.cc` cannot share word-status client-side; 2026 browsers partition third-party iframe storage, so the iframe-bridge workaround is dead. Path federation on one host is the only zero-backend way to share the brain.

## 3. The architecture

One origin, `tsumugu.cc`. Core's app owns `/`, `#library`, `#read=…`, and the app routes. Ed keeps its existing URL shapes — `/c/`, `/w/`, `/g/`, `/browse*` — served by the routing Worker from the ed Pages build, so all 10,277 indexed pages migrate with **zero URL churn**; `tsumugu-ed.com` 301s path-identically. Make core's Pages project the domain primary and route only the dict prefixes through Worker routes, so the static-first posture holds for the app itself.

The seam contract, in full:

1. **Routing Worker + one ed render change.** Prefix-only routing of `/c|/w|/g|/browse*` fails on contact: every ed page loads `/assets/site.css`, `/assets/search.js`, and `assets/search/*` shards, and core's Vite build also emits hashed bundles under `/assets/` — so under a naive split, every dict page renders unstyled with dead search. Fix: ed re-renders with a dedicated asset prefix (`/dict-assets/`, one `render_site.py` constant plus template refs), and the Worker routes the dict prefixes + `/dict-assets/*` to ed, everything else to core. Ed's root cross-links (`/about.html`, `/grammar.html`, `/method.html`) route to ed until the shell contract (item 4) folds them into the shared nav. 301 map from tsumugu-ed.com.
2. **SEO rebake, same re-render.** Ed pages bake canonicals to `tsumugu-ed.com`; after cutover those would 301 back to themselves — a canonical/redirect contradiction search engines punish. Re-render with `SITE_ORIGIN=tsumugu.cc` (env already exists in `render_site.py`), route `/sitemap.xml` to ed or merge sitemaps, decide `robots.txt` ownership, and fix core's robots pointer (it names a sitemap that doesn't exist).
3. **`DICT_ORIGIN`** becomes same-origin config; the dead-domain bug dies as a one-line change.
4. **Params + the hv reading mode.** Ed's `site.js` parses `?s=&r=&g=` into its `ted-*` keys at page open; persisted toggles win after open. (The former PRD-Dict-Handoff-Axes deliverable, now same-origin.) The reading-axis gap gets closed rather than mapped away: **ed gains an `hv` ruby mode** as part of this work — the Hán-Việt data is already on 2,659/2,662 entries — so a VI-rail reader lands on Hán-Việt ruby, keeping canon §4.5's "opens in the same scaffolding" true on the moat rail. Until the hv mode ships, `r=hv` maps to pinyin, and success criterion 3 below is explicitly unmet on the reading axis.
5. **Shell contract**: the Seal-red shell ships as a versioned artifact — `shell-tokens.css` + topnav fragment + nav JSON, generated from `mockups/site/_shell.html`. Core vendors it via a Vite copy step; ed injects it in `render_site.py` (which already embeds CSS/JS as strings). Both stamp `data-shell="v3"`; CI curls both properties and diffs the stamp.
6. **Shared word-status, derived.** Core persists a `WordStoreDoc` keyed `(lang, word)` — multi-character words, ~hundreds of KB at active-learner scale — under `tsumugu-core/word-store`. Ed's 8 KB vanilla `site.js` never parses that. Instead, the app writes a compact **derived char-set** under a shared versioned key (`tsumugu.knownChars.v1`) on every store change: the set of characters that are exact known entries or appear in a known word. Ed reads the set and tints; `/w/` pages may additionally match the exact word. Capture stays reader-side — dict-side mark-known stays rejected (Ulysses ledger). The tint rule ("a char tints iff exact-known or contained in a known word") is part of the contract, versioned with the key.
7. **Shared display prefs.** One origin with two pref namespaces would show mismatched chrome to anyone reaching a dict page without params (browser history, search engines, `/browse*`). Contract: the app mirrors script/reading/gloss/theme/palette into `tsumugu.prefs.v1`; ed reads it as its default when its own `ted-*` keys are unset; params still win at open. Residual accepted: a user who sets prefs on ed pages first diverges until they touch the app.
8. **Shard freshness gate**: the vendored dict-search copy becomes a build step against ed's `exports/site/assets/search/`, with a build-hash check so a stale copy fails CI instead of shipping silently. Ship the full 5.0 MB / 248-file set (the current 3.1 MB subset is 82 entries and several shard families behind).
9. **Service-worker guard — hard pre-cutover gate.** `sw.ts:36` registers `NavigationRoute` with no denylist today; an SPA fallback would swallow `/c/*` navigations and serve `index.html` for dict URLs. The denylist (dict prefixes + `/dict-assets/` + ed root pages) ships in the same deploy that turns the Worker on — core has no installed service workers in production yet, so same-deploy suffices; after launch this ordering becomes one-deploy-ahead.

**Prerequisites owned by Wedge:** register/point `tsumugu.cc` (locked as the domain in PRD §12.1, currently unresolved), and land ed's working branch to main so the live dict carries the grammar fuse before it moves origins.

## 4. Steelman of the rejected options

**Full merge** (one repo, one build, one deploy) buys perfect unity and a single release train. It is also effectively one-way: 161 MB / 59 MB of generated+source JSON enters core's git, the Pages project config is redone, release cadences couple (a corpus typo redeploys the tested PWA), and retreat means un-merging repos. Merge's honest case — "two builds can't hold design parity by convention" — is answered with the stamped shell contract plus CI; if that check fails repeatedly across two consecutive design passes, merge becomes right.

**Data fusion** (ship entry data into the app, render dictionary in-app) respects the moment that matters most — mid-reading lookup stays in-shell with ~3 KB fetches instead of an MPA page load. It also permanently forks rendering: every entry-display fix lands twice (ed's `render_site.py` and the app's renderer), the exact duplication the encoding-modal PRD warns against. It leaves `tsumugu-ed.com` outside the word-status loop besides. Fusion composes with federation; merge does not — so fusion stays available as a later layer (see flip).

## 5. Flip conditions

- Post-launch behavior shows readers bouncing at the reader→dict MPA crossing, or Wedge re-opens §4.5 wanting the full entry in-app → add a `#dict/字` route rendering from the bundled shards **on top of** the federated origin. Federation is not undone by this; it is extended.
- The `data-shell` parity check fails across two consecutive design passes → escalate to merge.

## 6. Price

**7–9 sessions**: (1) ed re-render — asset prefix + `SITE_ORIGIN` rebake + sitemap/robots seam; (2) Worker + cutover + 301s + the same-deploy SW denylist; (3) DICT_ORIGIN + param parsing; (4) ed's hv reading mode; (5–6) shell contract into both builds; (7) derived char-set + prefs mirror + shard freshness gate; (8–9) contingency for the cutover tail (the sync Worker itself is priced in PRD-Accounts-Portable-Sync and rides the same origin).

Infra pricing, stated accurately: $0 on Workers Free — but the free quota is **100k requests/day account-wide**, shared between this routing Worker (which fronts every dict pageview at ~6–8 requests each once assets route) and the future sync Worker; exceeding it fails open (dict URLs served by core Pages — the SPA shell — i.e. wrong content, silently) or errors. **Workers Paid is $5/mo base + metered overage past 10M requests (~$0.30/M); Cloudflare offers no hard spend cap.** That brushes Wedge's no-metered rule: mitigations are client-side throttles and Worker-side rate limiting, and the realistic bill at this product's scale is the $5 base — but the accurate description is "subscription with a metered tail," and Wedge accepts or rejects it by name at sign-off. Treat Workers Paid as a **cutover precondition**, priced into the decision rather than a someday trigger.

Residual costs, stated: reader↔dict crossings remain full page loads; shell parity is convention enforced by CI, never compilation; the derived char-set key becomes a public contract with a second, codeless consumer (ed's vanilla JS) — version it; prefs set ed-side first diverge until the user touches the app.

## 7. Success criteria (falsifiable)

- One origin serves both properties; `tsumugu-ed.com/c/媽.html` 301s to the identical path on `tsumugu.cc`; the landed page renders styled with working search (assets resolve).
- Zero dead dictionary deep-links from the app (today: 100% dead).
- Opening a dict link from the VI rail lands with script and gloss matching the reader's live axes, and with Hán-Việt ruby once the hv mode ships (interim: pinyin — an explicit, signed downgrade, unmet on the reading axis until then).
- A word graded in the reader tints per the contract rule on its `/c/` page with no server round-trip; a dict page reached with no params shows the app's theme/palette/script.
- Every dict page's canonical URL names `tsumugu.cc`; `/sitemap.xml` resolves and lists only live-origin URLs.
- Both properties return the same `data-shell` stamp; CI fails on drift.
- Bundled shard hash matches ed's latest build hash at every core deploy.
- With the SW registered and the Worker live, navigating directly to `/c/媽.html` in an installed PWA returns the dict page, never `index.html`.
