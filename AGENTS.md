# Tsumugu Core — agent context

Private local repo. Public graded-reader at **tsumugu.cc** (Traditional Chinese, dual EN/VI rails, tap-out to tsumugu-ed).

## Authority chain

| What | Where |
|---|---|
| PRD (wins conflicts) | `docs/PRD-Tsumugu-Core-v1.md` |
| Build order / WOs | `handoffs/README.md` |
| Reader + site design | `mockups/reader-house-silk.html`, `mockups/site/` |
| Engine contract | `@tsumugu/engine` `PreparedContent` / `PREPARED_CONTENT_SCHEMA_V2` |

Money specifics and ACCC source materials stay under `private/` (gitignored). Never republish functional-fact indices.

## Cloud Agent

`pnpm install` in `/workspace` installs nothing. pnpm 11.5.1 drops the install when the workspace package `../tsumugu/packages/engine` sits above `/`. The saved install script bind-mounts this checkout at `/home/ubuntu/dev/tsumugu-core` and the engine at `/home/ubuntu/dev/tsumugu`, then runs `pnpm install --frozen-lockfile` from the checkout mount.

`/tsumugu` is a shallow clone of `https://github.com/Logos52/tsumugu-engine-legacy.git`. `Logos52/tsumugu` is not readable from this environment. The install script rewrites that engine's word-status union to `"1" | "2" | "3" | "4" | "known" | "ignored"`, which is the union this repo typechecks against. `/tsumugu-core` is a symlink to `/workspace` so the engine's dependency links resolve. Vite's `jieba-wasm` alias points at `/tsumugu/node_modules/jieba-wasm`, which the install script links to the workspace copy.

`private/` textbook files and `../tsumugu-ed` are absent. Tests that open `private/dangdai-vocab/dangdai.csv` or `../tsumugu-ed/sources/hanviet/hanviet.json` fail. `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm dev` (Vite on `http://127.0.0.1:5173`) do not need those files.

## Writing standards

**Read `Writing-Standards.md` in this directory before authoring or revising prose** — PRDs, handoffs, journal entries, site copy, hero lines, about pages, buttons, nav labels.

Local copy is gitignored (not committed). Canonical source: `llm-knowledge-base/02 - System/Writing Standards.md`. Refresh the local copy when the vault file changes.

### Digest (not a substitute for the full file)

**Decision documents** (PRDs, proposals, memos, journal entries that weigh options):

- Verdict in the first two sentences; the rest earns it.
- Measure before asserting — numbers from the actual system, not adjectives.
- Steelman the rejected option; name what would flip the decision.
- Price your own recommendation in the same breath.
- Define what is actually being compared before arguing it.
- When options converge, decide on reversibility.
- Success criteria must be falsifiable.
- Delete hedges: honestly, genuinely, quite, very, it's worth noting, importantly, "I think."

**Front-facing surfaces** (heroes, about, badges, buttons, nav, meta, blog posts for general readers):

- The page wants nothing — transfer facts; never work to cause a feeling.
- Complete sentences, one fact each; no telegraphic taglines or cadence beats.
- No em dashes in front-facing prose.
- Specific beats generic; details, not conclusions.
- No reveal / misdiagnosis framing; no "not X but Y."
- Say nothing the screen already shows.
- Every claim checkable against the actual system before it ships.
- Taglines are catalog lines (container noun + topics), not sales copy.

Tsumugu register authority for dictionary + site copy: `tsumugu/PRD-Entry-Authoring.md` §0.5–0.6 (extends the front-facing standard).