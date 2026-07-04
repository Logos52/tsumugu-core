# WO-UNIFY-A — Design System + Library (Seal-red retheme + library-as-home surface)

**Repo:** `/Users/n1/Projects/tsumugu-core` · **App source:** `app/src` · **Package manager:** pnpm@11.5.1
**You are one of four parallel implementation agents.** You will NOT see the PRDs — this brief is complete and self-contained. Do the work described here and nothing outside your lane.

---

## 0. Your mission in one paragraph

Re-skin the entire app from the retired "Silk-Seam" violet palette to the new **Seal-red (朱/印泥 cinnabar)** default, add two new palettes (`seal`, `mist`) alongside the six existing ones, and build the real **library** surface (continue strip, controls bar, topic rail, recommended rail, per-topic sections, and the card variants) from the Seal-red mockups. You own all CSS tokens, all app CSS, the catalog/library/fixtures modules, and the `Palette` type's value list. You do not touch the shell, router, i18n, store, or platform code — other agents own those.

---

## 1. Hard rules (apply to every task)

- **Strict file ownership.** You may edit ONLY the files listed in §2. If a task seems to need a file you don't own, it belongs to another lane — stop and describe the seam in your PR notes instead of editing it.
- **Forbidden paths for ALL lanes (never touch):** `scripts/companion/`, `out/companion/`, `docs/companion/`, `mockups/`, `app/public/vault/`. Another workflow owns content right now. You may READ `mockups/site/*.html` as a design reference (the spec below already extracts everything you need), but never edit anything under `mockups/`.
- **Reader CSS is locked.** `app/src/styles/reader.css` is untouchable EXCEPT the two explicit edits called out in Task A7 (the `.sw.on` ring token + new swatch gradients). Do not restyle the reader.
- **No server code, no build-config edits, no store/auth edits.** Those are Lanes C/D.
- **Lint gate:** root `pnpm lint` fails on Wedge's WIP files under `mockups/` and `workflows/` — that is NOT your regression. Gate your work on `npx eslint app` (must be exit 0) plus `pnpm typecheck` and the named tests.
- **CSS is byte-pinned by tests.** `app/src/styles/tokens.test.ts` asserts exact strings (e.g. `--tsg-accent:var(--raw-violet)` with NO space after the colon, `--raw-violet:#6B4BD6`, all palette block selectors, `base.css` keeping `.w.nw`, `var(--raw-violet-soft)`, `:root[data-rail="en"] rt`, and NO `background` inside any `.tsg-status-*` rule). Do NOT run a prettier/format pass over CSS — it will reorder/space-normalize and break the suite. Edit surgically. You WILL need to update `tokens.test.ts` for the new palettes and the moved default (it is your file); keep every still-true assertion, add assertions for the new palettes.

---

## 2. Files you OWN (edit freely)

```
app/src/styles/tokens.css        (213 ln — palette RAW blocks + semantic --tsg-* mapping)
app/src/styles/base.css          (507 ln — chrome, .w word spans, buttons, halo)
app/src/styles/catalog.css       (415 ln — library grid + cards)
app/src/styles/tokens.test.ts    (token-literal assertions — update for new palettes)
app/src/catalog/catalogView.ts   (441 ln; exports mountCatalogView at :224)
app/src/catalog/catalogView.test.ts
app/src/catalog/coverage.ts + coverage.test.ts
app/src/catalog/facets.ts + facets.test.ts
app/src/catalog/preparedMeta.ts, rungs.ts
app/src/catalog/types.ts         (CatalogEntry / Band — YOU own this shared type; see §3)
app/src/catalog/fixtures/catalog.ts (FIXTURE_CATALOG — what users SEE today; see trap T4)
app/src/library/LibraryView.ts   (currently a 27-line re-export of catalogView + facets)
app/src/library/switcher.ts      (Cmd-K switcher — Lane B co-edits; see §3)
app/src/test/fixtures.ts         (shared test helper; other lanes consume read-only)
```

You may CREATE new files under `app/src/library/` (e.g. a companion-shelf module) and `app/src/catalog/`.

