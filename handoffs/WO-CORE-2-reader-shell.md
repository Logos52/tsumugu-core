# WO-CORE-2 — The v1 reader shell (House layout + Silk-Seam theme, dual-rail, local-only)

**For:** Composer (codegen). **Parent contract:** `/Users/n1/Projects/tsumugu-core/docs/PRD-Tsumugu-Core-v1.md` (§4 reader UX, §8 architecture/reuse, §8.5 RESTYLE). **Design source of truth:** `/Users/n1/Projects/tsumugu-core/mockups/reader-house-silk.html` — open it; it is the spec for tokens, components, the bridge card, and the stitch-pull animation.

> **WO-number note (read once, then proceed):** This file's title says "WO-CORE-2" per the explicit task instruction and filename. In the PRD §10 sequencing table the reader shell is **WO-CORE-5** and "WO-CORE-2" is the ACCC index reconciliation. Same deliverable, different label. Build to *this* document; treat "the reader shell WO" as canonical. Flagged to Wedge in Open Questions.

---

## Goal

Ship a public, anonymous-first reader shell: a stripped `mountReader()` that consumes one `PreparedContent` and renders calm with an **empty** `WordStore`, dressed in the House layout + Silk-Seam theme on the WO-CORE-0 token system, with the dual-rail (EN⇄VI) switcher, full toggle matrix, palette switcher, the Hán-Việt cognate-bridge gloss card, underline status, local-only known-state (lookup-is-capture), and a URL tap-out to `tsumugu-ed`.

## Why / context

The reader is ~80% built in the personal monorepo but saturated with vault/voice/transcript/grade coupling (PRD §1.1, §8.4). v1 needs the *rendering loop and hover card only*, re-themed and de-coupled, so an anonymous visitor lands → reads → taps → learns with zero accounts, zero server, zero voice. This WO is the public reading surface; the catalog/facets/BYO-importer (next WO) and static hosting (last WO) layer on top of it. Depends on the extracted `@tsumugu/engine` package from WO-CORE-0.

---

## Exact deliverables

New repo (`tsumugu-core`, stood up in WO-CORE-0). All app paths below are **new files in the Core app**, not edits to `/Users/n1/Projects/tsumugu`. Reuse logic by **importing from `@tsumugu/engine`** (the versioned package) and by **porting** the two web-app files named below (they live in `apps/web`, which we do NOT depend on — copy + strip).

### A. Engine imports (consume as-is from `@tsumugu/engine` — do NOT reimplement)

These are real exports, verified in `/Users/n1/Projects/tsumugu/packages/engine/src/`:

- **Schema / contract** — `content/prepared.ts` + `types.ts`:
  - `type PreparedContent = { schema: "tsumugu/prepared-content@1"|"@2"; lang: string; title?; source?; ciTarget?; ciMeasured?; tokens: PreparedToken[]; glossary: Record<string, PrebakedEntry>; generatedAt? }`
  - `type PreparedToken = { text: string; isWord: boolean }`
  - `type PrebakedEntry = { term; gloss; definitions?: Definitions; reading?; pos?; level?; examples?: ExampleSentence[]; collocations?: Collocation[]; explanation?; bridge?: BridgeInfo }`
  - `type BridgeInfo = { bridgeLang; etymon?; bridgeReading?; morphemes?: BridgeMorpheme[]; meaning?; confidence?; corrected? }`; `type BridgeMorpheme = { surface; etymon; reading?; gloss? }`
  - `PREPARED_CONTENT_SCHEMA`, `PREPARED_CONTENT_SCHEMA_V2`, `isPreparedContent(x): x is PreparedContent`, `parsePreparedContent(input): PreparedContent`, `lookupPrebaked(content, word): PrebakedEntry | undefined`, `wordTokens(content): PreparedToken[]`.
- **Status / coloring** — `status/coloring.ts`:
  - `statusColorClass(status): string` → returns `"tsg-status-{status}"` (drive the underline status classes off this — keep CSS in lockstep with the union).
  - `hotkeyToStatus(key): WordStatus | undefined`; `STATUS_HOTKEYS` (`1..4`→l1..l4, `k/K`→known, `x/X`→ignored; **no hotkey for `new`**).
  - `isKnown(status)`, `statusIntensity(status)`.
  - `type WordStatus = "new"|"l1"|"l2"|"l3"|"l4"|"known"|"ignored"`; `STATUS_ORDER`, `STATUS_LABELS`, `STATUS_LEVEL`.
