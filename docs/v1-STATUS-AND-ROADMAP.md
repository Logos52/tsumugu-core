# Tsumugu Core — v1 Status & Roadmap

Living status doc. Scope: **tsumugu-core only**. Last updated 2026-06-26.
State at this writing: cohesive and green — `typecheck` + 149 tests + `lint` + `build` all pass.
Background: [`docs/journal/2026-06-25-v1-cohesion-pass.md`](journal/2026-06-25-v1-cohesion-pass.md),
[`docs/COHESION-AUDIT-2026-06-25.md`](COHESION-AUDIT-2026-06-25.md).

---

## ✅ DONE — built, wired, green

**Reader (WO-CORE-2)**
- Token-by-token reader over PreparedContent; ruby readings; click-to-open def + form popup
  with lookup-is-capture and dict tap-out to tsumugu-ed.
- Dual-rail substrate: `data-*` toggles for script (繁/简), reading (pinyin/zhuyin/Hán-Việt),
  gloss (EN/VI), rail (EN/VI). Switching rail re-bakes reading + gloss defaults.
- Known-state coloring on the `"1".."4" | known | ignored` model; keyboard grading; responsive
  breakpoints (rail hides ≤980px, prose shrinks ≤720px).

**The VI moat (WO-CORE-4)**
- Sino-Vietnamese cognate bridge renders on the VI rail (morpheme cogs + shared-reading
  highlight); EN-rail phonetic-series note. (Restored 2026-06-25.)
- Dictionary linkage: def / Hán-Việt / form resolved from bundled tsumugu-ed shards; deep-link
  out carrying the rail axes.

**App shell**
- Hash router over 11 surfaces, all nav-reachable; persistent TopNav (rail / palette / theme);
  footer language toggle; EN/VI i18n applied per surface; per-rail SEO title/description/lang.

**Library / catalog (WO-CORE-5, view layer)**
- Faceted, hash-routed browser: named rungs, level/kind/topic/binding/audio facets, search +
  sort, coverage badges, continue / up-next, ⌘K command switcher. *(Functional; design unreviewed — see To Do.)*

**Content in / out**
- Paste importer (WO-CORE-6): client-side paste → jieba → gloss → render, no-network verified.
- QA gate (WO-CORE-1): `reading_checks` A–H fail-closed + CLI.
- Generation pipeline (WO-CORE-3): generate → critique → repair + ACCC lesson-target &
  grammar-index. Built + unit-tested; **no live content wave run yet.**

**Platform (WO-CORE-7)**
- PWA service worker + precache, env-gated cookieless analytics, sitemap, read-only httpVault,
  single origin config. Local WordStore (localStorage) for progress + coloring.

**Design system (partial)**
- Six palettes (silk / celadon / sumi / loom / navy / mauve), light/dark, two-layer tokens.
  Reader design locked to Silk-Seam (`mockups/reader-house-silk.html`).

**Scope hygiene**
- Phase-2 layer (accounts, voice, flashcards, grammar, encoding modal) gated OFF in
  `app/src/config/features.ts`, kept in tree, unmounted, hidden from nav.

---

## 👀 REVIEW — needs your eyes / a decision

Run it first: `pnpm dev` → http://127.0.0.1:5173. Walk the reader, the VI bridge (switch to VI
rail, tap a word), the home landing, and the library.

1. **Word-status model.** Composer moved to LingQ-style `1..4 | known | ignored` (1 = New,
   strongest; number-key grading). It's now everywhere. Confirm you like it vs. the old `l1..l4`.
2. **Phase-2 cut.** Confirm the gated list (accounts, voice, flashcards, grammar, encoding modal)
   is the right v1 boundary — or pull one in / push one out.
3. **The Library shows fixtures, not real content.** The published manifest is a 1-reading smoke
   sample, so the catalog falls back to demo fixtures until a content wave runs. Expected, but know it.
4. **Cognate bridge render.** Eyeball it on the VI rail — it's the moat; it should feel right.
5. **Default rail.** Persisted default is `en`; the mockup demoed `vi`. Pick one.
6. **Default palette.** Silk-Seam is the judge pick from the kickoff but never confirmed by you.
7. **Settings panel** currently lives inside the (gated-off) Account surface, so it's hidden in v1.
   The nav still has palette / theme / rail. Decide: pull Settings into its own surface, or leave.
8. **Domain + analytics.** Domain still open (rec `tsumugu.study`); analytics is a CF dashboard toggle.
9. **Engine migration commit** (out of tsumugu-core, but blocks a clean tree): 38 green WordStatus
   files are uncommitted in the public `tsumugu` repo — stage just the `.ts/.css` and decide on push.

---

## 🔨 TO DO — work to schedule

### ★ Design review & pass *(your call-out)*
The **reader** is the only surface with a locked design (Silk-Seam). Home, library, the footer
pages, and the global chrome (TopNav, palette switcher, footer) have not had a unified design pass.
- Bring every surface to the Silk-Seam / House language; settle the default palette.
- The mockups in `mockups/` cover the reader only — home / library / static pages need design.
- Audit the chrome: TopNav density, palette switcher, footer, mobile layout of each surface.

### ★ Front-facing webpages *(your call-out)*
`app/src/shell/staticPages.ts` renders a bare `h2` + one body block; about / privacy / feedback
bodies come from thin i18n strings; colophon / method are short inline copy.
- Write real copy (EN **and** VI) for **about · privacy · feedback · colophon · method**.
- Add the home landing copy: value props, the dual-rail pitch, the "why it's free" framing
  (kept out of the monetization-private notes), CTAs into the reader / library.
- These are the public face — they carry the trust + SEO story, so they want real design too.

### ★ Library design *(your call-out)*
Functional but unreviewed. Go over:
- Reading Wall layout: rungs, per-band counts, coverage badges, card density.
- Empty / loading / no-results states (today it silently falls back to fixtures).
- The `tsg-dict-hits` block renders markup with no matching CSS (audit §3 polish).
- Facets → URL, search ranking, continue / up-next surfacing, mobile.

### Content & pipeline
- **Content wave**: generate + QA + publish the ~150-reading catalog, plus a manifest emitter
  that writes a full `CatalogEntry[]`. Until then the Library is demo fixtures.
- **Gen → publisher seam**: generator writes `out/readings/`, publisher reads
  `app/public/vault/readings/zh-Hant/`; `CoreMetadata` shape ≠ `CatalogEntry`. Reconcile.
- **Metered-API collision**: the gen pipeline wants `ANTHROPIC_API_KEY` — conflicts with the
  no-metered-API rule. Decide the generation path (own/subscription/local model).

### Polish tail
- Dict rail-param carry-over: tsumugu-ed doesn't read the `?s=&r=&g=` axes core appends.
- PWA: JSON readings / dict-search shards aren't precached; dict-search path is absolute.
- Dead-export / dead-dir cleanup (empty `render/`, unused helpers — audit §3 polish).
- Mobile responsive verification across all surfaces (desktop-first, responsive down).

---

## Pointers
- Feature flags: `app/src/config/features.ts`
- Reader design: `mockups/reader-house-silk.html`; palettes: `app/src/styles/tokens.css`
- Front pages: `app/src/shell/staticPages.ts` + `app/src/i18n/strings.ts`
- Library: `app/src/catalog/catalogView.ts`, `app/src/library/LibraryView.ts`, `app/src/styles/catalog.css`
- Full defect worklist: `docs/COHESION-AUDIT-2026-06-25.md` §3