**Reader-CSS exception (Task A7 only):** `app/src/styles/reader.css` — the single `.sw.on` line and the swatch-gradient block near reader.css:54-55. Nothing else in that file.

---

## 3. Shared seams — what you expose, what you may assume

You sit at the center of several cross-lane contracts. Respect these exactly.

### 3a. The `Palette` value list (TRI-LANE contract — you own the values)
The palette union is spread across three lanes:
- **Lane B** owns the `Palette` *type declaration* in `app/src/app/settings.ts:4` and the `PALETTES` array + `PALETTE_LABELS` in `app/src/shell/nav.ts:22`.
- **Lane C** consumes it in `app/src/settings/SettingsView.ts:11`.
- **YOU (Lane A)** own the CSS reality: every `:root[data-palette="…"]` block in `tokens.css`, and `tokens.test.ts` which pins the names.

The six existing palette values are: `silk, celadon, sumi, loom, navy, mauve`. You are ADDING `seal` and `mist`, and **`seal` becomes the default** (moves the bare `:root,` selector prefix from silk-light onto seal-light).

**Coordination:** Lane B extends the `Palette` type to include `"seal" | "mist"` and puts `seal` first / as default; Lane B adds them to the `PALETTES` array + labels; Lane C surfaces them in the settings popover. YOUR job is the CSS blocks + `--tsg-ui`/`--tsg-on-ui` pairs + `tokens.test.ts`. **Do NOT edit settings.ts or nav.ts** — put a line in your PR notes: "Lane B must add `seal`,`mist` to the Palette type + PALETTES array with `seal` default; Lane C must list them in SettingsView." Your CSS must be complete so their additions light up immediately.

### 3b. `catalog/types.ts` — `CatalogEntry` and `Band` (you own; four consumers)
Consumers (read-only): `host/httpVault.ts:6` (Lane D), `types/corePrepared.ts:2`, `shell/home.ts:12` (Lane B — being deleted), `library/switcher.ts:1`. If you change the `CatalogEntry` shape, announce it in PR notes. The content workflow (separate, owns `app/public/vault/__readings.json`) emits objects that must satisfy `CatalogEntry`; keep required fields = `band`, `kind`, `wordCounts` (Lane D's runtime guard in `httpVault.listVaultReadings` skips entries missing these). Do not tighten required fields without flagging.

### 3c. `dict/dictLink.ts` + `dict/dictResolve.ts` (Lane D owns; you consume)
`catalog/catalogView.ts:17-18` imports these read-only for the `tsg-dict-hits` search feature. You may CALL them but not edit them. Lane D is changing the dict origin to be env-driven (`VITE_DICT_ORIGIN`) and adding axis params — you don't need to care about the URL internals, just keep calling the exported resolver.

### 3d. `i18n/strings.ts` (Lane B owns copy)
Any user-visible text your new library states/cards need must be requested from Lane B as new `Strings` keys (EN+VI). Do NOT hardcode English copy in catalogView. For this pass, use `t(locale, key)` / `tKey(key)` for labels. If you need a key that doesn't exist yet, add a TODO comment `// LANE-B-KEY-NEEDED: <proposed.key>` and use a temporary literal so tsc stays green; list all such keys in PR notes so Lane B lands them. (`tKey` returns the raw key string on a miss — see trap T9 — so never ship a bare `tKey("x")` for a key that isn't in the table.)

### 3e. `library/switcher.ts` (Cmd-K) — shared with Lane B
Lane B owns the ⌘K *grouping/one-search* behavior (readings + dict + facet-jumps). YOU own the library-list search *ranking* (Task A4). Keep the switcher's exported mount signature stable; coordinate in PR notes. If the split is ambiguous, ranking logic (exact-title > title-prefix > word-match) lives in your catalog search path; Lane B wires the switcher UI.

---

## 4. Your tasks

Each task cites its source requirement item number for traceability. Build all of them.

### A1 — Add `seal` + `mist` RAW palette blocks; make `seal` the default *(item 33)*
In `tokens.css`, move the bare `:root,` selector prefix off the silk-light block and onto the seal-light block. Add four new RAW blocks **verbatim** (these are the source of truth; do not "improve" values):