- **Known-state store** — `store/wordStore.ts` (`export { WordStore }`):
  - `getStatus(lang, word): WordStatus` (returns `"new"` when untracked),
  - `recordSeen(lang, word): WordEntry` — **this is lookup-is-capture**,
  - `setStatus(lang, word, status): WordEntry` — manual grade,
  - `toJSON(): string` / `static fromJSON(text): WordStore` — **persist to localStorage with these**,
  - `get/has/size/all/flag/unflag`.
- **Packs** — `packs/*` (jieba-wasm `jiebaSegment`, `zhHant`, `vi`): needed by the BYO importer in the *next* WO; in this WO only confirm the package import path resolves. Do not wire segmentation into the prepared-content render path (the generator already segmented; `tokens[]` is authoritative).

### B. Ported + stripped web-app files (copy from `apps/web`, strip the coupling)

**`src/reader/reader.ts`** — port `mountReader(root, ...)` from `/Users/n1/Projects/tsumugu/apps/web/src/reader/reader.ts`. Keep: the token-by-token render loop (`renderWord(token: PreparedToken)`), `wordSpans` tracking, keyboard nav (`setActive`/`nextUnknown`), in-place recolor on status change, the empty-state branch. **DROP entirely:**
- the transcript/theater/subtitle layout block (`if (app.transcript) {...}`, `mountTranscriptSync`, `clampSplitFraction` + the splitter drag),
- all voice players (`createVoicePlayer`, `createWordAudioPlayer`, `createSectionAudioPlayer`, `createExampleAudioPlayer`, `app.speak`),
- the section-summary segmentation path (`summaryWordSpans`, `summarySeq`, async jieba in render),
- `persistReadingProgress`, `acceptZhDefinition`, the `#/encoding/...` link, `resolveDictDefault`-coupled chrome.

**`src/hover/wordPopup.ts`** — port `createWordPopup(...): WordPopupController` from `/Users/n1/Projects/tsumugu/apps/web/src/hover/wordPopup.ts`. Keep: `open(word, anchor)`, `close()`, `destroy()`, `positionPopup`, the definition paint + EN/zh toggle, the grading row, the bridge box. **Re-wire the gloss source to the prebaked glossary ONLY** — remove `app.pack.dictionaryProvider(word)` (the async dict merge) and `mergeHover` with a live dict; resolve from `lookupPrebaked(content, word)` synchronously (instant, offline, per PRD §4.5 "pre-resolved from the prepared glossary"). Render the bridge from `PrebakedEntry.bridge` (`BridgeInfo`) into the Silk-Seam `.bridge` card markup from the mockup.

### C. New Core-app files (no monorepo equivalent — author fresh)

