---
title: "PRD — PWA offline: precache readings + dict shards, honest offline claims"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Claude Code Opus
owns: service-worker precache policy, dict-search path portability
authority: docs/v1-STATUS-AND-ROADMAP.md (Polish tail #2), docs/COHESION-AUDIT-2026-06-25.md §3 items 16–17
---

# PRD — PWA offline

**Make the PWA's offline story true. The service worker precaches the app shell but not the JSON readings or dictionary-search shards, while `sw.ts:19` claims "offline resolve on cold install" — the claim is false today, and a commuter who installed the app opens it on the subway to an empty library.**

## 1. Problem (audit §3 #16–17, verified)

- `vite.config.ts` `globPatterns` excludes `json`: readings and dict-search shards are runtime-cached at best, absent on cold install.
- `dictResolve.ts` hardcodes `INDEX_BASE='/dict-search'` and the SW uses literal matchers — both break under any non-root Vite base (`httpVault.staticVaultBase` already solves this pattern; reuse it).
- Offline is a real use-case for this product: graded reading is commute reading.

## 2. Decision this PRD owns: precache policy

Post-wave the catalog is ~120–150 readings; readings are text-only JSON (no audio in v1), so full precache is plausibly small, but **measure first**: emit total bytes for readings + dict shards at build time, then pick:

| Policy | Cost | Fit |
|---|---|---|
| A. Precache everything | Largest install; simplest honesty | Fine if total ≤ ~15 MB |
| B. Precache dict shards + N most recent readings; SWR the rest | Medium; "downloaded readings work offline" | The likely winner if readings are heavy |
| C. Runtime-cache only + fix the false claim | Smallest; offline = "what you've opened" | Fallback if measurements surprise |

Recommendation: decide by measurement against the 15 MB line, default expectation **A**; every policy REQUIRES fixing the `sw.ts` claim to match reality.

## 3. Success criteria (falsifiable)

1. Airplane-mode test: install PWA → go offline → open a reading covered by the chosen policy → it renders, dictionary popup resolves.
2. `sw.ts` comments/claims match measured behavior exactly.
3. Non-root base build (`vite build --base=/sub/`) serves dict-search correctly; a CI check or test pins it.
4. Precache manifest size printed at build; recorded in this PRD's changelog with the policy decision.
5. SW update flow verified: a new deploy doesn't strand stale readings (workbox versioning confirmed on one real deploy).

## 4. Plan

1. Fix `dictResolve.ts` base derivation + SW matchers (#17) — unconditional, policy-independent.
2. Build-time size measurement; pick policy with Wedge (one question).
3. Implement policy; airplane-mode matrix on desktop + one real phone.

## 5. Non-goals

Audio caching (no audio assets ship in v1), background sync, push, and offline WRITE of anything beyond the existing localStorage WordStore (already offline by nature).

## 6. Sequencing

After Content Wave 1 lands (the measurement needs the real catalog), before any public "works offline" copy in `PRD-Front-Facing-Copy.md` — the privacy/method pages must not claim offline until this ships.