```css
/* ===== RAW PALETTE — 朱 SEAL-RED (default / hero · 印泥 cinnabar), LIGHT ==== */
:root,
:root[data-palette="seal"][data-theme="light"]{
  --raw-bg:#FBFAF8; --raw-bg2:#F4F2ED; --raw-card:#FFFFFF; --raw-rule:#EAE7DF;
  --raw-rule-strong:#DAD6CB;
  --raw-ink:#23201A; --raw-ink2:#5C564B; --raw-faint:#8C8678;
  --raw-violet:#C23A2A; --raw-violet-soft:#F7EEEA; --raw-violet-edge:#E7D3CC;
  --raw-on-violet:#ffffff;
  --raw-hv:#3C4DA0; --raw-py:#41539C;
  --raw-new:#B23A6A; --raw-learning:#B8822C; --raw-jade:#2F8F6F;
  --grad:linear-gradient(135deg,#C23A2A 0%,#cf4533 60%,#d85740 100%);
  --shadow:0 8px 26px rgba(35,30,22,.07);
  --shadow-sm:0 1px 3px rgba(35,30,22,.05);
  --shadow-pop:0 16px 48px rgba(30,24,16,.12);
  --halo:rgba(194,58,42,.03);
  --tsg-ui:#4D4639; --tsg-on-ui:#FBFAF8;
  color-scheme:light;
}
/* ===== 朱 SEAL-RED, DARK ================================================= */
:root[data-palette="seal"][data-theme="dark"]{
  --raw-bg:#17110B; --raw-bg2:#1F1810; --raw-card:#241C13; --raw-rule:#352A1D;
  --raw-rule-strong:#46392A;
  --raw-ink:#EDE4D5; --raw-ink2:#B4A892; --raw-faint:#8B7F6B;
  --raw-violet:#E0664E; --raw-violet-soft:#2E1A13; --raw-violet-edge:#5C362A;
  --raw-on-violet:#17110B;
  --raw-hv:#9FB0EE; --raw-py:#9FB0EE;
  --raw-new:#E08AA9; --raw-learning:#E0AD5B; --raw-jade:#54C79E;
  --grad:linear-gradient(135deg,#E0664E 0%,#e8755c 60%,#ef836a 100%);
  --shadow:inset 0 1px 0 rgba(255,255,255,.03),0 8px 26px rgba(0,0,0,.5);
  --shadow-sm:inset 0 1px 0 rgba(255,255,255,.03),0 2px 8px rgba(0,0,0,.4);
  --shadow-pop:0 18px 54px rgba(0,0,0,.6);
  --halo:rgba(224,102,78,.10);
  --tsg-ui:#D2C9BB; --tsg-on-ui:#1B1610;
  color-scheme:dark;
}
/* ===== ALTERNATE — 霧 MIST (cool light grey · seal accent), LIGHT ======== */
:root[data-palette="mist"][data-theme="light"]{
  --raw-bg:#F8F9FA; --raw-bg2:#EEF0F2; --raw-card:#FFFFFF; --raw-rule:#E3E6EA;
  --raw-rule-strong:#D2D7DD;
  --raw-ink:#23272E; --raw-ink2:#586069; --raw-faint:#8B919B;
  --raw-violet:#C23A2A; --raw-violet-soft:#F2EEEC; --raw-violet-edge:#E2D6D2;
  --raw-on-violet:#ffffff;
  --raw-hv:#3C4DA0; --raw-py:#41539C;
  --raw-new:#B23A6A; --raw-learning:#B8822C; --raw-jade:#2F8F6F;
  --grad:linear-gradient(135deg,#C23A2A 0%,#cf4533 60%,#d85740 100%);
  --shadow:0 8px 26px rgba(30,35,42,.07);
  --shadow-sm:0 1px 3px rgba(30,35,42,.05);
  --shadow-pop:0 16px 48px rgba(24,28,34,.12);
  --halo:rgba(194,58,42,.025);
  --tsg-ui:#454B54; --tsg-on-ui:#F8F9FA;
  color-scheme:light;
}
/* ===== 霧 MIST, DARK ===================================================== */
:root[data-palette="mist"][data-theme="dark"]{
  --raw-bg:#101316; --raw-bg2:#161A1E; --raw-card:#1B1F24; --raw-rule:#282D33;
  --raw-rule-strong:#363C44;
  --raw-ink:#E7EAEE; --raw-ink2:#A2AAB4; --raw-faint:#79818B;
  --raw-violet:#E0664E; --raw-violet-soft:#2A1A16; --raw-violet-edge:#56352D;
  --raw-on-violet:#101316;
  --raw-hv:#9FB0EE; --raw-py:#9FB0EE;
  --raw-new:#E08AA9; --raw-learning:#E0AD5B; --raw-jade:#54C79E;
  --grad:linear-gradient(135deg,#E0664E 0%,#e8755c 60%,#ef836a 100%);
  --shadow:inset 0 1px 0 rgba(255,255,255,.03),0 8px 26px rgba(0,0,0,.5);
  --shadow-sm:inset 0 1px 0 rgba(255,255,255,.03),0 2px 8px rgba(0,0,0,.4);
  --shadow-pop:0 18px 54px rgba(0,0,0,.6);
  --halo:rgba(224,102,78,.08);
  --tsg-ui:#CBD2DA; --tsg-on-ui:#13171B;
  color-scheme:dark;
}
```

