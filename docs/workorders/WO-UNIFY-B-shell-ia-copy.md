# WO-UNIFY-B — Shell + Information Architecture + Copy (library-as-home, nav rework, front-facing copy)

**Repo:** `/Users/n1/Projects/tsumugu-core` · **App source:** `app/src` · **Package manager:** pnpm@11.5.1
**You are one of four parallel implementation agents.** You will NOT see the PRDs — this brief is complete and self-contained. Do only your lane's work.

---

## 0. Your mission in one paragraph

Rebuild the app's information architecture around **library-as-home**: kill the standalone Home, Grammar, and Flashcards surfaces; make the library the default `#/` surface; rework the top nav and footer to the Seal-red shell chrome; fold the colophon + method pages into About; wire the first-run hero + EN/VI rail chooser; and write the full front-facing copy (EN + VI) for the hub, About, Privacy, and Feedback with zero placeholder stubs. You own the shell, router, main.ts boot, i18n strings, SEO meta, and the hover/popup chrome. You do not touch styling tokens (Lane A), store/sync (Lane C), or platform/dict/build (Lane D).

---

## 1. Hard rules (apply to every task)

- **Strict file ownership.** Edit ONLY the files in §2. If a task seems to need another lane's file, describe the seam in PR notes instead.
- **Forbidden paths for ALL lanes (never touch):** `scripts/companion/`, `out/companion/`, `docs/companion/`, `mockups/`, `app/public/vault/`. You may READ `mockups/site/*.html` as design reference (this brief already extracts the shell/hero markup + CSS you need).
- **Reader CSS is locked.** Do not touch `app/src/styles/*.css` — that is Lane A's. If the shell chrome needs a CSS token that doesn't exist, request it from Lane A in PR notes; do not add CSS yourself.
- **No server code, no store internals, no build config.** Those are Lanes C/D.
- **Lint gate:** root `pnpm lint` errors on Wedge WIP under `mockups/` + `workflows/` — NOT your regression. Gate on `npx eslint app` (exit 0) + `pnpm typecheck` + named tests.
- **Idempotent renders only.** The router double-emits (trap T2). Every onChange branch must clear-then-render; never append without clearing.

---

## 2. Files you OWN (edit freely)

```
app/src/main.ts                  (493 ln — boot + all surface mounting)
app/index.html                   (mount contract: ids topnav/surface/reader-host/catalog/prose/app-footer/card/scrim; static VI/EN copy)
app/src/app/router.ts + router.test.ts
app/src/app/chrome.ts, persist.ts, settings.ts, state.ts, toggles.ts
app/src/shell/nav.ts
app/src/shell/home.ts + home.test.ts   (DELETE/orphan — Task B4)
app/src/shell/staticPages.ts
app/src/i18n/strings.ts          (787 ln — two typed tables + legacy flat map)
app/src/seo/meta.ts + meta.test.ts
app/src/hover/wordPopup.ts + wordPopup.test.ts
app/src/prefs/prefs.ts + prefs.test.ts   (deprecated re-export shim — keep, do NOT delete; see trap T5)
app/src/encoding/EncodingModal.ts        (write access to orphan when killing routes; stays GATED — do not un-gate)
app/src/flashcards/FlashcardsView.ts     (DELETE — Task B6)
app/src/grammar/GrammarView.ts           (DELETE — Task B7)
app/src/library/switcher.ts              (Cmd-K UI — co-owned with Lane A; see §3f)
```

You may create new files under `app/src/shell/` or `app/src/hub/` for the new hub surface.

---

## 3. Shared seams — what you expose, what you may assume

