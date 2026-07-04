# ARCHITECTURE — Unified Tsumugu Site

Status: contract for every future build session. Authored 2026-07-02 against `tsumugu-core@wo-core-0-scaffold` and `tsumugu-ed@feat/story-cards-modified-loci`. Repo-relative paths are under `/Users/n1/Projects/tsumugu-core` unless prefixed with a repo name.

This document is the unifying map. The executable work lives in the 62-item PRD checklist and the per-lane app map. Read this first, then those. Every claim below anchors to a file so any future session can verify it against the tree.

---

## 1. The one-site shape

Tsumugu is one product across two Cloudflare Pages builds. `tsumugu-core` is the app (library, reader, popup, importer, search, sync). `tsumugu-ed` is the dictionary (per-character `/c/`, per-word `/w/`, grammar `/g/`, `/browse*`). The unified domain is `tsumugu.cc`.

Two eras, one seam:

- **Today (deep-link era).** Core links out to the live dictionary via an env-driven origin. `app/src/dict/dictLink.ts` builds dict URLs against the hardcoded `DICT_ORIGIN` at line 2 (today `https://tsumugu.cc`, unresolved); `DICT_ORIGIN` moves into `app/src/config/site.ts` as a VITE var defaulting to `https://tsumugu-ed.com` (item 19). This kills the currently-dead deep-link class the moment it ships, independent of any cutover.
- **Later (federation era).** A routing Worker (net-new `worker/`, item 26) puts both builds on `tsumugu.cc`. Dict prefixes `/c /w /g /browse* /dict-assets/*` and ed root pages route to the ed Pages build; everything else routes to core, which owns the domain root. `DICT_ORIGIN` flips to same-origin at that point. The Worker deploy is blocked on landing ed's branch (item 2), the domain (item 3), and a paid-Workers sign-off (item 29).

### Surface map after the 11 → 7 cut

The router today declares 11 surfaces (`app/src/app/router.ts:11-22`): `home | library | grammar | flashcards | account | reader | about | privacy | feedback | colophon | method`. The unified IA collapses this to 7 live surfaces.

| Surface | Route | State | Anchor |
|---|---|---|---|
| Hub (library-as-home) | `#/` | library IA becomes the landing surface: Continue strip → Companion shelf → Free Reading wall | items 35, 41, 42; `app/src/main.ts:433` default flips from `home` to library |
| Reader | `#read…` | unchanged core reader, frozen zone | `app/src/reader/*` |
| Popup | in-place | word lookup = capture; tints propagate | `app/src/hover/wordPopup.ts` |
| Importer | panel | BYO-text, client-side only | `app/src/import/importPanel.ts` |
| ⌘K search | overlay | readings + dict chars + facet jumps, grouped | items 43; `app/src/library/switcher.ts` |
| Sync | panel, gated | behind `VITE_FEATURE_SYNC`, default off | items 47; `app/src/auth/accountView.ts` → sync panel |
| About / Privacy / Feedback | footer routes | colophon + method fold into About | item 40; `app/src/shell/staticPages.ts` |

Killed: `home` (356-line surface, `app/src/shell/home.ts`, item 37), `flashcards` (50-line placeholder, item 38), `grammar` (3 hardcoded samples, item 39). Grammar does not become a surface. Lesson grammar renders inside the Companion lesson view as LINKS to ed `/g/` pages only. The ACCC-extracted grammar list in `mockups/lesson-highlights.json` is never rendered or published (standing default, resolves umbrella §9.4).

Dictionary is never a nav tab. It is reached through popup, ⌘K char rows, and reading deep-links (item 36).

---

## 2. The one-brain data flow

One store owns learner state. Everything else derives from it or mirrors it.

- **WordStore** (`app/src/store/userStore.ts`) holds word status. WordStatus is `"1".."4" | known | ignored`, where `1` is the strongest New. Reader recoloring and library excerpt tinting both read it; `app/src/main.ts:466-473` rebinds `state.store` on UserStore events, so store event names (`store | doc | sync`) are a hard contract (App Map trap 15).
- **UserDoc** (`app/src/store/userDoc.ts`) is the portable document. Clock-aware merge, never demotes a known word (`userDoc.test.ts`). `UserProfile.email` becomes optional-and-empty; nothing is collected (item 49).
- **Derived known-char set** (item 30) is written to `localStorage` key `tsumugu.knownChars.v1` on every WordStore change. Tint rule, versioned with the key: a char tints iff it is exact-known or contained in a known word. The ed reader reads this key to color dictionary pages (ED-REPO-BLOCKED consumer).
- **Prefs mirror** (item 31) writes script/reading/gloss/theme/palette into `tsumugu.prefs.v1`. Ed reads it as a default when its own `ted-*` keys are unset (ED-REPO-BLOCKED consumer).

