# Tsumugu Core v1 — Composer kickoff index

**Parent contract:** [`docs/PRD-Tsumugu-Core-v1.md`](../docs/PRD-Tsumugu-Core-v1.md). Where a work order and the PRD disagree, **the PRD wins** — flag the conflict, don't silently reconcile.
**Design source of truth:** [`mockups/reader-house-silk.html`](../mockups/reader-house-silk.html) (tokens, components, the bridge card, the stitch-pull animation).
**Origin (DECIDED 2026-06-23):** `tsumugu.cc` ("cc = Chinese Characters") — carry it as a single config constant, never hardcode elsewhere.

## What we're building

Tsumugu Core v1 is a public, desktop-first responsive **web** reader (one web codebase — no native app or extension in v1): a static, read-only catalog of ~150 AI-original, level-graded, Traditional-first Chinese readings, with **two independent scaffolding rails over one shared Chinese stream** — EN (pinyin ruby + English gloss; the reach funnel) and VI (Hán-Việt ruby + Vietnamese gloss + a taught Sino-Vietnamese cognate bridge; the moat). Tap a word → gloss card → tap-out to the separate tsumugu-ed dictionary. Known-word state is local-only (localStorage/IndexedDB; no accounts, no server, no payments). We build this as a **NEW repo** that depends on `@tsumugu/engine` as a **versioned package — we do NOT fork the personal monorepo** (its `apps/web` is saturated with vault/voice/inbox coupling). Reuse comes through the package + porting two named web files; everything else is left behind.

## Build order (dependency graph)

```
WO-CORE-0  (repo + @tsumugu/engine & gen-qa extraction + tokens)   ── unblocks EVERYTHING
   ├─ WO-CORE-1  (reading_checks gate)              START NOW, parallel to 0
   ├─ WO-CORE-3  (generation pipeline + ACCC index) START NOW (Sub-task A is decision-independent)
   │     needs 0 (package) + calls 1 (gate; stub behind runReadingChecks() if 1 not landed)
   ├─ WO-CORE-2  (reader shell)         needs 0
   │     ├─ WO-CORE-4  (dictionary linkage)   needs 2 (or implement in ported copies standalone)
   │     ├─ WO-CORE-5  (catalog + publisher)  needs 2
   │     └─ WO-CORE-6  (paste importer)        needs 2
   └─ WO-CORE-7  (hosting + deploy + PWA)  needs 0; serves what 2/5/6 render
```

| WO | Title | Status | Gated by |
|---|---|---|---|
| **WO-CORE-0** | Repo scaffold + `@tsumugu/engine`/`@tsumugu/gen-qa` extraction + six-palette tokens | **START NOW** | nothing |
| **WO-CORE-1** | `reading_checks` fail-closed prose QA gate (TS, CLI `reading-checks`) | **START NOW** | uses 0's package once it lands; gate logic is independent |
| **WO-CORE-3** | Generation pipeline (Batches generate→critique→repair) + **Sub-task A: ACCC index reconciliation** | **START NOW** | Sub-task A is decision-independent; generation waves wait on 0 + 1 + adjudicated index |
| **WO-CORE-2** | Reader shell (House layout + Silk-Seam theme, dual-rail, local-only) | After 0 | 0 (package + tokens). Design is **DONE** — not a blocker |
| **WO-CORE-4** | Dictionary linkage (lookup-is-capture + tap-out to tsumugu-ed) | After 2 | 2; ORIGIN = `tsumugu.cc` |
| **WO-CORE-5** | Public catalog + metadata + publisher (Reading Wall manifest) | After 2 | 2 |
| **WO-CORE-6** | Paste-only client-side BYO importer | After 2 | 2 |
| **WO-CORE-7** | Static hosting + deploy + analytics + PWA | After 0 | 0; **ORIGIN/canonical-URL waits on domain pick** |

**Decision posture:** all blocking decisions are made — design is locked (House layout + Silk-Seam default; six palettes) and the **domain is locked (`tsumugu.cc`)**. Nothing waits on a Wedge decision; the fleet can run WO-CORE-0 / 1 / 3 immediately.

### WO numbering (reconciled 2026-06-23)

WO **filenames are authoritative**, and the PRD §10 table now matches them: WO-CORE-2 = **reader shell**; WO-CORE-3 = **generation pipeline** (the ACCC index is its **Sub-task A**); WO-CORE-4 = **dictionary linkage**; WO-CORE-5 = **catalog + publisher**; WO-CORE-6 = **paste importer**; WO-CORE-7 = **hosting/deploy/PWA**. Build to the WO documents.

## Shared conventions (whole fleet)

- **Work-order discipline (the loom method that built the 10,180-entry dictionary):** explicit per-agent manifests, disjoint slices, **scoped commits via explicit pathspec — NEVER `git add -A`.** Claim-based idempotent queue (re-running a claimed slice is a no-op). **~5-lane concurrency ceiling** — 6+ lanes trip rate limits.
- **The integration seam is the `PreparedContent` contract** (`@tsumugu/engine` `PREPARED_CONTENT_SCHEMA_V2`, `content/prepared.ts` + `types.ts`). Generation emits it; the gate validates it; the reader renders it; the importer assembles it in-memory. Honor it exactly; Core extends it metadata-only (vocab/grammar fingerprint + ACCC binding facet) without breaking the guard.
- **Reuse through the package, never by reaching into `/Users/n1/Projects/tsumugu`** in shipped code. Port only the two named web files (`reader/reader.ts`, `hover/wordPopup.ts`) — copy + strip the coupling.
- **Design tokens:** the two-layer raw→semantic model, `data-palette` + `data-theme` on `<html>`; source the values from `mockups/reader-house-silk.html`. Violet (~#6B4BD6) is reserved for brand + bridge + "known" confirm — never a status fill.
- **Generate-then-GATE is non-negotiable.** Model writes out-of-band; the deterministic gate enforces controlled vocab after. **Never inject the wordlist into the generation prompt** (HSKStory proved it degrades quality). Batches API (50% price); Opus 4.8 generate + fresh-context Opus 4.8 critique; max 2 repairs then skip-and-log.
- **Composer drives codegen with its own subscription model** — no metered/pay-per-token LLM APIs anywhere in tooling. loom/Grok drive parallel content authoring.

## Human-in-the-loop checkpoints

| Checkpoint | Owner | Gate |
|---|---|---|
| Gate rubric thresholds (`readingChecks.config.ts`) | **Claude** designs; **Wedge** adjudicates | before WO-CORE-1's gate runs in production |
| ACCC index reconciliation (5 extractions → one FINAL) | Composer scaffolds merge+validate; **Claude** adjudicates content; **Wedge** signs off | before any textbook-bound generation wave |
| Fact-bearing + low-band + VI-bridge readings | **Wedge** reviews as a first-class sample | every wave |
| **10-reading PILOT = conversion KILL-GATE** | **Wedge** | before the 150-reading spend |
| License confirmations — `char_vi` (share-alike) + `chinese-hanviet-cognates.tsv` (marked unlicensed/build-time-only) | **Wedge** | before the cognate bridge becomes a Pro/marketing claim (AllSet Grammar Wiki already ruled OUT, CC-BY-NC-SA) |

**Standing critic flags:** g2pW is NOT integrated (label "candidate / to-integrate"; the 94.2% single-reading majority ships, the ~5.8% polyphone path is the open risk). No news content in v1. Account-presupposing features (HSK seed-on-signup, server-owned known-state, full per-morpheme adaptive scaffolding) are **Phase 2** — v1 is local-session known-state + lookup-is-capture only. The Textbook Companion is a **proof-of-concept (PC-001)**, not "validated."