### 3a. `app/settings.ts` — you own the `Palette` type, `ReaderSettings`, `STORAGE_KEY`
The `Palette` union type lives at `settings.ts:4`. **Lane A is adding two palettes (`seal`, `mist`) and `seal` is the new default.** YOUR job: extend the `Palette` type to `… | "seal" | "mist"`, put `seal` first / as the default value the boot picks, and add `seal` + `mist` to the `PALETTES` array + `PALETTE_LABELS` in `nav.ts:22-30` (labels: seal = "朱 Seal-Red", mist = "霧 Mist"). Lane A supplies the matching CSS blocks; Lane C surfaces them in the settings popover. Do NOT define CSS. Consumers of the type (read-only): Lane C's `store/userDoc.ts:17`, `store/userStore.ts:24-25`, `auth/accountView.ts:26-27`, `settings/SettingsView.ts:8-9`; Lane A's `styles/tokens.css` + `tokens.test.ts`; `reader/reading.ts:3`.
**Trap T14 (settings ordering):** `normalizeStored` (settings.ts:51-59) spreads railDefaults BEFORE `...raw` so stored explicit reading/gloss survive; `setRail` (139-144) re-applies rail defaults. `nav.ts` rail buttons ALSO mutate `document.documentElement.dataset` directly (nav.ts:108-111) before `patchSettings` — two writers on the same data-* attributes. Keep both consistent; default rail stays `en` (settings.ts:2).

### 3b. `i18n/strings.ts` — you own all copy; everyone consumes `t`/`tKey`
Everyone imports `t`/`tKey` (router, nav, home, staticPages, seo/meta, catalogView (Lane A), Grammar/Flashcards/SettingsView, accountView (Lane C), importPanel (Lane D)). Other lanes will ask you for new keys (e.g. Lane A needs library-state labels marked `// LANE-B-KEY-NEEDED:`). Land every requested key in BOTH the `EN` and `VI` typed tables (and the interface). **Trap T9:** `tKey` returns the raw key on a miss — deleting a key won't fail tsc for string-typed callers, it renders `nav.home` on screen. Grep every `data-i18n` + `tKey` callsite after removing keys.

### 3c. `app/router.ts` — you own the `Surface` type + hash map
`seo/meta.ts:6` and `shell/home.ts:11` import `Surface` (both are your files). No A/C/D imports. You are removing `home`/`grammar`/`flashcards` from the union.

### 3d. `config/features.ts` (Lane C owns) — you consume `FEATURES` read-only
`main.ts:37,125,170,218,401-408` and `shell/nav.ts:10,61-63,83` gate on `FEATURES`. When you kill grammar/flashcards nav links, the `FEATURES.grammar`/`.flashcards` flags become dead. **Do NOT delete them from features.ts** — that's Lane C's call. Just stop referencing them in your nav template + main branches, and note in PR that the flags are now orphaned for Lane C to dispose. Lane C is ADDING `VITE_FEATURE_SYNC`; the nav's "Sync" entry (Task B2) gates on it — reference `FEATURES.sync` read-only.

### 3e. `build/analytics.ts` `trackEvent` (Lane D owns) — you consume
`shell/home.ts:18` (being deleted) and other spots call `trackEvent`. Keep calling the exported function; don't edit analytics.

### 3f. `library/switcher.ts` (Cmd-K) — co-owned with Lane A
You own the ⌘K **grouping / one-search UI** (readings + dict characters + facet jumps, grouped). Lane A owns the library-list **ranking** logic. Keep the mount signature stable; coordinate in PR notes.

### 3g. `catalog/*` (Lane A owns) — the library render
Lane A builds the library surface (continue strip, controls, topic rail, sections, cards) inside `#catalog` via `mountCatalogView`. YOU wire the router so `#/` mounts the library as the home surface and the hub composes Continue + Companion shelf + Free Reading wall. Call Lane A's exported `mountCatalogView`/`mountLibraryView`; don't reimplement the grid. Coordinate the hub composition seam in PR notes (who renders the Continue strip vs the hub hero).

---

## 4. Your tasks