### The sync seam

Sync Stage 1 is client-only and complete behind `VITE_FEATURE_SYNC` (item 47). The panel carries: file export (`accountView.ts:330`), new file import (picker/drag → `mergeUserDocs`), Web Share handoff, a `base64url(deflate(UserDoc))` copy/paste sync code (~120KB at 2,500 entries), `UrlRemoteStore` BYO-URL pull-and-merge, and Anki `.apkg` export (`app/src/account/ankiExport.ts`).

The portable-file contract is the whole product at Stage 1. Export device A, import device B, grade both, re-sync yields zero demotions and zero lost notes or tags (item 50 test). A doc authored today must re-import after every future schema bump.

Stage 2 (item 52, DEFERRED) is a ~300-line Worker plus D1 behind `VITE_SYNC_API_URL`, matching the `app/src/store/remoteStore.ts:9-13` seam byte-for-byte, with `If-Match`/ETag conditional PUT from day one. It is kill-gated on real usage and rides the paid-Workers sign-off (item 29).

---

## 3. The design system

One two-layer token system. Raw palette blocks define color; a semantic `:root{--tsg-*}` block maps raw values to UI roles (`app/src/styles/tokens.css:197-213`, unchanged). App CSS reads only the semantic layer, so a palette swap restyles without a rebuild.

### 8 palettes, seal default

Seal-red replaces silk as default (item 33). The `:root,` default prefix moves from the silk-light block onto seal-light (`tokens.css:2`). Full RAW blocks for seal and mist (light + dark) come verbatim from `mockups/site/home.html:26-93`. Every palette block gains a `--tsg-ui`/`--tsg-on-ui` neutral UI-emphasis pair (values in the mockup spec table); this pair drives the `.sw.on` swatch ring and topic-chip `.on` fallback, so the "All interests" chip highlights with the neutral pair instead of accent-red.

| Palette | Role |
|---|---|
| seal | default, cinnabar red on warm paper |
| mist | cool grey, seal accent |
| silk, celadon, sumi, loom | existing warm/cool light templates |
| navy, mauve | dark-native (force theme=dark on select) |

`tokens.test.ts` pins byte-exact token strings and all palette-block names (App Map trap 8). Adding seal/mist means editing the `Palette` type (`app/src/app/settings.ts:4`), the `PALETTES` arrays in `nav.ts:22` and `SettingsView.ts:11`, the CSS blocks, and the test, or tsc/vitest fails. The full app CSS (~1,394 lines) ports to seal-red through the semantic layer with a grep-no-new-hardcoded-colors bar (item 34). Reader CSS stays untouched beyond shared tokens.

### data-* axes

Three orthogonal axes plus a page marker live on `<html>` (mockup spec §4): `data-rail`, `data-theme`, `data-palette`, `data-page`. Reading mode is a fourth axis carried in settings (`r=py|zh|hv`).

| Axis | Values | Default | Owner |
|---|---|---|---|
| rail | `en \| vi` | `en` (`app/src/app/settings.ts:2`) | settings singleton |
| theme | `light \| dark` | light; navy/mauve coerce dark | topnav theme button |
| palette | 8 names | `seal` | topnav swatches |
| reading | `py \| zh \| hv` | `py` | 設 popover |

The `Reading` type carries a fourth legacy alias `zy` (`app/src/app/settings.ts:7`), folded into `zh` inside the frozen reader (`app/src/reader/reader.ts:99`); the axis contract and `dictLink` emit only `py|zh|hv`.

Per-content-type default palette picks are Wedge's call (item 46): dict = mist, companion = loom/sumi suggested. Both are proposals awaiting his pick; nothing ships as a default without it.

The topnav, footer, and rail-bilinguality CSS (`:root[data-rail="en"] .vi-only{display:none}` etc.) port verbatim from `home.html`. Every chrome label is an `en-only`/`vi-only` span pair. Library card studies A (excerpt-as-hero) and C (ring + new-word chips) are the two shipping card forms; study B is cut (items 41, 42).

---

## 4. The content pipeline seam

