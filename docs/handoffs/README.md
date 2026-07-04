# Gen → publisher handoff

How a generated reading travels from the generation pipeline into the catalog the
app reads. Three stages, each with a single owner directory.

```
scripts/gen/ ──(1)──▶ app/public/vault/readings/zh-Hant/<id>.prepared.json
                              │
pipeline/    ──(2)────────────┘──▶ app/public/vault/__readings.json
                                            │
app/src/host/httpVault.ts ──(3)─────────────┘──▶ catalog UI
```

## 1. Generate — `scripts/gen/`

`pnpm gen:reading --queue out/reading-queue.json [--lanes 5] [--dry-run]`

- Drives the claim queue through generate → gate → critique → repair and writes each
  accepted reading as `<specId>.prepared.json` (schema `PREPARED_CONTENT_SCHEMA_V2`
  with a `core` block — see stage 2).
- **`--out` defaults to `app/public/vault/readings/zh-Hant/`** (`cli.ts`
  `DEFAULT_OUT_DIR`), the exact directory the publisher scans. This is the seam:
  before, generated readings defaulted to `out/readings/` and never reached the
  publisher. Pass `--out <dir>` to stage elsewhere (e.g. a scratch dir for review).
- Live runs require `ANTHROPIC_API_KEY`. (Note: the batch client is a metered API —
  its use is gated by the workspace "prefer subscription/local" rule; the seam here
  is only about WHERE output lands, not about running the metered path.)

## 2. Publish — `pipeline/`

`pnpm publish:readings`

- `pipeline/publish-readings.ts` scans `app/public/vault/readings/zh-Hant/*.prepared.json`,
  calls `pipeline/lib/catalogEnrich.ts` `enrichCatalogEntry` on each, sorts, and writes
  `app/public/vault/__readings.json`.
- `enrichCatalogEntry` requires each prepared file to carry a `core` block and maps it
  to a `CatalogEntry` (`app/src/catalog/types.ts`): object-form `binding`, numeric
  `tocfl` / `newWords`, `band`, `kind`, `topic`. The generator's `core` block
  (`scripts/gen/lib/dualRail.ts` `CoreMetadata`) is emitted in exactly this shape so
  the two compose without a shape mismatch (integration-tested in
  `pipeline/lib/catalogEnrich.test.ts` via `populateDualRail` → `enrichCatalogEntry`).

## 3. Serve — `app/src/host/httpVault.ts`

- `listVaultReadings` fetches `__readings.json` and applies a runtime validity guard:
  entries missing `band` / `kind` / `wordCounts` are skipped with a `console.warn`.
- Zero valid entries → the app falls back to the bundled fixture catalog (Lane B,
  `main.ts`), so a thin/partial manifest never renders a broken library.

## Ownership boundary

The generator defaults its output PATH to the vault directory, but the content
workflow (`scripts/companion/`, forbidden path) owns writes into
`app/public/vault/`. Platform code sets the seam; it does not author content.
