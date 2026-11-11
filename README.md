# Tsumugu Core

Tsumugu Core is the graded Traditional Chinese reader in this repository. `app/src/config/site.ts` sets the site origin to `https://tsumugu.cc`. The document element in `app/index.html` sets `data-rail="en"`, `data-script="trad"`, `data-reading="py"`, and `data-gloss="en"`. `DEFAULT_RAIL` in `app/src/app/settings.ts` is `en`.

The Apache License, Version 2.0 in `LICENSE` covers the code. `CONTENT-RIGHTS.md` lists the content paths. Those paths stay all rights reserved.

| Package | Path |
|---|---|
| `@tsumugu/core` | repository root |
| `@tsumugu/gen-qa` | `packages/gen-qa` |
| `content-pipeline` | `packages/content-pipeline` |
| `@tsumugu/vocab-import` | `packages/vocab-import` |
| `@tsumugu/engine` | `../tsumugu/packages/engine` (`pnpm-workspace.yaml`) |

`docs/PRD-Tsumugu-Core.md` is marked superseded and kept for provenance. `docs/PRD-Tsumugu-Core-v1.md` is absent from this tree.

Local setup uses Node.js 22 and pnpm 11.5.1. Install, lint, typecheck, the dev server, tests, the production build, and CI are in `docs/DEVELOPMENT.md`.

Each flag in `app/src/config/features.ts` is false unless its variable is the string `true` or the string `1`.

| Flag | Variable |
|---|---|
| `accounts` | `VITE_FEATURE_ACCOUNTS` |
| `sync` | `VITE_FEATURE_SYNC` |
| `voice` | `VITE_FEATURE_VOICE` |
| `encodingModal` | `VITE_FEATURE_ENCODING_MODAL` |
| `pro` | `VITE_FEATURE_PRO` |
| `ads` | `VITE_FEATURE_ADS` |
| `donate` | `VITE_FEATURE_DONATE` |
