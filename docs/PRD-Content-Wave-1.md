---
title: "PRD — Content Wave 1: first live catalog (~150 readings)"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Claude Code Opus
owns: gen→publisher seam reconciliation + manifest emitter + the first live content wave
authority: docs/PRD-Tsumugu-Core-v1.md §6 (pipeline), docs/v1-STATUS-AND-ROADMAP.md (Content & pipeline), docs/COHESION-AUDIT-2026-06-25.md §3 items 5–7
---

# PRD — Content Wave 1: first live catalog

**Run the first live content wave and make the Library real. The reader, QA gate, and pipeline are all built and green (149 tests), but the published `__readings.json` is a 1-reading smoke sample, so the public catalog silently renders demo fixtures — the single largest gap between what tsumugu-core is and what a visitor sees.**

This PRD is the execution spec for the three "Content & pipeline" items in `v1-STATUS-AND-ROADMAP.md`. It creates no new product surface; it makes the built ones true.

## 1. Problem (measured)

- `app/public/vault/__readings.json` carries 1 smoke reading; the Library falls back to `FIXTURE_CATALOG` whenever the manifest is thin, with no user-visible signal that content is fake.
- Generator and publisher don't meet: `scripts/gen/cli.ts` defaults `--out out/readings`; `pipeline/publish-readings.ts` scans `app/public/vault/readings/zh-Hant/` (audit §3 #6).
- `dualRail.ts` emits `CoreMetadata` that does not satisfy `CatalogEntry` — `catalogEnrich.ts` needs object `binding`, numeric `tocfl`/`newWords`, `topic` (audit §3 #7).
- No manifest emitter derives `band/kind/title/wordCounts/minutes/…` from `.prepared.json` `core` blocks (audit §3 #5).
- WO-CORE-3 pipeline (generate→critique→repair + ACCC targets) is unit-tested but has never produced a live wave.

## 2. Success criteria (falsifiable)

1. `pnpm gen:reading` output lands where `publish-readings.ts` reads, with the seam documented in `handoffs/README.md`.
2. A manifest emitter writes a full `CatalogEntry[]`; the fixture fallback triggers on validity, not length.
3. ≥120 readings published across the PRD §3.2 catalog composition, every one passing `reading_checks` A–H fail-closed; 0 gate waivers.
4. Library at tsumugu.cc shows the live catalog: facets, coverage badges, and continue/up-next operate on real data; fixtures unreachable in prod.
5. Both rails baked per PRD §6.5 for every published reading (EN + VI glosses, pinyin + Hán-Việt readings).

## 3. Blocking decision — the generation path (Wedge, before any run)

The pipeline wants `ANTHROPIC_API_KEY`; the no-metered-API rule forbids it. Options:

| Path | Price | Risk |
|---|---|---|
| A. Claude subscription session drives the wave (agent authors in-session, gate runs locally) | Slowest wall-clock; batch discipline needed | Session limits mid-wave; mitigated by per-reading commits like the tsumugu-ed RUNBOOK |
| B. Local model (MLX) generates, Opus repairs failures | $0, offline | Draft quality below gate → high repair rate; unmeasured |
| C. One metered wave as a scoped exception | Fastest | Breaks a standing rule; needs explicit Wedge sign-off in writing |

Recommendation: **A**, priced at roughly 2–4 overnight sessions for ~150 readings given the critique→repair loop. It reuses the proven tsumugu-ed batch pattern and keeps the rule intact. What would flip it: if a measured pilot (10 readings) shows session throughput under ~20 readings/night, B's repair-rate experiment becomes worth one evening.

## 4. Plan

0. **Pilot 10 readings** end-to-end (generate → gate → publish → verify in Library). Measures throughput and gate pass-rate before committing to the wave. Kill-gate per PRD §6.7.
1. Seam fix: point gen output at the vault path (or add a copy step); reconcile `CoreMetadata` → `CatalogEntry`; add the integration test the audit asks for (§3 #21: pipe real `populateDualRail` output into `enrichCatalogEntry`).
2. Manifest emitter + validity-based fixture guard; regression test feeding the real thin manifest (§3 #20).
3. Wave run in band order (A1 → up), committing per green batch; log per tsumugu-ed `LOG.md` discipline.
4. Publish + deploy; walk the Library, reader, and both rails on 5 spot-checked readings.

## 5. Non-goals

Audio sidecars (separate lane), accounts/sync, new reader features, C-band-heavy composition beyond PRD §3.2, and any prose that bypasses the A–H gate.

## 6. Open questions

- Catalog composition final counts per band (PRD §3.2 gives shape; confirm numbers before the wave).
- Whether the ACCC grammar→lesson index reconciliation (PRD §7.3) blocks textbook-bound readings in wave 1, or wave 1 ships topic-bound only. Recommendation: topic-bound only; don't couple the wave to the ACCC merge.
