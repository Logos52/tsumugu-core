# 2026-06-25 — v1 cohesion pass (Composer build → one coherent, green app)

**Goal of the session.** "Composer did a LOT. Put it all together, list what's done,
and patch everything so it reads as one cohesive repo instead of a batch of features
that are not yet implemented."

**Outcome.** tsumugu-core is now one cohesive, green v1 app (typecheck + 149 tests +
lint + build all pass). The shared engine monorepo is also green (921/921 tests, clean
tsc). Core changes are committed locally (`d8a1bf1`, branch `wo-core-0-scaffold`, no
remote). Engine changes are green but **uncommitted** by deliberate choice (see Git below).

---

## How we got here

Started from Composer's large uncommitted working tree on `wo-core-0-scaffold`. A
12-subagent cohesion audit (one reader per subsystem + synthesis) produced
[`docs/COHESION-AUDIT-2026-06-25.md`](../COHESION-AUDIT-2026-06-25.md) — the full
done/partial/orphaned map + defect worklist. Headline finding: the app frame is
genuinely cohesive (router → 11 surfaces, all nav-reachable, i18n/SEO/PWA/analytics
wired). Two things made it *read* as unfinished:

1. **A half-applied `WordStatus` rename** in the shared `@tsumugu/engine`. Composer
   changed the type `new | l1..l4 | known | ignored` → `"1" | "2" | "3" | "4" | known |
   ignored` (LingQ-style numeric keybinds, `1` = New/strongest) in `types`/`status`/`scorer`
   but left it half-applied. That single drift reddened the typecheck (26 core / ~120
   engine errors), failed 3 tests, gutted the cognate bridge, and unstyled the highlights.
2. **Over-build past the locked PRD.** A full accounts/login/remote-sync stack, voice/
   shadowing, flashcards, grammar view, Anki export, and an encoding modal — all wired
   into `main.ts`, all PRD Phase-2/3 non-goals, several hollow (no backend, no audio assets).

**Key decision — Wedge picked Road A** ("Disable, keep in tree"): finish the migration +
in-scope fixes, gate the out-of-scope layer OFF by default, keep all code in the tree.
(Other options offered: delete the extras; expand v1 to bless them — rejected.)

**Shared-engine risk, resolved:** tsumugu-ed (the live dictionary) does **not** import
`@tsumugu/engine` — it's a separate static exported site — so completing the engine
migration carries no dictionary risk. The engine's only consumers are tsumugu-core, the
legacy `apps/web` reader, and the legacy `scripts/gen` pipeline (all migrated).

---

## What was patched

### 1. WordStatus migration — completed everywhere
The mapping: `"l1".."l4"` → `"1".."4"`; `"new"` (never-graded default) collapses into
`"1"` (New, strongest — `STATUS_INTENSITY["1"]=1.0`). Done across:
- **engine** (`~/Projects/tsumugu/packages/engine/src`): `store/wordStore` (default /
  `ensure` / `zeroByStatus` / `DEFAULT_KNOWN_STATUSES`), `srs/fsrs` (`REVIEW_STATUSES`),
  `crossref/resolve` (`KNOWN_RANK` + seed gate `current==="1"`), `crossref/srs`
  (`mapKnownness`: LEARNING→"3", UNKNOWN/new→"1"), `ci/scorer` comment, `smoke.test`,
  + all 9 engine test files (codemod via workflow, each verified).
- **engine `packages/gen-qa`** + tsumugu-core `packages/gen-qa` (both copies): `bridge.ts` KNOWN.
- **tsumugu-core** `app/src`: `account/ankiExport`, `auth/accountView`, `store/userStore`
  (+ tests), `catalog/coverage` (+ test), `reader.test`, `shell/home` (HTMLElement cast),
  `engine.test`, `hover/wordPopup.test`, and the reader CSS (`base.css`/`reader.css` →
  `tsg-status-1..4`; `1` takes the old `-new` strongest visual).
- **legacy `apps/web`** (10 files: `ui/classes`, `styles.css`, `styleguide`,
  `encoding/ankiExport`, `main`, + reader/catalog/encoding/review tests).
- **legacy `scripts/gen`** (`cli` LEARNING set + default, `lib/srs-writeback` reverseStatus,
  `lib/targets` ACTIVE, `validate-phase0`, + gen/lib tests).
- Preserved (NOT touched): external SRS labels (`KNOWN`/`LEARNING`/`UNKNOWN`), the audio
  `engine: "new"` field, `mapKnownness("l1"/"l3"/"l4")` test *inputs* (assert undefined),
  and all JS `new`.