### B1 — Library-as-home IA *(item 35)*
Make the hub at `#/` the app's home. The hub = **Continue strip** (existing continue/up-next logic) → **Companion shelf** (Lane A's module) → **Free Reading wall** (Lane A's catalog grid). Signed-out first visit shows one hero line + an EN/VI rail chooser (Task B9). Keep the greedy "any band/topic hash → library" router rule but ensure it's now correct (see trap T1). Touch points: `main.ts` (imports, onChange branches, initial-nav default), `router.ts` (Surface union, SURFACE_HASH, surfaceFromHash, fallback). Tests: router pins + hub render.

### B2 — Nav rework *(item 36)*
New top nav: **brand→hub · Continue · Import · ⌘K · 設 popover · Sync**. The 設 popover carries palette / theme / script / reading / gloss / rail (Task B8 wires the popover; the *settings content* moving out of Account is Lane C's SettingsView). **Remove Grammar + Flashcards links.** Mobile nav = brand + ⌘K + hamburger. **The dictionary is never a nav tab** (it's reached via ⌘K + `/c/` links). "Sync" gates on `FEATURES.sync` (Lane C's new flag) — hidden when off. Update `nav.test`.

Use the Seal-red topnav chrome (mockup §4). Brand markup: `<span class="knot">紡</span><span class="word">Tsumugu</span><span class="core">Core</span>`. Rail segment `#railSeg` (VI/EN buttons, `en` default `.on`), palette swatches `.palettes` (seal, mist, then silk/celadon/sumi/loom/navy/mauve), theme toggle `#themeBtn` (☀/☾). Active-page highlight via `:root[data-page="…"] .primary-nav a[data-nav="…"]`. The topnav/footer CSS lives in Lane A's stylesheets — you render the markup + wire the JS; if a class is missing, request it from Lane A.

**Shell JS to wire** (from mockup §4):
- Rail switch: `#railSeg` button click → clear `.on`, set clicked `.on`, `root.dataset.rail = b.dataset.rail`; also reflect into the hero rail chooser `.active` (two-way, Task B9).
- Palette swatch click → `root.dataset.palette = p`; light/dark coercion: navy|mauve force dark when currently light; seal|mist|silk|celadon|sumi|loom force light when currently dark.
- Theme: `setTheme(mode){ root.dataset.theme=mode; themeBtn.textContent = mode==="dark"?"☾":"☀" }`; toggle on `#themeBtn` click.
- All of these must persist via `settings.ts` `patchSettings` (don't just mutate the DOM and lose it on reload — respect trap T14's two-writer note).

### B3 — Footer rework *(mockup §4)*
Render the Seal-red footer `.site-footer > .inner`: `.fbrand` (mini knot + word + Core + tagline) + two `.fcol` columns — "Read" → Home/Library/Reader/Method and "About" → About/Privacy/Feedback/Colophon — + `.legal` ("Preview build." / "紡ぐ (tsumugu): to spin thread."). **Drop the mockup's third "Studies" column.** Note: since Method + Colophon fold into About (Task B5), those footer links point at About anchors, not standalone routes. Wire via the existing `wireAppFooter` on `#app-footer` (nav.ts:219).

### B4 — Kill the Home surface *(item 37)*
Delete `shell/home.ts` (356 ln) + `home.test.ts`, or fully orphan them. Remove the hardcoded sample dashboard and the raw `tsumugu-session` bento gate (named burn-down item). Touch points: `main.ts` home imports (28, 33) + homeCtrl decl/uses (264, 276, 313-334, 471, 478) + `buildDashboardOpts` (130-145) + onChange home branch (308-338) + static-pages `setActive("home")` (390) + initial-nav default (433, → library) + `renderPhase2` text (76-82, contains `href="#home"`); `router.ts` `"home"|""` → home cases (60-62) + final fallback (84, → library) + `SURFACE_HASH`; `router.test.ts:5-9` (rewrite `#home`/`#`/`""` expectations → library); `seo/meta.ts` `SEO_KEYS.home` fallback (line 37 → new fallback e.g. library). **Trap T3:** the `tsumugu-session` key is read by Lane C's `auth/session.ts:148` `isLoggedIn` fallback and written by `userStore.login` — deleting home must NOT orphan-break `session.ts`. Coordinate with Lane C: you remove the *home bento's* dependence on the key; Lane C keeps the key's auth semantics. Grep `tsumugu-session` gone from shell after.

### B5 — Fold colophon + method into About *(item 40)*
Fold the colophon + method routes into the About page in `staticPages.ts` (default). A standalone Method page ships only if Wedge later picks it (§6 item #13) — default is folded. Update `staticPages`/route tests. Remove `colophon`/`method` from the `Surface` union if they no longer have standalone routes (or keep them redirecting to About — pick redirect to avoid dead footer links). Update `seo/meta.ts` SEO_KEYS entries accordingly.

### B6 — Kill FlashcardsView route *(item 38)*
Delete `flashcards/FlashcardsView.ts` (50-line placeholder) + its route. Remove from `main.ts` imports (19-20) + onChange branch (394-413) and `router.ts` flashcards case (67-68) + `router.test.ts:24-26` pins. Anki export re-surfaces in Lane C's Sync panel — you only remove the dead view. Stop referencing `FEATURES.flashcards` in nav (leave the flag for Lane C).

### B7 — Kill GrammarView route *(item 39)*
Delete `grammar/GrammarView.ts` (3 hardcoded SAMPLE_POINTS) + its route (main.ts imports + branch, router.ts grammar case 65-66, router.test grammar pin). Lesson grammar lives in the Companion lesson view (Lane A) as **LINKS to the dictionary's `g/` grammar pages ONLY** — the ACCC lesson-grammar list is deliberately never rendered/published. You just remove the standalone view.

### B8 — Settings into the 設 popover *(item 48)*
Wire the 設 popover in the nav to host the settings controls (palette/theme/script/reading/gloss/rail). The settings *content component* moves out of Account — that's Lane C's `SettingsView.ts` (Account→Sync). YOUR job: the nav trigger + popover shell + mounting Lane C's SettingsView inside it. Coordinate the mount seam with Lane C in PR notes. This is NOT gated — it ships with the nav rework.

### B9 — First-run hero + EN/VI rail chooser *(items 35, 44)*
Build the first-run hub surface (mockup §5). On first visit (no graded words yet), show: hero eyebrow + `.hero-head` + `.hero-sub` + `.rail-chooser` (two `.chooser-btn` cards, VI with the cognate-bridge moat tag, EN with plain-gloss note) + `.hero-ctas` (Start reading / Browse library) + `.free-note`. **Two-way rail sync:** chooser click → `setRail(rail)` sets `root.dataset.rail`, toggles chooser `.active` AND header `#railSeg` `.on`; header rail clicks reflect back into chooser `.active`. The hero markup + semantic-token CSS come from the COMMITTED mockup (spec §5) — all tokens are semantic so they port to Seal unchanged; the app's OLD pill-style `.rail-chooser` in `base.css:186-214` is replaced by Lane A (request it). When the first word is graded, fire a one-time toast: "saved on this device · you can carry it as a file" (hook Lane C's `userStore` first-grade event — call the exported hook, don't edit the store). Test: first-grade toast fires exactly once.

**Hero markup (port to your render):**
```html
<section class="hero">
  <div class="eyebrow">Graded Traditional Chinese · two scaffolding rails</div>
  <h1 class="hero-head">Read real Chinese<br>at your level.</h1>
  <p class="hero-sub">Two rails over the same text. <b>English gloss</b>, or <b>Vietnamese</b> plus the cognate bridge.</p>
  <div class="rail-chooser" id="railChooser">
    <div class="chooser-label">Which rail are you reading on?</div>
    <button class="chooser-btn vi active" data-rail="vi" type="button">
      <span class="ch-tick">✓</span><span class="ch-flag">越 · Tiếng Việt</span>
      <span class="ch-title">tôi học tiếng Trung bằng tiếng Việt</span>
      <span class="moat-tag">+ cầu nối đồng nguyên</span>
    </button>
    <button class="chooser-btn en" data-rail="en" type="button">
      <span class="ch-tick">✓</span><span class="ch-flag">英 · English</span>
      <span class="ch-title">I'm learning Chinese in English</span>
      <span class="ch-note">Plain-English gloss on every word.</span>
    </button>
  </div>
  <div class="hero-ctas"><a class="btn primary" href="reader">Start reading</a><a class="btn" href="library">Browse library</a></div>
  <p class="free-note"><span class="free">Free in preview</span> · $0 · no account — your progress lives in this browser.</p>
</section>
```
(The above English strings must go through i18n per Task B10, with VI counterparts. `data-rail="vi"` is `.active` by default in the mockup, but the app default rail is `en` — make the chooser reflect the actual current rail on mount, not a hardcoded default.)

### B10 — Front-facing copy: full EN + VI, zero stubs *(item 45)*
Write complete copy for hub hero + About (with folded colophon/method content) + Privacy + Feedback in `strings.ts` (both typed tables) + `staticPages.ts`. **Every string ships EN and VI** (VI is an independent writing pass, NOT a machine translation, and must be flagged in PR for native review). Zero placeholder stubs (`grep` for stub markers = 0). Also hit the hardcoded copy OUTSIDE i18n (trap T10): `main.ts:77-81` renderPhase2 text, `main.ts:410` "Surface under construction", `nav.ts:23-30` PALETTE_LABELS, `pwa/register.ts:21` update-banner text (Lane D owns that file — flag it), `import/copy.ts` EN-only privacy/caption (Lane D — flag it), `index.html` static bilingual spans (rail column, card buttons).

**Front-facing writing rules (encode these — they are non-negotiable):**
- The page wants nothing from the reader. Test every line: "what does it want from the reader?" — the only passing answer is *nothing*.
- Complete sentences, one fact each. State made decisions once; cut stacked qualifiers.
- **NO em dashes in site copy.** Rewrite around them.
- No "not X, but Y" / "isn't A — it's B" antithesis framing. Write declaratively.
- Specific beats generic. Names, real numbers, checkable facts — no taglines used as cadence, no mood labels.
- **Every claim must be true against the current tree.** Privacy copy states the real Stage-1 posture: **local-only, cookieless, no accounts, nothing collected.** Do NOT claim offline support (the PWA precache work is Lane D and not yet shipped — no offline claims until it lands). The Stage-2 conditional paragraph (accounts/sync) ships ONLY with the Worker — leave it out for now. Re-verify per-rail SEO meta (Task B11) matches.
- Run a claim audit: every feature/privacy/method sentence checked against `config/features.ts` (flags) and `vite.config.ts` (Lane D) reality.

### B11 — Per-rail SEO meta *(item 45)*
In `seo/meta.ts`, re-verify title/description/html-lang per rail (EN vs VI) for every surviving surface (hub, library, reader, about, privacy, feedback). Remove SEO keys for killed surfaces (home/grammar/flashcards) and fix the fallback (currently `?? SEO_KEYS.home` at line 37 → point at library/hub). `meta.test.ts` asserts title/description/html-lang per rail — keep green.

### B12 — Popup Form placeholder defect *(item 56)*
In `hover/wordPopup.ts:192`, drop the dead `if (formText || true)` → `if (formText)`. The dict shards lack typed form/components fields, so the Form box currently always renders (empty). After the fix, the empty Form box hides. Test: popup hides the empty Form box.

### B13 — Audit tail sweep (your files) *(item 58)*
Wire-or-delete these dead items in YOUR files (lint + tsc must stay green):
- Dead router imports + hidden `__router` singleton: `main.ts:32`, `router.ts:160-179` (the module-level `initRouter`/`navigateTo` façade is unused — `main.ts` builds its own `createRouter()`). Remove the unused façade OR document why kept. (Trap T2: keep renders idempotent regardless.)
- Dead STRINGS block: `strings.ts:769-787` (the `Object.assign(STRINGS, …)` rail-suffixed duplicates — reconcile with typed table; note trap T10, shell/home used these but home is being deleted, so re-home any still-needed hero keys into the typed tables).
- `nav.setActive` type fix (#28).
- Aspirational lazy-load comment `main.ts:80-81` (delete or implement).
- `getCurrentLocale` unused (#46) — delete if truly unused.
- `switcher.open()` discard at `main.ts:148` (#45) — use the return or drop it.
- Account-route blank-overlay `main.ts:343-352` (#29) — MOOT if Lane C's Account panel is absorbed into Sync; coordinate: if the account route is gone, remove the branch; if it becomes the Sync panel, point it there. Confirm with Lane C.
- `wirePaletteSwatches`, `enableThemeExperiment`, `morningConductor` orphan exports (#37) if they live in your files — wire or delete.

---

## 5. Booby traps

- **T1 — Greedy router rule.** `router.ts:54`: any hash containing the substring `"topic"` routes to library (a future `#topics` page gets swallowed). `router.ts:83` default: any unknown hash containing `"band"` or `"="` → library. The `(hash && !hash.startsWith("#") && hash.includes("band"))` clause at :54 is DEAD (hash always starts with `#`). `"home"` is the fallback in TWO places (:61-62 and :84) — your library-default change must hit BOTH + `router.test.ts`.
- **T2 — Double-emit router.** `main.ts` imports the unused module façade (router.ts:161-179) AND builds its own `createRouter()` at main.ts:261. Nav anchors keep real hrefs → a click fires `onNavigate`→`router.navigate` (emit) AND native `hashchange`→`onHashChange` (emit again). All onChange renders MUST be idempotent (clear before append) or you double-render.
- **T3 — `tsumugu-session` bento gate.** `shell/home.ts:182` renders the personal bento only if localStorage `tsumugu-session` exists; written by `userStore.login` (Lane C), read by `session.ts:148`. `userStore.test.ts` pins the exact key name. Deleting home must not break `session.ts` — leave the key semantics to Lane C.
- **T5 — `prefs/prefs.ts` is a deprecated re-export shim.** 25 lines over `app/settings.ts`; `prefs.test.ts` imports through it. **Do NOT delete it.** Route new code to `app/settings.ts`. Renaming `Palette`/`ReaderSettings` breaks both import paths.
- **T9 — `tKey` silent-miss** renders the raw key string on screen; only `shell/home.test.ts:19` guards raw keys (and home is being deleted). Grep `data-i18n` + `tKey` callsites after any key removal.
- **T10 — Duplicate i18n sources.** Legacy flat `STRINGS` (743-787) holds rail-suffixed keys (`home.hero.headline.en`) that shell/home actually used; editing only the typed table won't change those. As home dies, migrate any still-needed hero copy into the typed EN/VI tables.
- **T13 — Boot hard-requires legacy markup.** `main.ts:108` throws "Reader shell markup missing" if `.work`/`#prose` absent. `index.html` ids (topnav/surface/reader-host/catalog/app-footer/card/scrim) are the B↔A contract. `wordPopup`/home reuse `#card`/`#scrim`. Don't remove these ids when reworking index.html.
- **T14 — settings singleton + rail defaults ordering** (see §3a). Two writers on `document.documentElement.dataset` (nav rail buttons + patchSettings). Keep consistent.
- **T6 — `coupling.test.ts` bans `#/encoding`** in ALL non-test `app/src` `.ts` (comments stripped) and bans `splitter/theater/fsVault/dictionaryProvider` in `wordPopup.ts`. Don't add those tokens.
- **T16 — FEATURES are build-time env** (features.ts, `import.meta.env` at module load, default all OFF). Flipping requires rebuild; keep nav template + main branches consistent with the flags Lane C keeps.

---

## 6. Acceptance checks

1. `pnpm typecheck` → exit 0.
2. `npx eslint app` → exit 0.
3. `pnpm test` → green, including rewritten `router.test.ts` (library default, no home/grammar/flashcards), `nav.test`, `staticPages`/route tests, `seo/meta.test.ts`, `wordPopup.test.ts` (empty Form hidden), first-grade-toast test.
4. `pnpm build` → green.
5. **Behavior:** `#/` renders the library-as-home hub (Continue → Companion shelf → Free Reading wall); first visit shows hero + rail chooser; nav shows brand/Continue/Import/⌘K/設/Sync with NO grammar/flashcards/home tabs and no dictionary tab; rail + palette + theme toggles work and persist; colophon/method reachable inside About; direct `#home`/`#grammar`/`#flashcards` hashes route sanely (to library/about, no crash).
6. **Copy:** grep for stub markers = 0; every user-visible string has EN+VI; no em dashes in site copy; privacy copy states local-only/cookieless/no-accounts truthfully with no offline claim; VI flagged for native review in PR.

## 7. Umbrella §5 defects you must burn down

- Home surface (356 ln, hardcoded sample + `tsumugu-session` bento) killed → B4.
- FlashcardsView / GrammarView placeholder routes killed → B6/B7.
- `wordPopup.ts:192` dead `|| true` → B12.
- dead `__router` singleton + dead STRINGS block + orphan exports in your files → B13.
- placeholder/stub copy → B10.

## 8. You must NOT do

- Do NOT edit any `styles/*.css` (Lane A), `catalog/*`, `library/LibraryView.ts`, `fixtures/*` (Lane A) — request classes/keys instead.
- Do NOT edit `store/`, `auth/`, `account/`, `settings/SettingsView.ts`, `config/features.ts` (Lane C) — reference `FEATURES` read-only; don't delete orphaned flags.
- Do NOT edit `pwa/`, `dict/`, `build/`, `host/httpVault.ts`, `config/site.ts`, `vite.config.ts`, `scripts/` (Lane D) — flag copy in `pwa/register.ts` + `import/copy.ts` for Lane D.
- Do NOT un-gate the encoding modal — it stays behind `VITE_FEATURE_ENCODING_MODAL` off (orphan the view cleanly if a route dies; leave `as any` at EncodingModal.ts:40-41 documented as ruled-out-for-v1.x).
- Do NOT add server/Worker code.
- Do NOT touch forbidden paths (`mockups/`, `app/public/vault/`, `scripts/companion/`, `out/companion/`, `docs/companion/`).
- Do NOT render an in-app grammar list anywhere (grammar is link-only to dict `g/` pages).

## Amendments — 2026-07-02 sign-offs (binding; read before starting)

1. **HOME SURVIVES as a static marketing front** (Wedge signed, supersedes every "kill/delete Home" instruction in this WO): default route `#/` renders a minimal marketing Home per the Seal-red mockup (hero H1 + hero-sub + the LIVE SAMPLE section + EN/VI rail chooser + one CTA into the library); the library hub lives at `#library`. Returning visitors with non-empty word-state boot straight to `#library`. Delete only the OLD home internals (bento dashboard + `tsumugu-session` gate + hardcoded SAMPLE_TOKENS get replaced by the mockup's minimal structure). The greedy router rule must now NOT swallow `#/`.
2. Colophon + method still fold into About (signed). GrammarView + FlashcardsView routes still die (signed). Anki export surfaces in Sync (Lane C owns the surface; you remove the old nav links).
3. Default rail `en` is SIGNED (no longer provisional).
4. Copy: hub hero + Home marketing copy are front-facing — the WO's embedded writing rules apply with zero exceptions (no em dashes, page wants nothing, claims checkable).