The semantic `:root{--tsg-*}` mapping block (currently tokens.css:197-213) is UNCHANGED — same `--tsg-accent:var(--raw-violet)` etc. mappings and font stacks. Do not edit it.

### A2 — Add `--tsg-ui` / `--tsg-on-ui` to the six existing palette blocks *(item 33)*
The new neutral UI-emphasis pair is used by the `.sw.on` swatch ring and topic-chip `.on` fallbacks. Add these two custom props to each existing `data-palette` block (light and dark). Values:

| palette | light `--tsg-ui`/`--tsg-on-ui` | dark `--tsg-ui`/`--tsg-on-ui` |
|---|---|---|
| silk | `#4A463D`/`#FBFAF7` | `#C8C3B8`/`#14130F` |
| celadon | `#45504A`/`#F6F8F6` | `#B5C4BA`/`#101512` |
| sumi | `#454852`/`#F8F8FA` | `#B8BCC8`/`#0F1014` |
| navy | `#4C4F69`/`#ffffff` | `#8BA3C4`/`#000610` |
| mauve | `#574669`/`#ffffff` | `#C2ADD9`/`#0a0512` |
| loom | `#5A554C`/`#F4F1EB` | `#A39E92`/`#16161A` |

Seal/mist already carry their `--tsg-ui` pair in the A1 blocks. So all eight palettes × light/dark define the pair.

### A3 — Seal-red port of ALL app CSS via the two-layer token system *(item 34)*
Sweep `tokens.css`, `base.css`, `catalog.css` so that **no hardcoded color literal** remains in a rule that should be palette-driven; everything reads through `--raw-*` / `--tsg-*`. The palettes carry the color; the CSS references tokens. Establish/maintain a grep bar: no NEW hex/rgb/oklch literals in rule bodies except inside the RAW palette blocks themselves and the topic-hue block (Task A5). Reader CSS stays untouched beyond A7. Run the palette matrix (all 8 × light/dark) and spot-check the worst contrast pair per palette for legibility.

### A4 — Library search ranking + kill the O(n)/serial-shard scan *(item 14)*
The library title/word search must rank **exact title > title prefix > word match**, verified at wave-1 catalog scale. Kill the serial 15-shard load + O(n) linear scan in the search path (parallel shard fetch, or a prebuilt in-memory index built once on mount). Ranking logic lives in your catalog/library search path; the dict-character shard fetch is Lane D's `dictResolve` (call it, don't reimplement). Add ranking-assertion tests and record measured before/after examples in the PR. (Coordinate switcher UI with Lane B — see §3e.)

### A5 — Build the library layout from the mockup *(items 10, 35-library-render, 42)*
Render the library surface in `catalogView.ts` + `catalog.css` to match the Seal-red mockup. **This is the surface users see as the home/library.** Structure inside `<div class="wrap lib">`:

`continue strip → controls bar → topic rail → #galleryView (recBlock + #topicSections) → #tableView (hidden) → .lib-note`

Add the per-topic hue block (page-scoped) verbatim:
```css
:root{
  --t-food:oklch(.62 .105 55); --t-travel:oklch(.58 .085 205);
  --t-work:oklch(.56 .10 278); --t-family:oklch(.60 .11 8);
  --t-nature:oklch(.57 .10 150); --t-city:oklch(.55 .05 280);
}
```
Topic data keys `food/family/city/travel/work/nature`, each `{zh, en, vi, v:"var(--t-*)"}`; render order `["food","family","city","travel","work","nature"]`. The hue is injected as inline `style="--tc:var(--t-food)"` on chips, cards, section wrappers, table group rows; all topic-tinted CSS reads `var(--tc)`.

**Continue strip** `.lib-continue` — woven `::before` cinnabar edge (repeating 45deg gradient), `.cont-eye` pulsing dot, `.cont-title .zh`/`.rom`, `.cont-meta` chips, `.cont-prog i` width = inline % from real progress. Use the existing continue/up-next logic already in the catalog module; wire real "resume" target. CSS verbatim from spec §2 `.lib-continue` block.

**Controls bar** `.lib-controls` — `#forLevel` toggle (`.lib-toggle.on`, `aria-pressed`, `✓` in `.sw-ck`), `#audioOnly` toggle, `#sortSeg` (`.lib-seg`, label "Sort" + buttons `data-sort="fit|new|short"`), `.lib-search` input (`data-ph-en`/`data-ph-vi` placeholders swapped by rail), `.lib-spacer`, `#viewSwitch` (`data-view="gallery|table"`, glyphs ▦/▤). CSS verbatim from spec §2 `.lib-controls`…`.view-switch` block.

**Topic rail** `.topic-rail` — an "All interests" chip `data-topic="all"` (no `--tc`), then one chip per topic with `.zh`/`.en`/`.ct` count. `.on` state falls through `var(--tc, var(--tsg-ui, var(--tsg-accent)))` so the neutral "All" chip tints with `--tsg-ui`, not accent-red. **Per-topic counts use `pass(r, ignoreTopic=true)`** — counts reflect level/audio/search filters but NOT topic selection, so they stay stable while switching topics. CSS verbatim from spec §2 `.topic-rail`…`.topic-chip.on .ct`.

**#recBlock** ("In your band") — shown only when `state.topic==="all" && !state.q.trim()`; contents = `sortList(R.filter(r => r.rec && (!state.audio || r.audio)))` sliced to 6, rendered with the same card as sections; horizontal 300px-column scroller. CSS verbatim `.rec-block`…`.rec-scroller` block.

**#topicSections** — one `.topic-sec` per topic (with `style="--tc:…"`), each `.topic-sec-head` (zh/en/count) + `.topic-grid` of cards. Empty state `.lib-empty`: "No readings in this band. Turn off **For my level** or clear the search." CSS verbatim `.topic-sec`…`.lib-note` block.

**JS behavior model** (port from vanilla to your TS; granular DOM update is fine, no need for full innerHTML rebuild):
- `state = {view:"gallery", topic:"all", forLevel:true, audio:false, sort:"fit", q:""}`.
- `pass(r, ignoreTopic)`: audio filter → forLevel filter (`forLevel && status==="stretch"` → out) → topic filter (skipped when ignoreTopic) → search: haystack = `zh + rom + nw.flat()` lowercased substring.
- `sortList`: `short`→`mins asc, cov desc`; `new`→`added desc`; `fit` (default)→`status "in"` first then `cov desc`.
- Rail switch re-renders (labels via rail); `syncSearchPh()` swaps placeholder from `data-ph-en`/`data-ph-vi` + aria-label.
- Card/row click delegated via `[data-go="1"]` → navigate to reader.
- Toggles keep `aria-pressed` + `.on` in sync.