| Path | Responsibility |
|---|---|
| `src/app/state.ts` | A **minimal** `ReaderState` replacing the monorepo `AppState`. Fields: `content: PreparedContent \| null`, `lang: string`, `store: WordStore`, `settings: ReaderSettings`, plus an event emitter for `"status"` recolor. Methods the reader/popup call: `getStatus(word): WordStatus`, `gradeWord(word, status): void` (→ `store.setStatus` + persist + emit), `recordSeen(word): void` (→ `store.recordSeen` + persist), `subscribe(ev, fn)`. **No** `pack.dictionaryProvider`, `vault`, `transcript`, `voiceNotes`, `speak`. |
| `src/app/settings.ts` | `type ReaderSettings = { rail:"en"\|"vi"; script:"trad"\|"simp"; reading:"py"\|"zh"\|"hv"; gloss:"en"\|"vi"; theme:"light"\|"dark"; palette:"silk"\|"celadon"\|"sumi"\|"navy"\|"mauve"\|"loom"; knownStateOn: boolean }`. Defaults: `{rail:"vi", script:"trad", reading:"hv", gloss:"vi", theme:"light", palette:"silk", knownStateOn:false}` (matches the mockup `<html>` attributes; **VI default so the moat shows**). Persist + load from localStorage. |
| `src/app/toggles.ts` | The `data-*` switcher: `applySettings(settings)` writes `data-rail / data-script / data-reading / data-gloss / data-theme / data-palette` onto `document.documentElement`; `wireSeg(selector, attr, onChange)` ports the mockup's segmented-control wiring. Switching rail/script/reading re-runs `buildProse`; gloss re-localizes chrome; **theme/palette/rail switch with NO re-render** (CSS-attribute-driven, per PRD §4.3). |
| `src/app/persist.ts` | localStorage adapter: `loadStore(): WordStore` (key `tsumugu-core/word-store`, `WordStore.fromJSON` or empty), `saveStore(store)`, `loadSettings()/saveSettings()`. **Empty store is the default for an anonymous visitor.** |
| `src/app/dictLink.ts` | `dictUrl(word, settings): string` → builds the tap-out URL to `tsumugu-ed`, **carrying the active scaffolding**: `${DICT_ORIGIN}/c/${encodeURIComponent(firstChar)}.html?script=${settings.script}&reading=${settings.reading}&gloss=${settings.gloss}` (word entries: confirm the `tsumugu-ed` word-page path; char pages live at `/c/{char}.html` per `tsumugu-ed/exports/site/c/`). `DICT_ORIGIN` is a build-time const (placeholder `https://dict.tsumugu.cc`). Opens in a new tab; **not an in-app route** (PRD §4.5). |
| `src/styles/tokens.css` | The two-layer token system from WO-CORE-0 + the mockup: `--raw-*` palettes (all 6 × light/dark) and the `--tsg-*` semantic layer. **Copy verbatim from the mockup `<style>` block** (lines ~38–250). Components consume only `--tsg-*`. |
| `src/styles/reader.css` | All component CSS from the mockup: header/chrome, `.seg` segmented controls, `.palettes/.sw` swatches, `.work/.col/.rail`, `.prose/.w/ruby/rt`, **status underline rules** (`.w.new`, `.w.learning`, `.w.known rt`, `.w.nw` violet-soft, `.w.sel`), `#card/.bridge/.cog/.ennote/.acts`, the `stitch`/`pop` keyframes, the `[data-rail]` `.vi-only`/`.en-only` visibility rules, and the responsive `@media` collapse. |
| `src/index.html` + `src/main.ts` | Entry: the `<html data-...>` element + Google Fonts/LXGW-WenKai links from the mockup; `main.ts` loads settings + store, applies toggles, mounts the reader against a `PreparedContent` (in this WO: a bundled fixture; hosting/fetch is the later WO). |

### Design tokens / discipline it MUST honor (PRD §4.2, non-negotiable)

- **Violet `#6B4BD6` is RESERVED** — brand wordmark, the cognate bridge, the "known" confirm action **only**. Never a status. Never a fill behind prose.
- **Status lives in the UNDERLINE channel**, not background-fill: clay-new `#C0506E`, amber-learning `#C98A2B` (dotted), jade-known `#2F9E7D` (ruby tint on known). The lesson new-target word `.w.nw` gets the **scarce violet-soft wash** (`--raw-violet-soft`), the one exception.
- Ruby: Hán-Việt `#3A4BA0` on VI rail, pinyin `#3F51B5` on EN rail (`rt` color flips on `[data-rail="en"]`).
- Reading face = LXGW WenKai TC / Kaiti (`--read`); chrome = Inter (`--ui`).
- The current monorepo per-word `background-fill` status treatment is **replaced** by underline (this is the explicit RESTYLE, PRD §8.5).

---

## Step-by-step (mechanical)