One path takes authored drafts to a rendered library. Today the library shows a fixture; the pipeline makes it show real readings.

```
mockups/drafts/B*.json  (46 lessons / 138 articles)
  └─ converter (item 4, scripts/companion/convert-drafts.ts — built, working tree)
       jieba tokens + glossary + Hán-Việt bridge + computed metrics + LessonBinding
  └─ <id>.prepared.json  → app/public/vault/readings/zh-Hant/
  └─ reading_checks A–H fail-closed, 0 waivers (item 5, scripts/gen/qa/)
  └─ manifest emitter (item 6) → app/public/vault/__readings.json  (real CatalogEntry[])
  └─ listVaultReadings runtime guard (item 7) → catalog render
```

Load-bearing seams:

- **Gen → publisher** (item 8). `scripts/gen/cli.ts --out` defaults to the vault path; documented in `handoffs/README.md`.
- **Type bridge** (item 9). `scripts/gen/lib/dualRail.ts` `CoreMetadata` becomes `CatalogEntry`-compatible: object `binding`, numeric `tocfl`/`newWords`, `topic`. Integration test pipes real `populateDualRail` into `enrichCatalogEntry`.
- **LessonBinding is metadata only.** Band and binding derive from the unit id plus `mockups/lesson-highlights.json`. The grammar list content never publishes.

### Fixture vs real mode

The fixture is live today. `app/src/main.ts:98-101` falls back to `FIXTURE_CATALOG` when the manifest is empty or every entry lacks `band`; the current `__readings.json` has 1 entry with 0 bands, so users see the fixture right now (App Map trap 4). Two changes fix this:

1. The fallback condition moves from manifest length to entry validity (`main.ts:101`), with a runtime guard in `listVaultReadings` requiring band+kind+wordCounts (item 7).
2. A demo-mode banner renders whenever `FIXTURE_CATALOG` renders; zero undeclared-fixture paths (item 11).

The library renders through `app/src/catalog/catalogView.ts` (`mountCatalogView:224`). It gains loading-skeleton, empty-catalog-with-cause, and no-results states (item 10), all token-native. The Free Reading wall is band rungs × topic chips × per-topic sections (item 42). The Companion shelf is a Book → Lesson spine over 46 lessons with a union-coverage badge as the promise (item 41).

---

## 5. The dictionary seam

The dictionary is one dataset reached three ways: bundled search shards (⌘K, popup), and cross-property deep-links.

- **Bundled shards.** `app/public/dict-search/` is vendored from ed's `exports/site/assets/search/`. Item 32 makes this a build step with a build-hash freshness check that fails CI on staleness, shipping the full 5.0MB/248-file set (current copy is a stale 3.1MB/82-file, 10,178-row subset). `app/src/dict/dictResolve.ts` reads `INDEX_BASE='/dict-search'`; item 53 derives it from `import.meta.env.BASE_URL` for sub-path builds.
- **Popup.** `wordPopup.ts` resolves against the bundled shards. Fix the unconditional always-show form block at `wordPopup.ts:245-250` (it renders a placeholder whenever the entry carries no form data) so the empty Form box hides (item 56).
- **⌘K.** `switcher.ts` groups readings (in-band-first) + dict chars + facet jumps; char rows open a same-origin `/c/` page carrying live rail axes (item 43).

### Axis-param contract

Deep-links carry display state. The contract (item 20, written into `docs/PRD-Dict-Handoff-Axes.md`): params `s` (script), `r` (reading), `g` (gloss); params win at open, the popover wins and persists after. Core emits `r=py|zh|hv`; ed today reads `pinyin|zhuyin`, so the value vocabulary must align. Until ed ships `hv` ruby (item 22), `r=hv` is an explicit signed downgrade to pinyin.

### Federation cutover checklist

BUILD-NOW (core side, land now):
- item 19 `DICT_ORIGIN` env default
- item 25 fix core `robots.txt` → real `/sitemap.xml`
- item 26 routing Worker code
- item 27 SW navigation denylist for dict prefixes (`app/src/pwa/sw.ts:35-36` has none today) — hard pre-cutover gate
- item 28 shell contract artifact (`data-shell="v3"`, CI parity diff)
- item 30 known-char-set write, item 31 prefs mirror, item 32 shard freshness