**Table view** `#tableView` (secondary, `hidden` by default): `.lib-table-wrap > table.lib-table`, 9 cols (Reading/Topic/Level/Coverage/New/Binding/Length/Audio/Status). Sticky thead `top:55px`; `tr.grp` group rows carry `--tc` inline; coverage cell `.t-cov .bar`/`.bar i` (`.stretch`→`--tsg-st-l1`), width inline; `.t-status.in`→jade, `.stretch`→amber; row hover tint; mobile `.lib-table{min-width:900px}` inside `overflow-x:auto`.

### A6 — Card variants: study A (excerpt hero) + study C (graded/ring hero) *(item 42)*
Build both card renderers. **Free Reading wall cards = study A** (excerpt-as-hero, real ruby, status underlines). **Companion set cards = study C** (pedagogy-as-hero: ring + new-word chips) — the companion shelf itself is Task A9. Study B (watermark cover) is CUT — do not build it.

Shared card CSS (coverage ring, nwchip, metaline, read-aff) verbatim from spec §3. **Coverage ring mechanism:** `--pct` is a unitless number set inline (`style="--pct:91"`); arc = `conic-gradient(known-color calc(var(--pct)*3.6deg), remainder 0)`; donut hole = `::before inset 5px` filled `--tsg-surface`; centered label = absolutely-positioned `<span>91<small>%</small></span>`. No SVG, no JS.

**Study A `.rcA`** — `.top` (title zh/rom + band chip) → `.excerpt` (`.prose` reader-styled rubies with `.w.known/.learning/.new/.nw` classes reusing base.css:69-99, `::after` fade + `.more` "…" cut-off affordance) → `.foot` (cov %, new count, metaline bind/mins/🔊, `.read-aff` "Read →" on hover). rt lang follows rail (`:root[data-rail="en"] rt{color:var(--tsg-py)}`). CSS verbatim spec §3 study A block.

**Study C `.rcC` — use the PRODUCTION-TUNED variant** (library.html:511-554), which supersedes the study version:
- `.cring` 52px, label `font-size:15px`; stretch variant `.cring.st` with `--tsg-st-l1` arc and 48% remainder mix.
- `.rcC` padding `16px 17px 15px`; title `.zh` 21px with `white-space:nowrap;overflow:hidden;text-overflow:ellipsis` (`.rc-title{min-width:0}`); `.learn` padding `11px 12px`; `.excerpt-min` `margin-top:11px`, color `--tsg-muted` with `.k{color:var(--tsg-faint)}` (inverted vs study) and `.excerpt-min .nw` underlined with `--tsg-st-new`; `.foot` gets `flex-wrap:wrap`.
- **`.nwchip` is rail-aware:** `.r` holds BOTH `<span class="v">sinoViet</span><span class="p">pinyin</span>`; default (VI) shows `.v`, hides `.p`; `:root[data-rail="en"] .nwchip .r .v{display:none}` + `… .r .p{display:inline}`. Chip `.z` 17px, `.r` 10px, border-mix 28%.
- Card root gets `data-go="1"` + inline `style="--tc:var(--t-topic)"`; foot = `.rc-topic` pill + `.metaline` + `.read-aff`.

Reading record shape the cards consume: `{zh, rom, romVi, topic, band, tocfl, bind, mins, audio, cov, newN, status:"in"|"stretch", rec, added, nw:[[hanzi,sinoViet,pinyin]×3], ex:html}`. Map from real `CatalogEntry` fields; where a field is absent, degrade gracefully (no crash, no "undefined" on screen).

### A7 — Reader-CSS swatch tokens (the ONLY reader.css edit you may make) *(items 33, mockup §4/§6)*
In `reader.css` near line 54-55:
- Change `.sw.on{border-color:var(--tsg-accent)}` → `.sw.on{border-color:var(--tsg-ui,var(--tsg-accent))}`.
- Add the two new swatch gradient rules so the topnav palette swatches render:
  ```css
  .sw[data-p="seal"]{background:linear-gradient(135deg,#FAF5EC 0 50%,#C23A2A 50% 100%)}
  .sw[data-p="mist"]{background:linear-gradient(135deg,#EEF0F2 0 50%,#C23A2A 50% 100%)}
  ```
Nothing else in reader.css.

