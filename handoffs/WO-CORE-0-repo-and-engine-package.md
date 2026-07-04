# WO-CORE-0 — New repo scaffold + `@tsumugu/engine` & QA-lib package extraction + design-token foundation

**For:** Composer (codegen agent). Use **your own subscription model** — no metered/pay-per-token APIs for tooling.
**Parent contract:** `/Users/n1/Projects/tsumugu-core/docs/PRD-Tsumugu-Core-v1.md` (§8 Architecture & reuse, §4 design tokens, §10 sequencing). Where this WO and the PRD disagree, the PRD wins; flag the conflict, do not silently reconcile.
**Status:** START NOW — unblocks every other WO.

---

## Goal
Stand up the Tsumugu Core repo (Vite + TS, desktop-first), extract `@tsumugu/engine` + the `scripts/gen` QA lib from `/Users/n1/Projects/tsumugu` into one shared, linkable workspace package consumed by both repos (do NOT fork the monorepo), wire Core to depend on it, and lay the two-layer raw→semantic CSS token foundation with all six palettes — verified green by `vitest` and a smoke render of an anonymous reading with an empty `WordStore`.

## Why / context
The product is content wearing a thin engineering shell; the engine, schema, store, and QA gate are ~80% built and battle-tested in the personal monorepo. v1 reuses them verbatim through a **versioned package** so there is one source of truth, never a fork (the monorepo's `apps/web` is saturated with personal vault/voice/inbox coupling — leave it behind). This WO produces the empty shell, the shared package, and the design tokens; later WOs fill in the gate (WO-CORE-1), the reader (WO-CORE-5), and content (WO-CORE-3/4). See PRD §8.1–8.5.

---

## Exact deliverables

### A. The shared package — extract, don't copy

Today the engine lives at `/Users/n1/Projects/tsumugu/packages/engine` (`name: @tsumugu/engine`, ESM, `exports: { ".": "./src/index.ts" }`, deps `fflate`/`sql.js`/`ts-fsrs`). The gen QA lib lives at `/Users/n1/Projects/tsumugu/scripts/gen/lib/*` (`defLevel.ts` → `checkDefLevel`, `verify.ts` → `verifyContent`, plus `defLevelData.ts`, `exampleVerify.ts`, `bridge.ts`, `licenseAssert.ts`, `args.ts`, `io.ts`). Both are consumed by `/Users/n1/Projects/tsumugu/scripts/gen/cli.ts`.

Decision to make CONCRETE (pick the lower-risk path and state it in the PR description):

- **Path 1 — extract in place + add Core as a workspace consumer via `file:`/`link:` (RECOMMENDED for v1).** Leave `@tsumugu/engine` where it is in the monorepo; add a **new second package** `@tsumugu/gen-qa` that wraps the reusable, data-free subset of `scripts/gen/lib` (the gate primitives — NOT the voice/audio/wiki/transcript files). Core's `package.json` depends on both via local path or a Git tag. This keeps one source of truth without a publish step. The monorepo continues to consume its own copy unchanged.
- **Path 2 — publish to a private registry / GitHub Packages.** More setup; defer unless Path 1 friction appears.

Do **Path 1**. Concretely:

1. In the **monorepo** (`/Users/n1/Projects/tsumugu`), create a new package `/Users/n1/Projects/tsumugu/packages/gen-qa/` named **`@tsumugu/gen-qa`** that re-exports the reusable gate subset so both repos import one barrel. It MUST export at least:
   - `checkDefLevel`, `segmentDefText`, `decomposesIntoAllowList`, `resetDefLevelSegmenter`, and the types `DefLevelViolation`, `CheckDefLevelResult`, `CheckDefLevelOptions` (from `scripts/gen/lib/defLevel.ts`).
   - `verifyContent`, and types `VerifyOptions`, `VerifyReport`, `DefLevelEntryStats`, `hasUsableGlossaryGloss` (from `scripts/gen/lib/verify.ts`).
   - the bridge/cognate helpers from `scripts/gen/lib/bridge.ts` and license assertion from `scripts/gen/lib/licenseAssert.ts`.
   Move the source into the package (or re-export from the existing files — pick whichever keeps the monorepo's `scripts/gen/cli.ts` imports working; `cli.ts` currently imports `verifyContent` from `./lib/verify.js`, so prefer **move into `packages/gen-qa/src/` and update `cli.ts` to import from `@tsumugu/engine`'s sibling `@tsumugu/gen-qa`**). The monorepo `pnpm-workspace.yaml` already globs `packages/*`, so it picks the new package up with no config change.
   - Run the monorepo's `pnpm -w test` (it includes `scripts/**/*.test.ts`, including `defLevel.test.ts`, `verify`-adjacent tests) and confirm green AFTER the move — this is the proof the extraction is non-breaking.

2. In **Core** (`/Users/n1/Projects/tsumugu-core`), depend on the two packages. Two acceptable wiring methods — pick one and document it:
   - **pnpm workspace overlay:** add `/Users/n1/Projects/tsumugu` packages via `file:` deps (`"@tsumugu/engine": "file:../tsumugu/packages/engine"`, `"@tsumugu/gen-qa": "file:../tsumugu/packages/gen-qa"`).
   - **Git submodule / tag:** add the two package dirs as a tagged dependency.
   Use `file:` for v1 (fastest local iteration). Record the absolute source paths in Core's README so the link is findable.

### B. Core repo structure (create)

Vite + TS, desktop-first responsive, **single web codebase** (no native/extension). Match the monorepo's TS conventions (`tsconfig.base.json`: ES2022, `module: ESNext`, `moduleResolution: Bundler`, `verbatimModuleSyntax`, `strict`, `noUncheckedIndexedAccess`, `composite`). Node 22.x, pnpm 11.x (the monorepo runs Node v22.22.2 / pnpm 11.5.1).

```
/Users/n1/Projects/tsumugu-core/
  package.json                 # name @tsumugu/core (private:true), scripts below, deps on engine + gen-qa
  pnpm-workspace.yaml          # if using a local overlay; else plain repo
  tsconfig.json                # extends a base; references app
  tsconfig.base.json           # copy the monorepo's compilerOptions verbatim
  vite.config.ts               # Vite app, root = app/, build → dist/
  vitest.config.ts             # include app/**/src/**/*.test.ts ; environment node + jsdom for render test
  .eslintrc / eslint.config.js # flat config; TS + no-floating-promises
  .gitignore                   # already present — EXTEND (see §below), keep private/ ignored
  .github/workflows/ci.yml     # typecheck + test + build on push/PR (skeleton)
  README.md                    # extend existing — link the PRD, record the file: source paths
  app/
    index.html                 # mounts <html data-rail data-script data-reading data-gloss data-theme data-palette>
    src/
      main.ts                  # bootstrap: read URL/localStorage prefs → set <html> data-* → mount
      styles/
        tokens.css             # the two-layer raw→semantic tokens + 6 palettes + light/dark (§C)
        base.css               # reset, fonts (Inter chrome, LXGW-WenKai/Kaiti read face), layout primitives
      prefs/
        prefs.ts               # data-* attribute manager (palette/theme/rail/reading/script/gloss) + persistence
        prefs.test.ts
      render/
        renderReading.ts       # MINIMAL smoke renderer: PreparedContent → DOM tokens (placeholder; WO-CORE-5 replaces with reuse of reader.ts)
        renderReading.test.ts  # the acceptance render test (§Acceptance 4)
  docs/, handoffs/, mockups/, scripts/, private/   # already exist — leave intact
```

Existing repo state (verified): git on branch `main`, **no remote yet**; `.gitignore` already ignores `private/`, `node_modules/`, `.DS_Store`, `*.log`; `private/` already holds the (unreconciled) dangdai grammar index files — do not touch them, they are WO-CORE-2's input. `scripts/mini-radio-plays/` exists (not in scope). `docs/`, `mockups/`, `handoffs/` exist.

**`package.json` scripts (mirror the monorepo's names):**
```jsonc
{
  "name": "@tsumugu/core",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --pretty",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  }
}
```

### C. Design tokens — transcribe from the canonical mockup

**Source of truth:** `/Users/n1/Projects/tsumugu-core/mockups/reader-house-silk.html` (study its `<style>` block — it already contains the exact, final token sets). Transcribe its CSS custom properties into `app/src/styles/tokens.css` **verbatim** (do not re-derive colors). The mockup is the design contract.

Two-layer model (PRD §4.3):
- **Raw layer** `--raw-*` — swapped per `[data-palette]` AND `[data-theme]` on `:root`.
- **Semantic layer** `--tsg-*` — references the raw layer; components consume ONLY `--tsg-*`.

Ship ALL SIX palettes × light/dark exactly as in the mockup:
| `data-palette` | name | default theme in mockup |
|---|---|---|
| `silk` | 絹 Silk-Seam | **light = the DEFAULT for the whole app** |
| `celadon` | 青磁 Celadon | light + dark |
| `sumi` | 墨 Sumi-Slate | light + dark |
| `loom` | 燈 Loom & Lamplight | light + dark |
| `navy` | House Dark-navy | dark-native (+ light fallback) |
| `mauve` | Mauve Spool | dark-native (+ light fallback) |

The `:root[data-palette="silk"][data-theme="light"]` block is ALSO duplicated as the bare `:root` fallback (mockup lines 39–54) so an attribute-less page still renders Silk light. Keep that.

Semantic mapping to honor (mockup lines 234–250), exact names:
```
--tsg-bg --tsg-sunk --tsg-surface --tsg-surface-alt --tsg-border --tsg-border-strong
--tsg-ink --tsg-muted --tsg-faint
--tsg-accent (=--raw-violet, RESERVED: brand + bridge + known-confirm ONLY) --tsg-accent-ink
--tsg-topic
--tsg-hv --tsg-py                              (reading rubies: HV navy-indigo, pinyin indigo)
--tsg-st-new --tsg-st-l1 --tsg-st-l3 --tsg-st-known   (status — UNDERLINE channel)
--read --ui --display                          (font stacks)
```

Token discipline that the CSS must encode (PRD §4.2):
- **Violet `--raw-violet` (≈ `#6B4BD6` in Silk light) is RESERVED** — brand, the cognate bridge, the "known" confirm. Never a status, never a fill behind prose.
- **Status is the UNDERLINE channel** — clay-new `--raw-new`, amber-learning `--raw-learning`, jade-known `--raw-jade`; plus a scarce violet-soft (`--raw-violet-soft`) wash for the lesson new-target word (`.w.nw`). Do NOT carry over the personal app's per-word `background-fill` status ramp (that is the new=RED grind signal; the public default reads calm). Status rules hold across all six palettes.
- Hán-Việt ruby = `--tsg-hv`; pinyin ruby = `--tsg-py`; `:root[data-rail="en"] rt { color: var(--tsg-py); }`.

Fonts (mockup `<head>` + `--read`/`--ui`/`--display`): Inter (chrome), LXGW WenKai TC / Kaiti (Chinese reading face), Newsreader (display). Use the same CDN links the mockup uses for v1; a self-host task can come later.

`prefs.ts` MUST set these six attributes on `<html>` and persist them to localStorage (defaults: `rail=en` for the marketing/reach front door per PRD §1.2 "market with EN reach" — but READ the PRD: the mockup ships `data-rail="vi"` to show the moat; **resolve this in the Open-question section, do not guess** — ship `en` as the persisted default unless Wedge says otherwise, and make it a one-line constant). Switching is attribute-only, no re-render of tokens.

### D. CI skeleton
`.github/workflows/ci.yml`: on push + PR → `pnpm install`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Node 22, pnpm 11. Do NOT add deploy here (that is WO-CORE-7). Do NOT run any content-generation or metered-API step in CI.

---

## Step-by-step (mechanical, ordered)
1. **Monorepo first.** Create `/Users/n1/Projects/tsumugu/packages/gen-qa/` (`@tsumugu/gen-qa`), move the reusable gate subset of `scripts/gen/lib/*` into it (defLevel, defLevelData, verify, exampleVerify, bridge, licenseAssert, args, io as needed), re-point `scripts/gen/cli.ts` imports. Run `pnpm -w typecheck && pnpm -w test` in the monorepo → **must stay green** (proves non-breaking extraction). Commit on a branch (scoped commit, do NOT `git add -A`).
2. **Scaffold Core.** Create the structure in §B (Vite + TS + vitest + eslint). Copy `tsconfig.base.json` compilerOptions verbatim from the monorepo.
3. **Wire deps.** Add `@tsumugu/engine` + `@tsumugu/gen-qa` to Core via `file:` deps; `pnpm install`; confirm a trivial `import { WordStore, parsePreparedContent, PREPARED_CONTENT_SCHEMA_V2 } from "@tsumugu/engine"` type-checks.
4. **Tokens.** Transcribe the full token block from `mockups/reader-house-silk.html` into `app/src/styles/tokens.css` (all 6 palettes × light/dark + bare `:root` Silk fallback + the `--tsg-*` semantic layer). Add `base.css` with the font links/stacks and a minimal layout.
5. **prefs.ts.** Implement the `data-*` attribute manager + localStorage persistence + a tiny API (`setPalette`, `setTheme`, `setRail`, `setReading`, `setScript`, `setGloss`, `restore()`); default palette `silk`, theme `light`. Write `prefs.test.ts`.
6. **Smoke renderer.** `renderReading.ts`: take a `PreparedContent` (engine schema V2) + a `WordStore`, render tokens to DOM with status classes from the engine's `statusColorClass`/`statusIntensity` (`status/coloring.ts`). This is a PLACEHOLDER — WO-CORE-5 replaces it by reusing `apps/web/src/reader/reader.ts renderWord`. Keep it ~50 lines.
7. **Render test** (§Acceptance 4) in jsdom.
8. **CI skeleton** + README updates (link PRD, record `file:` source paths). 
9. Run `pnpm typecheck && pnpm test && pnpm build` in Core → all green. `pnpm dev` serves `app/index.html` rendering the Silk-light default.
10. Commit on a feature branch in Core (scoped commits, NEVER `git add -A`). Do NOT create a GitHub remote or push unless Wedge asks.

---

## Acceptance criteria / tests (concrete, checkable)
1. **Monorepo green after extraction:** `pnpm -w typecheck && pnpm -w test` in `/Users/n1/Projects/tsumugu` passes with `@tsumugu/gen-qa` in place and `cli.ts` re-pointed (proves one source of truth, no fork, no regression).
2. **Core green:** `pnpm typecheck && pnpm test && pnpm build` in `/Users/n1/Projects/tsumugu-core` all pass.
3. **Engine import works:** a test imports `WordStore`, `parsePreparedContent`, `PREPARED_CONTENT_SCHEMA_V2`, `statusColorClass` from `@tsumugu/engine` and uses them without error.
4. **Anonymous render with empty store:** `renderReading.test.ts` constructs a `PreparedContent` (schema `tsumugu/prepared-content@2`, ~6 word tokens + punctuation, each with a `glossary` `PrebakedEntry`) and an **empty `WordStore`**, calls `renderReading`, and asserts: every word token renders a `<ruby>`/token element; an empty store yields the `new`/unknown status class on each word (no throw, no missing-gloss crash). This is the "renders an anonymous reading with empty WordStore" gate.
5. **Tokens load + palette switch is attribute-only:** a `prefs.test.ts` sets `data-palette="celadon"` then `"navy"` on a mock `<html>` and asserts `prefs` persists/restores from localStorage; a DOM check confirms `getComputedStyle` (or the attribute) reflects the swap without re-mount. Default with no attributes resolves to Silk-light tokens.
6. **Violet-reserved + underline-status are present in CSS:** a grep/text assertion (or a small CSS-parse test) confirms `tokens.css` defines `--tsg-accent` mapped from `--raw-violet`, status semantics map to `--raw-new`/`--raw-learning`/`--raw-jade`, and **no** `.w` / token rule sets `background` from a status color (only `--raw-violet-soft` is allowed as the `.w.nw` lesson-target wash). All six `data-palette` blocks exist.
7. **CI runs** typecheck+test+build on push/PR (skeleton green on the scaffold).

---

## Dependencies
- **None upstream.** WO-CORE-0 is the root; it unblocks WO-CORE-1 (gate — needs `@tsumugu/gen-qa`), WO-CORE-5 (reader — needs Core shell + tokens), and all others. Land this first.

---

## Out of scope / do NOT
- **Do NOT fork the `tsumugu` monorepo.** Extract into a shared package; both repos consume one source of truth (PRD §8.1).
- **Do NOT port the leave-behind set** (PRD §8.4): `apps/web/src/host/fsVault.ts` (File-System-Access vault grant); the entire voice / transcript / synced-video subsystem (`apps/web/src/voice/*`, `reader/transcript*.ts`, `reader/youtube.ts`, `reader/sync.ts`, `scripts/gen/voice/*`, `scripts/gen/lib/*Audio*.ts`, `voiceNotes*`, `transcript*`); Anki export surfaced in chrome; `scripts/publish-public-vault.ts`; the in-app `#/encoding` route + `encoding/`/`review/` views. The gen-qa extraction takes ONLY the data-free gate primitives, not the audio/wiki/transcript libs.
- **Do NOT build** the gate logic (WO-CORE-1), the real reader (WO-CORE-5), the catalog/BYO importer (WO-CORE-6), generation (WO-CORE-3/4), or any deploy/hosting (WO-CORE-7). The `renderReading` here is a throwaway smoke placeholder.
- **Do NOT add** accounts, server sync, payments, the live lesson-binder, news, or any backend — all deferred (PRD §1.3).
- **Do NOT bundle copyleft data** into shipped client artifacts. `char_vi`, CC-CEDICT, `hanviet.json` (`/Users/n1/Projects/tsumugu-ed/sources/hanviet/hanviet.json`), and `chinese-hanviet-cognates.tsv` are build-time-only and stay isolated; the bridge consumes them downstream (WO-CORE-3), not in this WO (PRD §5.4, §9).
- **Do NOT republish functional-facts indices.** `private/dangdai-grammar-index*.json` stay gitignored (already are).
- **Do NOT create a GitHub remote or push** unless Wedge asks.
- **Composer: use your own subscription model, never a metered/pay-per-token API for tooling.**

---

## Open questions for Wedge / Claude (only real blockers)
1. **Default `data-rail`.** PRD §1.2 says "market with EN reach"; the canonical mockup ships `data-rail="vi"` (default-VI so the moat shows). v1 default persisted rail = **`en`** (proposed) unless Wedge wants the moat front-and-center on first paint. One-line constant; ship `en`, flag for confirmation.
2. **Package wiring path.** Proceeding with **Path 1 (`file:` workspace overlay)** for v1; confirm before any private-registry/publish work (Path 2).
3. **Domain / ORIGIN.** Placeholder origin = **`tsumugu.cc`** (PRD §12, §10). Not load-bearing for WO-CORE-0; needed by WO-CORE-7. No action here.
