# Local development

Recorded 2026-11-11. Node `v22.23.4`. pnpm `11.5.1`.

## Prerequisites

The Lint workflow (`.github/workflows/lint.yml`) pins Node.js 22 with `actions/setup-node`. `node -v` printed `v22.23.4`.

`package.json` sets `"packageManager": "pnpm@11.5.1"`. `corepack enable` exited 0. `corepack prepare pnpm@11.5.1 --activate` printed `Preparing pnpm@11.5.1 for immediate activation...`. `pnpm -v` printed `11.5.1`.

## Install

`pnpm-workspace.yaml` includes `../tsumugu/packages/engine`. `scripts/ensure-engine-stub.mjs` copies `scripts/ci/engine-stub` to that path when the directory is missing. The stub `package.json` points the default export at `index.d.ts`.

```bash
node scripts/ensure-engine-stub.mjs
pnpm install --frozen-lockfile
```

The first command created `../tsumugu/packages/engine` from the stub. `pnpm install --frozen-lockfile` finished with `Done in 4s using pnpm v11.5.1` and linked `@tsumugu/engine` to that directory.

`pnpm lint` and `pnpm typecheck` run `node scripts/ensure-engine-stub.mjs` again through `prelint` and `pretypecheck`.

## Lint and typecheck

These three commands are the Lint workflow after install.

```bash
pnpm lint
pnpm lint:prove
pnpm typecheck
```

`pnpm lint` exited 0 (`eslint .`). `pnpm lint:prove` printed `lint:prove ok` and exited 0. That script runs ESLint on `scripts/lint-fixtures/bad.ts`, `good.ts`, and `shebang.ts`. `pnpm typecheck` exited 0.

## Dev server

Vite's `jieba-wasm` alias is `../tsumugu/node_modules/jieba-wasm/pkg/bundler/jieba_rs_wasm.js` (`vite.config.ts`). The self-hosted CI job links this repo's `jieba-wasm` install to that path:

```bash
mkdir -p ../tsumugu/node_modules
ln -sfn "$PWD/node_modules/jieba-wasm" ../tsumugu/node_modules/jieba-wasm
```

That link was created here. The wasm bundle file was present after it.

```bash
pnpm dev
```

Vite printed `ready` and `http://127.0.0.1:5173/`. `GET /` returned `200`. `GET /src/main.ts` returned `200` and the transformed module imports `../tsumugu/packages/engine/index.d.ts`. A request for the jieba alias file returned `403` because that path is outside the Vite file-system allow list. The server root is this repository.

## Tests

```bash
pnpm test
```

`pnpm test` is `vitest run` (`vitest.config.ts`). With the types stub, it exited 1. Vitest reported 24 failed files and 50 passed files (74). Tests were 87 failed, 301 passed, 4 skipped (392). Failures include `SyntaxError: The requested module '@tsumugu/engine' does not provide an export named 'isKnown'` and `TypeError: WordStore is not a constructor`.

These three failures are missing files, recorded in the same run:

- `scripts/accc/resolve-lesson-target.test.ts` opens `private/dangdai-vocab/dangdai.csv`. The file is absent. Error: `ENOENT`.
- `scripts/companion/convert-drafts.test.ts` opens the same csv. Error: `ENOENT`.
- `scripts/gen/reading-pipeline.test.ts` loads `../tsumugu-ed/sources/hanviet/hanviet.json`. Error: `hanviet.json not found`.

The self-hosted job `check` excludes those three files plus `packages/content-pipeline/test/readingChecks.test.ts`. The same command on the stub still exited 1: 20 failed files and 50 passed files (70); 66 failed, 293 passed, 4 skipped (363).

```bash
pnpm test \
  --exclude scripts/accc/resolve-lesson-target.test.ts \
  --exclude scripts/companion/convert-drafts.test.ts \
  --exclude scripts/gen/reading-pipeline.test.ts \
  --exclude packages/content-pipeline/test/readingChecks.test.ts
```

The job sets `TZ=UTC`. The runs above used the machine timezone.

## Production build

```bash
pnpm build
```

Before the jieba link, `pnpm build` exited 1. Rollup reported `ENOENT` for `../tsumugu/node_modules/jieba-wasm/pkg/bundler/jieba_rs_wasm.js`.

After the link, `pnpm build` exited 1. Rollup reported `"progressMetrics" is not exported by "../tsumugu/packages/engine/index.d.ts"`, imported by `app/src/store/userDoc.part2.ts`. `scripts/vendor-fonts.ts` had already written 797 files under `app/public/fonts/` (gitignored).

## Engine source

Job `check` in `.github/workflows/ci.yml` clones the engine, then rewrites its word-status union:

```bash
git clone --depth 1 file:///home/box/mirrors/tsumugu-engine-legacy.git ../tsumugu
node scripts/ci/rewrite-engine-word-status.mjs ../tsumugu/packages/engine
```

`/home/box/mirrors/tsumugu-engine-legacy.git` is absent here, so that clone was not run. `git clone --depth 1 https://github.com/Logos52/tsumugu-engine-legacy.git /agent/repos/tsumugu` exited 128 with `Repository not found`. `gh repo view Logos52/tsumugu-engine-legacy` returned the same result. The rewrite script was not run.

## CI

Workflows under `.github/workflows/`:

| Workflow | Job | Runner |
|---|---|---|
| `ci.yml` | `check` | `[self-hosted, tsumugu-core]` |
| `lint.yml` | `lint`, `typecheck` | `ubuntu-latest`, Node 22 |
| `lint-kit.yml` | `kit-check` | `ubuntu-latest`, Node 22 |

There is no deploy workflow. Merging publishes nothing from these files.

`check` runs on push and pull request for this repository. After checkout it clones the engine mirror, rewrites word status, runs `pnpm install --frozen-lockfile`, links `jieba-wasm`, then the steps below. It sets `TZ=UTC`.

Dict search: when `../tsumugu-ed/exports/site/assets/search` exists, the job runs `npx tsx scripts/dict-sync.ts --check`. That directory is absent here. The job prints a notice and skips the check. Running the check anyway exited 1: `ED-REPO-BLOCKED: ed search export not found at /agent/repos/tsumugu-ed/exports/site/assets/search`.

Shell contract: `npx tsx scripts/build-shell-contract.ts --check app/public/shell` exited 1. The drift line names `topnav.html`. The workflow treats that single drift line as success. This wrapper exited 0:

```bash
set +e
out=$(npx tsx scripts/build-shell-contract.ts --check app/public/shell 2>&1)
status=$?
set -e
printf '%s\n' "$out"
if [ "$status" -eq 0 ]; then
  exit 0
fi
case "$out" in
  *"DRIFT vs "*"topnav.html — re-run --emit")
    echo "notice: shell-contract topnav.html drift matches main."
    exit 0
    ;;
esac
exit "$status"
```

The job then runs `pnpm lint`, `pnpm typecheck`, the excluded `pnpm test` command above, and `pnpm build`. Lint and typecheck exited 0 here. Test and build exited 1 on the types stub, as recorded above. Those two steps need the engine source the mirror provides.

## lint-kit

`lint-kit.json` sets `"profile": "strict"` and `"batch": "v5"`. The pin is `11b2880e890ba1525775843e3f6027e729afbe25`. `.github/workflows/lint-kit.yml` checks out the repo with full history, installs dependencies, installs lint-kit from a private Git checkout with secret `LINT_KIT_DEPLOY_KEY`, and runs `npx kit check`.

`gh repo view Logos52/lint-kit` returned `Could not resolve to a Repository`. `npx kit check` was not run here.