ED-REPO-BLOCKED (need ed's branch landed and re-rendered):
- item 2 land `feat/story-cards-modified-loci` → main (43 dirty files, triage first)
- item 21 ed param reader (`?s=&r=&g=` pre-paint)
- item 22 ed `hv` ruby mode
- item 23 ed `/dict-assets/` asset prefix (both builds emit `/assets/` today)
- item 24 ed SEO rebake (`SITE_ORIGIN=tsumugu.cc` canonicals)
- item 28 ed-side shell injection into `render_site.py`

WEDGE-ONLY (decisions he owns; zero code):
- item 3 register/point `tsumugu.cc`
- item 29 accept/reject Workers Paid by name (the metered-tail conflict with the no-metered-API rule is real; Wedge decides)

---

## 6. Feature flags

`app/src/config/features.ts` is the flag surface (Lane C owns; `main.ts` and `nav.ts` consume read-only). Flags are build-time `import.meta.env` at module load, default all OFF; flipping requires a rebuild (App Map trap 16).

| Flag | Gates | Default | Anchor |
|---|---|---|---|
| `VITE_FEATURE_SYNC` (new) | entire Sync panel: import, share, sync-code, UrlRemoteStore, Anki export | off | item 47 |
| `VITE_FEATURE_ENCODING_MODAL` | encoding modal; stays gated, ruled out for v1.x | off | item 59 |
| `VITE_FEATURE_VOICE` | ~1,000-line voice/shadowing layer, no v1.x surface | off | item 61 |
| `VITE_FEATURE_ACCOUNTS` | legacy account surface; absorbed into Sync | off | App Map §1 Lane C |
| `VITE_FEATURE_FLASHCARDS`, `VITE_FEATURE_GRAMMAR` | dead once routes are killed (items 38, 39); C decides keep/drop | off | App Map §2 |

Settings leave the Account surface for the 設 popover (item 48) and are NOT gated; they ship with the nav rework. First-run onboarding overlay is rejected by default (item 60); the only surviving fragment is an unscheduled future "?" keybind card.

---

## 7. Build and test topology

Commands, run from repo root with `pnpm@11.5.1` (App Map §4):

| Command | Status | Note |
|---|---|---|
| `pnpm typecheck` (tsc -b) | GREEN | |
| `pnpm lint` (eslint .) | RED, 20 errors, ALL outside `app/` | Wedge WIP in `mockups/`, `workflows/`. Gate on `npx eslint app` (clean). |
| `pnpm test` (vitest run) | GREEN, 40 files / 150 tests | happy-dom for `app/src` |
| `pnpm build` (vite + build-sitemap) | GREEN | injectManifest SW, 5MB precache cap |

Lane ownership (App Map §1): Lane A = design-system + library (`styles/`, `catalog/`), Lane B = shell + IA + copy (`main.ts`, `shell/`, `i18n/`, `app/`), Lane C = sync (`store/`, `auth/`, `account/`, `config/features.ts`), Lane D = platform (`pwa/`, `dict/`, `import/`, `host/`, `scripts/`). Frozen zones: `reader/`, `voice/`, `packs/`, `ui/dom.ts`, `types/corePrepared.ts`. `coupling.test.ts` scans every lane and bans `#/encoding` hrefs anywhere (App Map trap 6).

### Release gate (umbrella §10, encode as pre-cutover CI where automatable)

- Zero dead internal links.
- ≥130 real readings, zero fixture fallback in prod.
- All published readings pass reading_checks A–H, 0 waivers.
- A reading reaches first paint in <10s with no account or modal.
- A word graded in the reader tints on its dict page and colors library excerpts with no reload.
- UserDoc export → wipe → import round-trip is automated.
- The umbrella §5 burn-down is zero-open: fixture cards no longer 404 silently, home surface killed, `tsumugu-session` gate gone, `tsg-dict-hits` styled, search ranking fixed, SW denylist shipped.
- typecheck + lint + build + full suite green in BOTH repos.
- Every privacy and method claim is true on ship day (no offline claim until item 55 ships; Stage-2 privacy paragraph ships only with the Worker).

### Sequencing

P0 hygiene (items 1–3) unblocks everything. P1 content-in (items 4–17) gates a non-empty hub and runs parallel to P2 federation (items 19–32) and P3 one-look (items 33–46). P4 sync (items 47–52) is flag-gated and independent. P5 polish (items 53–62) is the tail. Deferred by decision: B4L05–B5L10 authoring (item 18), sync Stage 2 (item 52), encoding modal (item 59), onboarding (item 60), voice (item 61), the §6 option menu and monetization (item 62).
