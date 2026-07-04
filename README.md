# Tsumugu Core

The public reading product in the Tsumugu line: a website of AI-generated, level-graded Chinese reading (Simplified or Traditional), served to English-L1 and Vietnamese-L1 learners on two independent scaffolding rails over shared Chinese content.

- **Vietnamese rail (Viet→Han)** — Hán-Việt reading + Vietnamese gloss + the Sino-Vietnamese cognate bridge. The moat.
- **English rail (Eng→Han)** — pinyin + English gloss + character depth. The reach that carries the Vietnamese mission.

Owning and generating the content dissolves the two walls that sank earlier versions: copyright (no raws, no licensed catalog) and OCR (no images, no camera, no local model). The reader sits on the Tsumugu engine and links down into the Tsumugu-ed dictionary as its reference layer.

## The line

- **Tsumugu** — the open-source engine.
- **Tsumugu-ed** — the encoded character dictionary (the reference layer).
- **Tsumugu Core** — this product: graded AI-generated content + reader + importer.

## Build contract

Canonical PRD: [`docs/PRD-Tsumugu-Core-v1.md`](docs/PRD-Tsumugu-Core-v1.md).

### Shared packages

| Package | Location |
|---|---|
| `@tsumugu/gen-qa` | `packages/gen-qa/` (vendored in this repo) |
| `@tsumugu/content-pipeline` | `packages/content-pipeline/` (reading gate) |
| `@tsumugu/engine` | `../tsumugu/packages/engine` via pnpm workspace (read-only dep) |

Clone `tsumugu` beside this repo (`../tsumugu`) before `pnpm install` (engine only).

### Scripts

```bash
pnpm install
pnpm dev          # → http://127.0.0.1:5173
pnpm typecheck
pnpm test
pnpm build
pnpm lint
pnpm publish:readings   # rebuild __readings.json from vault prepared docs
pnpm gen:reading        # generation pipeline CLI (env-gated)
pnpm accc:reconcile     # ACCC grammar index merge
pnpm accc:resolve b4l3  # lesson target resolver
pnpm accc:eval-g2pw     # measure-only: g2pW polyphone eval (no pipeline integration)
```

Default persisted rail is **`en`** (`DEFAULT_RAIL` in `app/src/prefs/prefs.ts`) — flag for Wedge confirmation vs mockup's `vi` demo rail.

## Status

The v1 reader app is built and green — `pnpm typecheck`, `pnpm test` (149 tests), `pnpm lint`, and `pnpm build` all pass. The app shell is a hash router over 11 surfaces with a persistent TopNav (rail/palette/theme), landing page, footer pages, EN/VI i18n, and per-rail SEO.

Delivery against the WO-CORE work orders:

| WO | Surface | State |
|---|---|---|
| 0 | Workspace + engine/gen-qa/content-pipeline packages, six-palette tokens, Vite shell | ✅ Delivered |
| 1 | `reading_checks` A–H fail-closed prose QA gate + CLI | ✅ Delivered |
| 2 | Reader shell — dual-rail data-* toggles, known-state coloring, local WordStore | ✅ Delivered |
| 3 | Generation pipeline (generate→critique→repair) + ACCC lesson-target & grammar-index | ⏳ Built + unit-tested; no live content wave run yet |
| 4 | Dictionary linkage — lookup-is-capture, tsumugu-ed tap-out, VI cognate bridge | ✅ Delivered (bridge restored; rich encoding modal deferred, see flags) |
| 5 | Public catalog + facets + coverage + publisher | ⏳ View wired; the published `__readings.json` is a 1-reading smoke sample, so the Library shows the fixture catalog until a wave runs |
| 6 | Paste-only client-side importer (no-network verified) | ✅ Delivered |
| 7 | Static hosting + PWA + analytics + sitemap + httpVault | ✅ Delivered |

### Word-status model

Word familiarity uses `"1" | "2" | "3" | "4" | "known" | "ignored"` (1 = New, strongest highlight … 4 = Learned; LingQ-style number keybinds). This replaced the older `new | l1..l4` scheme across `@tsumugu/engine` and every consuming app.

### Feature flags — Phase-2 surfaces (default OFF)

v1 is a static, local-only, account-free reader (PRD §1.3 / §12.1). Several larger surfaces were built ahead of schedule; they stay in the tree but are gated off in [`app/src/config/features.ts`](app/src/config/features.ts). Flip the matching `VITE_FEATURE_*` env to enable one for dev (e.g. `VITE_FEATURE_VOICE=true pnpm dev`):

| Flag | Surface | Why deferred |
|---|---|---|
| `accounts` | passwordless login + remote progress sync | PRD §1.3/§12.1 — needs a server (none yet) |
| `voice` | audio voice-notes / shadowing / practice bar | PRD §8.4 leave-behind; ships no audio assets |
| `flashcards` | in-app SRS review | PRD Phase 2 |
| `grammar` | grammar-point browser | PRD Phase 2 (still needs a data source) |
| `encodingModal` | rich in-app encoding / components modal | WO-CORE-4 deferred |

The local WordStore (known-state coloring, progress, paste import) is **not** gated — it is core to the v1 reader.

See `docs/` for research artifacts and `handoffs/` for Composer work orders.