# content-pipeline — `reading_checks` gate

Fail-closed prose QA for generated **readings** (`PreparedContent`). This is the binding cost gate from PRD §6.4 — run on **100% of readings** before any batch ends.

## What it enforces

`verifyReading()` runs checks **A–H** (collects **all** reasons; does not short-circuit):

| Check | What |
|-------|------|
| **A** | In-band coverage via `checkDefLevel` (new-target words exempt) |
| **B** | New vocab present + recycles ≥ `NEW_TARGET_RECYCLE_MIN`; grammar markers present |
| **C** | OpenCC s2twp script guard (Simplified/non-TW leak) |
| **D** | Sentence completeness, Han length bounds, reading length spread |
| **E** | Paragraph repetition + distinct sentence openers |
| **F** | CI band (informational by default; see config) |
| **G** | Dual-rail integrity — glossary glosses, VI bridges grounded in `char_vi` |
| **H** | Polyphone safety — bridge readings must match `hanviet.json` `pinyinMap` |

## Run

```bash
# From repo root
pnpm --filter content-pipeline test

# CLI (per-reading verdict; nonzero exit on any FAIL)
pnpm --filter content-pipeline reading-checks test/fixtures/clean.prepared.json

# Skip-and-log queue for failures
pnpm --filter content-pipeline reading-checks --skip-log queue.jsonl readings/*.prepared.json
```

Lesson targets resolve from an `acccBinding` facet on the prepared file or a **sidecar** `<name>.target.json` beside `<name>.prepared.json` (stub until WO-CORE-2 reconciles the lesson index).

## Thresholds

**Claude-owned** constants live in `src/readingChecks.config.ts` with a `CLAUDE-OWNED` banner.

> **Adjudicate with Wedge before first production wave.** Defaults are a starting proposal, not production-approved.

Override in tests or callers via `verifyReading({ config: { ABOVE_BAND_ALLOWANCE: 1 } })`.

## Build-time data (never bundled to client)

| Path | Purpose |
|------|---------|
| `tsumugu-ed/sources/hanviet/hanviet.json` | Hán-Việt readings + polyphone map |
| `tsumugu-ed/sources/hanviet/char_vi.txt` | Cognate membership (share-alike; isolated) |
| `packs/private/zh-hant/data/{tocfl,freq,cedict}.json` | Band index via `loadDefLevelIndex` |

Tests inject tiny fixture indices — no gitignored private packs required.

## Dependencies

- `@tsumugu/engine` — `PreparedContent`, `scoreCI`, `WordStore`
- `scripts/gen/lib` QA surface — `checkDefLevel`, `verifyContent` (via `src/genQa.ts`)

Imports `@tsumugu/gen-qa` via `src/genQa.ts` (WO-CORE-0 landed).

## Out of scope

Generation, critique LLM, repair loop, g2pW integration, client bundling of copyleft data.