1. **Confirm WO-CORE-0 landed.** `@tsumugu/engine` resolves; `tokens.css` (the `--raw-*`/`--tsg-*` layer) exists or is being created here. If WO-CORE-0 has not extracted the package, STOP and surface it (this WO is blocked).
2. **Scaffold the Core app** under the new repo (Vite + TypeScript + vitest, matching the monorepo's `apps/web` toolchain — framework-free, build DOM with an `el()`/`clear()` helper; port `apps/web/src/ui/dom.ts` for `el`/`clear` and `ui/classes.ts` for `CLS`, stripping any voice/transcript/encoding class names).
3. **Lay down the CSS.** Copy the mockup `<style>` into `src/styles/tokens.css` (the `--raw-*`/`--tsg-*` blocks) + `src/styles/reader.css` (everything else). Verify all 6 palettes × light/dark are present.
4. **Build the HTML shell.** Port the mockup `<header>` (brand wordmark, `#railSeg`, `#scriptSeg`, `#readingSeg`, `#glossSeg`, `.palettes`, `#themeBtn`), the `.work/.col` reading column, and a **trimmed** right `.rail` (drop the "Serena · 朗讀" audio card — voice is left behind; keep Today/coverage/this-passage-introduces and the offline/$0/pre-baked foot). Reading header (title + band + ACCC-binding chip + new-words chip) and legend from the mockup.
5. **Write `state.ts` + `settings.ts` + `persist.ts`.** `ReaderState` holds `content`, `store`, `settings`. `loadStore()` returns an **empty `new WordStore()`** if nothing persisted. `gradeWord`/`recordSeen` mutate the store, persist, and emit `"status"`.
6. **Port `reader.ts` → strip per the DROP list.** Keep `renderWord(token)`: build `ruby` + `rt` (reading per `settings.reading`), apply `statusColorClass(state.getStatus(token.text))` for the underline class, add `.nw` when the token is a lesson new-target (carry a `nw` flag through the prepared schema's word entry or a glossary marker — see Open Q on schema extension), wire `click → openCard(word, span)`. On `"status"` events, recolor `wordSpans` in place (no re-render).
7. **Port `wordPopup.ts` → prebaked-only.** `open(word, anchor)`: `const entry = lookupPrebaked(content, word)`; render glyph + reading + gloss (EN/VI per `settings.gloss`); if `entry.bridge` and `settings.rail==="vi"`, render the `.bridge` card (shared morpheme bold, run the `stitch` draw animation by toggling `.draw`); if `settings.rail==="en"`, render the `.ennote` component/phonetic-series note instead (CSS `.vi-only`/`.en-only` already gate these by `[data-rail]` — also guard in JS). Grading row behind `settings.knownStateOn`. The `字 →` button calls `dictUrl(word, settings)` in a new tab.
8. **Lookup-is-capture.** In `open(word, ...)`, call `state.recordSeen(word)` (records `seen`, bumps `seenCount`/`lastSeen`, persists). Status coloring updates live via the emit. The "✓ known" button calls `gradeWord(word, "known")` — the one violet confirm.
9. **Wire toggles (`toggles.ts`).** `wireSeg` for rail/script/reading/gloss; palette swatches set `data-palette`; `#themeBtn` flips `data-theme`. Rail/script/reading → `buildProse`; gloss → re-localize chrome strings; palette/theme/rail → attribute-only (no re-render). Palette switcher + light/dark also live in a **settings surface** (a popover or panel — minimum: the header `.palettes` strip + theme button as in the mockup satisfies "in settings" for v1).
10. **Anonymous-first guard.** Default `knownStateOn:false` → no grading hotkeys, no status colors beyond what the prepared content declares (lesson new-target `.nw` still shows — it is content metadata, not personal state). Turning known-state on enables `recordSeen` coloring + the grading row + the `1..4/k/x` hotkeys.
11. **Desktop-first responsive.** Keep the mockup's `@media(max-width:980px)` (hide right rail, stack) and `720px` (shrink prose) breakpoints.
12. **Tests** (§ below). Run `pnpm vitest` (or the repo's runner) green before handoff.

---

## Acceptance criteria / tests

Concrete, checkable (vitest + a jsdom render harness; mirror the monorepo's `reader.test.ts` style):

1. **vitest green** across the new Core app (`pnpm -C tsumugu-core test`), and `pnpm typecheck` clean.
2. **Anonymous render with empty store.** Mount the reader with a fixture `PreparedContent` and `new WordStore()` (zero entries): every word renders, `getStatus` returns `"new"` for all, and with `knownStateOn:false` **no status underline classes** are applied beyond content-declared `.nw`. No throw, no console error, no network call (assert `fetch` not called).
3. **Lookup-is-capture.** Open the card for a word → `store.has(lang, word)` is true and `store.get(...).seenCount >= 1` afterward; status recolors live without re-mounting.
4. **Grade flow.** With `knownStateOn:true`, pressing `k` (or clicking ✓) on the active word sets status `"known"`, applies `statusColorClass` → `tsg-status-known`, and persists (a fresh `loadStore()` returns it).
5. **Dual-rail switch.** Flipping `data-rail` from `vi`→`en`: ruby switches Hán-Việt→pinyin (`rt` color token flips), the bridge card hides and the `.ennote` shows, gloss language follows; **no DOM re-render of `.prose`** when only theme/palette/rail change (assert the same word-span node identities persist across a theme/palette flip; rail flip may re-localize but must not rebuild prose for theme/palette).
6. **Bridge card from `BridgeInfo`.** A glossary entry carrying `bridge.morphemes` renders the `.bridge` card with the shared morpheme bolded and the `stitch` animation class toggled; an entry with no bridge shows no `.bridge` block on either rail.
7. **Tap-out URL.** `dictUrl("望", {script:"trad",reading:"hv",gloss:"vi"})` === `${DICT_ORIGIN}/c/%E6%9C%9B.html?script=trad&reading=hv&gloss=vi`; opens in a new tab (assert `target=_blank`/`window.open`), **never** mutates the in-app route.
8. **Violet-reservation lint (a test, not just a rule).** A grep/test asserts no `--tsg-st-*` or status class resolves to `--raw-violet*`, and `.prose .w` has no `background` set for `new`/`learning`/`known` (underline channel only). `.w.nw` is the sole violet-soft fill.
9. **Responsive.** At ≤980px the right rail is `display:none` and `.work` stacks; at ≤720px `.prose` font-size shrinks (assert computed style under a jsdom matchMedia shim or a Playwright smoke if available).
10. **No leftover coupling.** A test/grep asserts the ported `reader.ts`/`wordPopup.ts` contain no reference to `transcript`, `voice`, `speak`, `splitter`, `theater`, `fsVault`, `dictionaryProvider`, or `#/encoding`.

---

## Dependencies

- **MUST land first: WO-CORE-0** (new repo + `@tsumugu/engine` package extraction). This WO imports the package and the WO-CORE-0 token layer. If WO-CORE-0 has not shipped `tokens.css`, author it here from the mockup and hand the canonical copy back to WO-CORE-0.
- **Independent of** WO-CORE-1/3/4 (the gate + generation): this WO renders a *fixture* `PreparedContent`; it does not generate. The 10-reading pilot consumes this shell.
- **Feeds:** WO-CORE-6 (catalog/facets/BYO importer mounts onto this shell) and WO-CORE-7 (static `httpVault` fetch replaces the fixture loader).

---

## Out of scope / do NOT

- **Do NOT fork the `tsumugu` monorepo.** Import `@tsumugu/engine`; copy + strip the two named `apps/web` files only. `apps/web` is not a dependency.
- **Leave behind** (PRD §8.4): `host/fsVault.ts` File-System-Access vault grant; the entire voice/transcript/synced-video subsystem; Anki export from default chrome; `scripts/publish-public-vault.ts`; the in-app `#/encoding` route and review/encoding views; `app.pack.dictionaryProvider` live-dict merge.
- **No accounts, no login, no server sync, no payments, no ads** — known-state is localStorage/IndexedDB only (PRD §1.3, §4.6). No backend call of any kind in this WO.
- **No content generation, no gate, no Hán-Việt lookup** here — those are WO-CORE-1/3/4. This WO trusts the prepared glossary.
- **No catalog page, no BYO importer, no static fetch** — those are WO-CORE-6/7. Render a bundled fixture.
- **No audio / TTS / Serena card** in the rail (drop it from the ported markup).
- **tsumugu-ed is a separate static site** — link out by URL only; do not embed or route it in-app.
- **Composer uses its own subscription model** for codegen — do not introduce any metered/pay-per-token LLM API into the build or runtime.

---

## Open questions for Wedge / Claude (only real blockers)

1. **Schema extension for lesson new-target (`.nw`) + ACCC binding facet.** The mockup marks the lesson's new-target words (`.nw` violet-soft) and shows an "當代中文課程 · B4 L3" binding chip + "3 từ mới" count. `PreparedContent` (engine `@2`) has **no field for these**. PRD §8.2 says Core "extends it only with the vocab/grammar fingerprint + ACCC binding facet metadata." **Decision needed:** confirm the extension shape (e.g. `PreparedContent.binding?: { textbook; book; lesson; newWords: string[] }` carried as a Core-side superset, with `.nw` derived from `binding.newWords`) so this WO renders from real fields rather than a fixture-only hack. Recommend the superset approach (keeps `@tsumugu/engine` untouched; Core owns the facet layer).
2. **DICT_ORIGIN + word-entry path.** Char pages are `/c/{char}.html` (confirmed in `tsumugu-ed/exports/site/c/`). Confirm the **word**-entry path on `tsumugu-ed` (vs. linking a multi-char word to its first char) and the production **dict origin** (placeholder `https://dict.tsumugu.cc` — PRD §12 lists `tsumugu.cc` as recommended,).
3. **WO numbering.** This is labeled WO-CORE-2 per the task; PRD §10 has it as WO-CORE-5. Confirm which numbering the handoff set should use so the index stays coherent.
