# 2026-07-02 — The unification build

Same day as the PRD set: Wedge signed 12 decisions in interview sets of three (recorded in PRD-Super-App-Unification §9a and PRD-Companion-Articles §8), and we executed. Commits `58142c5` (checkpoint: PRDs, converter, QA docs, work orders) and `41d4a36` (the build) on `wo-core-0-scaffold`.

## What shipped

- **The library is real.** `scripts/companion/publish.ts` guards the signed companion-v1 gate profile (fail-closed on binding checks, carve-out + 60/80 band cap encoded, unknown reasons fail closed) and published the 45-wave: 45 readings in the vault, the smoke fixture retired, `companion-lessons.json` carrying all 46 units' grammar lists. Idempotence verified byte-identical. The eligible set rises to 72 after the mechanical content sweep; the ladder lives in PRD-Companion-Articles §3.
- **The unified front end.** Seal-red default across 8 palettes; marketing Home at `#/` (hero + rail chooser + live sample), library hub at `#library` with continue strip → Companion shelf (Book→Lesson spine, study-C cards, union-coverage badges, published grammar lists) → Free Reading wall (study-A cards, topic rail, ranked search); colophon/method folded into About; Grammar/Flashcards routes retired; Settings out of Account into the 設 popover; every user string EN+VI.
- **Sync Stage 1 written, not wired** (Wedge's framing): file export/import, sync code, BYO URL pull, Anki export, UserDoc@2 grammar slot, zero-PII profile — behind `VITE_FEATURE_SYNC`, default off.
- **Platform seams:** deep-links resolve against live `tsumugu-ed.com` (the dead-link class is gone), SW denylist ships ahead of federation, dict shards re-vendored current (10,260 rows) with a CI freshness gate, shell-contract artifact + check, robots/sitemap fixed.
- **tsumugu-ed side** (branch `feat/federation-seams`, pushed): axis-param reader, the new Hán-Việt reading rail (越 toggle), env-gated `/dict-assets/` prefix, origin-rebake readiness — default render byte-identical.

## Process

Two build workflows (analyze→architect→work-orders; then a four-Opus-lane fleet with strict file ownership → Fable integrator → three adversarial reviewers → fixer). The reviewers confirmed 16 medium+ findings — focus-loss on library search, a privacy claim the deploy path contradicted, a toast promising an unshipped file export, EN-only Sync panel, the unwired freshness gate among them — all fixed, with 5 regression tests added. Final: typecheck/lint/test/build all exit 0, 247 tests.

## Open

Wedge-owned: register `tsumugu.cc`; land ed `feat/story-cards-modified-loci` then `feat/federation-seams` to main (live deploy); Worker + DNS cutover per PRD-Site-Federation. Content: mechanical sweep (45→72), the 37 gate-edit + 27 rework articles, B3L08 R3 policy rewrite. Copy: VI native review. Design: regenerate the shell-contract source from the live Seal chrome (the mockup `_shell.html` is stale-silk); companion grammar links render name-only until an ed-slug mapping exists.