### A8 — Library states + demo-mode banner + dict-hits + up-next CSS *(items 10, 11, 12)*
- **Loading skeleton** state, **empty-catalog** state (with a cause line, e.g. "no readings published yet"), **no-results** state (with a facet/search reset affordance). All token-native so the design pass restyles rather than rebuilds. One test per state.
- **Demo-mode banner:** whenever `FIXTURE_CATALOG` renders (see trap T4), show a visible "demo content" banner. Zero undeclared-fixture paths — a user must never see fixture cards silently presented as real content. (This is umbrella §5 burn-down item "fixture cards 404 silently".)
- **`.tsg-dict-hits` CSS** + loading-skeleton CSS + up-next-hint CSS must exist in the token system (currently referenced by `catalogView.ts:318-338` but unstyled). Verify dict hits render styled in search results across all palettes.

### A9 — Companion shelf (Book→Lesson spine) *(item 41)*
Create a new module under `app/src/library/` for the Companion shelf: a Book→Lesson spine over the 46 lessons, where each lesson set card = **study C** (pedagogy-as-hero: 3 articles, union-coverage badge). The coverage guarantee (union of the 3 articles = 100% of the lesson's vocab+grammar) is the promise the card sells. Data comes from the content workflow's `LessonBinding` metadata on `CatalogEntry` (grouped by book/lesson). **Grammar content is LINK-ONLY** — the companion card/lesson view links out to the dictionary's grammar pages; it never renders an in-app grammar list (that data is deliberately unpublished). Test: shelf renders the spine + coverage badge from real coverage data.

### A10 — Facet → URL hash round-trip *(item 13)*
Pin the facet/URL-hash round-trip with a test: set facets → serialize to URL hash → parse in a fresh mount → identical view. `facets.ts` already has `applyFacets` + a hash round-trip (facets.test.ts asserts lossless); extend/confirm it survives the new library state (topic + level + audio + sort + search where those belong in the URL). Keep it lossless.

### A11 — Remove dead facet imports/re-exports (your files only) *(item 15)*
Remove dead facet imports/re-exports in `catalogView.ts:6-7` and `library/LibraryView.ts`. **`main.ts:15`** also has a dead facet import but that file is **Lane B's** — flag it in PR notes, do not edit it. Lint + tsc green after.

### A12 — Fixture composition guard *(items 11, T4)*
`catalog/fixtures/catalog.ts` is currently what users SEE (see trap T4). `catalogView.test.ts`/`coverage.test.ts`/`facets.test.ts` assert fixture composition. Keep the fixture set satisfying those assertions: ≥2 bands, ≥1 ACCC-bound entry, ≥1 unbound entry, the A2+book4 deep-link entry, per-band counts (tests assert per-band counts are shown, never a grand total). When you restyle, do not break these invariants.

---

## 5. Booby traps (things that will silently break you)

- **T4 — Fixture fallback is LIVE right now.** `main.ts:98-101` (Lane B) falls back to `FIXTURE_CATALOG` when the manifest is empty OR every entry lacks `band`. Today `app/public/vault/__readings.json` has 1 entry, 0 with `band`, so **the app shows the fixture catalog**. Your edits to `fixtures/catalog.ts` change the visible product. This is why Task A8's demo banner matters. (The real fix to the *trigger* — validity vs length — is Lane D/B; you own the fixture content + banner UI.)
- **T8 — `tokens.test.ts` pins byte-exact CSS.** No space after `:` in `--tsg-accent:var(--raw-violet)`; `--raw-violet:#6B4BD6` still expected in the silk block; `base.css` must keep `.w.nw`, `var(--raw-violet-soft)`, `:root[data-rail="en"] rt`, and NO `background` property inside any `.tsg-status-*` rule (status is underline-only). A format pass breaks all of this. You are updating this test for new palettes — do so surgically.
- **T2 — Double-emit router.** The router re-fires onChange on both nav-click and native hashchange. All render must be **idempotent** — clear before you append; never `appendChild` without first clearing, or the library double-renders.
- **T6 — `coupling.test.ts` scans every lane's files.** It bans the substring `#/encoding` in ALL non-test `app/src` `.ts`. Don't add an `#/encoding` href anywhere.
- **T9 — `tKey` silent-miss.** A missing key renders the raw key string (e.g. `catalog.empty`) on screen and won't fail tsc. Only add `tKey`/`data-i18n` references for keys Lane B has landed; otherwise use the `// LANE-B-KEY-NEEDED` pattern from §3d.
- **`--tsg-*` semantic tokens are the API.** `--tsg-accent`, `--tsg-ink`, `--tsg-surface`, `--tsg-sunk`, `--tsg-border`, `--tsg-border-strong`, `--tsg-muted`, `--tsg-faint`, `--tsg-st-known`/`--tsg-st-new`/`--tsg-st-l1` (status colors), `--read`/`--ui`/`--display` (font stacks), `--shadow`/`--shadow-sm`/`--shadow-pop`, `--halo`. The mockup CSS already speaks this vocabulary; keep using it.

---

## 6. Acceptance checks (an integrator will run these)

1. `pnpm typecheck` → exit 0.
2. `npx eslint app` → exit 0 (root `pnpm lint` will still show mockups/workflows errors — NOT yours).
3. `pnpm test` → green, including your updated `tokens.test.ts`, `catalogView.test.ts`, `coverage.test.ts`, `facets.test.ts`, plus new tests for: each library state (loading/empty/no-results), search ranking (exact>prefix>word), companion shelf render + coverage badge, facet hash round-trip.
4. `pnpm build` → green.
5. **Behavior:** with `data-palette="seal"` default, the app renders cinnabar-red; all 8 palettes × light/dark render legibly; the library shows continue strip + controls + topic rail + rec block + topic sections; topic counts stay stable when switching topics; cards A and C render with correct ruby/ring; demo banner appears whenever fixtures render; search ranks exact-title first.
6. **Grep bar:** no new hardcoded color literals outside RAW palette blocks + the topic-hue block.

---

## 7. Umbrella §5 defects you must burn down

- "fixture cards 404 silently" → Task A8 demo banner + declared fixtures.
- `tsg-dict-hits` referenced but unstyled → Task A8.
- serial 15-shard load + O(n) library scan → Task A4.
- dead facet imports/re-exports in your files → Task A11.

## 8. You must NOT do

- Do NOT edit `settings.ts`, `nav.ts`, `main.ts`, `router.ts`, `strings.ts`, `staticPages.ts`, `home.ts`, `seo/meta.ts` (Lane B), any `store/`, `auth/`, `account/`, `settings/SettingsView.ts`, `config/features.ts` (Lane C), any `pwa/`, `dict/`, `build/`, `host/httpVault.ts`, `config/site.ts`, `vite.config.ts`, `scripts/` (Lane D).
- Do NOT touch `reader.css` beyond Task A7's two edits, nor any `reader/` or `voice/` file.
- Do NOT touch forbidden paths (`mockups/`, `app/public/vault/`, `scripts/companion/`, `out/companion/`, `docs/companion/`).
- Do NOT add server/Worker code.
- Do NOT run a formatter over CSS.
- Do NOT render an in-app grammar list on the companion shelf (link-only to dict grammar pages).

## Amendments — 2026-07-02 sign-offs (binding; read before starting)

1. **Companion lesson grammar PUBLISHES the extracted list** (Wedge signed, supersedes this WO's link-only default): the Companion lesson view renders the per-lesson grammar-point list AND links each point to its tsumugu-ed `g/` page. Data arrives as `app/public/vault/companion-lessons.json` (emitted by the content workflow's publish step — you consume it read-only; shape: `{unit, title, theme, grammar: [{name, edSlug?}]}` per lesson; render gracefully when absent).
2. The content converter/gate/manifest ALREADY EXIST (`scripts/companion/`, `out/companion/` — forbidden paths). A separate publish step fills `app/public/vault/` with ~40 real readings now, rising to 72 after a content sweep. Build the library against the real `CatalogEntry` manifest shape; keep the demo banner for the fixture path.
3. Card studies: A = Reading Wall cards, C = Companion lesson-set cards (per umbrella §3, unchanged).