### 2. Cognate bridge restored
`app/src/hover/wordPopup.ts` — Composer had gutted the VI bridge render (hard-hidden
`#cBridge`). Grafted `renderBridgeCogs` + `renderEnNote` + the rail-based show/hide back
from git HEAD. Fixes the 2 `bridge.test.ts` cases. The moat renders again on the VI rail.

### 3. Phase-2 gating (Road A) — NEW `app/src/config/features.ts`
Flags `accounts`, `voice`, `flashcards`, `grammar`, `encodingModal` default OFF
(env override `VITE_FEATURE_*`). Wired:
- `shell/nav.ts` — grammar/flashcards/account nav links + auth button conditional.
- `main.ts` — account mount (`accountCtrl` nullable), encoding modal registration, voice
  attach, and the router `#account`/`#grammar`/`#flashcards` branches all gated; gated-off
  routes render a `renderPhase2()` notice. **Local WordStore stays on (in scope).**

### 4. Smaller fixes
- Catalog fallback now guards on validity not length (`!catalog.length ||
  catalog.every(e=>!e.band)`) → Library shows fixtures instead of blank when the manifest
  is thin. (`main.ts`)
- 3 lint errors: `wordPopup` constant-condition unwrapped; two `cueWaveforms` statement-
  ternaries → if/else.
- Docs: `README.md` Status rewritten (WO-CORE-0..7 ledger + flag table + status model);
  `docs/PRD-Tsumugu-Core-v1.md` gained a "Phase-2 present-but-gated" implementation note.

---

## Verified green
| | tsumugu-core | tsumugu monorepo |
|---|---|---|
| typecheck | clean | clean |
| tests | 149/149 | 921/921 |
| lint | clean | — |
| build | ok | — |

---

## Git state (IMPORTANT for resume)
- **tsumugu-core**: committed locally → **`d8a1bf1`** on `wo-core-0-scaffold`. No remote
  (private/local repo). `private/` is gitignored — nothing sensitive staged.
- **tsumugu (engine, PUBLIC `Logos52/tsumugu`)**: branch `wo-core-0-gen-qa-extract`. My
  **38 WordStatus code files are green but UNCOMMITTED**, deliberately. That branch is full
  of Wedge's *other* active WIP (8 new dictionary PRDs, `DECISIONS.md`, voice `.wav` files,
  a `sources/` dir). The engine is a public *data-free* repo, so `git add -A` would be wrong
  (pushes binaries/data) and would bundle unrelated work. **Resume action: stage just the
  `.ts`/`.css` migration files and commit alongside Wedge's WIP as he prefers.**
- No pushes were made (held the public engine push for Wedge's review).

---

## Open / next steps (none block green v1)
1. **Commit the engine migration** — stage only `packages/engine/src`, `apps/web/src`,
   `scripts/gen|validate`, `packages/gen-qa` `.ts`/`.css` (exclude `.wav`/`__pycache__`/
   `sources/`/PRDs). Then decide on the public push.
2. **Settings panel** is mounted inside the gated Account surface, so gating accounts hides
   it (nav still has palette/theme/rail). Consider pulling Settings into its own in-scope surface.
3. **Gen → publisher seam** (audit §3 #6/#7): generator writes `out/readings/`, publisher
   reads `app/public/vault/readings/zh-Hant/`; `CoreMetadata` shape ≠ `CatalogEntry`. No
   content wave has run, so latent. Also the pipeline wants `ANTHROPIC_API_KEY` — collides
   with Wedge's no-metered-API rule (see memory + the 2026-06-25 encounter-formula journal's
   "Python-vs-TS gate sync + metered-API contradiction" open item).
4. **Catalog** is a 1-reading smoke sample (fixtures shown). Needs a real content wave +
   a manifest emitter to populate the ~150-reading Reading Wall.
5. Polish tail (audit §3 minor/polish): dict rail-param carry-over to tsumugu-ed (cross-repo),
   PWA JSON precache, dead-export cleanup, `DEFAULT_RAIL` en-vs-vi reconciliation.

## Pointers
- Cohesion audit: `docs/COHESION-AUDIT-2026-06-25.md` (full subsystem map + defect worklist).
- Feature flags: `app/src/config/features.ts`.
- Workflow runs this session: inventory `wf_4b967aab-8ba`; engine-test codemod
  `wf_b14ff221-cc0`; apps/web codemod `wf_e8615628-b30`; gen/lib codemod `wf_004b686c-e43`.
