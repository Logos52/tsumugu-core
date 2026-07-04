---
title: "PRD — Encoding modal: pull the rich in-app encoding surface into v1.x"
type: prd
status: draft — proposal; changes a scope decision, needs explicit Wedge sign-off
created: 2026-07-02
updated: 2026-07-02
audience: Wedge (scope decision), then Claude Code Opus
owns: the VITE_FEATURE_ENCODING_MODAL surface — data source, scope, and un-gating
authority: WO-CORE-4 (deferred it), docs/COHESION-AUDIT-2026-06-25.md §3 item 13, app/src/config/features.ts
---

# PRD — Encoding modal (v1.x pull-in)

**Proposal: un-gate the rich in-app encoding/components modal as the first v1.x feature, so a reader can see a character's form + story + composition without leaving the page. Today the flow is popup → tap-out to tsumugu-ed — correct but heavy: the learner loses the reading position for a 10-second "how does 惑 work?" glance, on the exact surface (encoding) that is the Tsumugu line's signature.**

This changes a recorded scope decision (WO-CORE-4 deferred the modal), so it needs sign-off, not silent implementation.

## 1. Current state (audit §3 #13)

- `EncodingModal.ts` exists behind `VITE_FEATURE_ENCODING_MODAL`, with a dead rich path and an `as any` cast: no data reaches it.
- Two candidate data paths: (a) inline engine `encoding-page@1` onto glossary entries at bake time; (b) load a per-word sidecar by term at tap time.
- The reader already bundles tsumugu-ed shards for def/Hán-Việt/form resolution — the dictionary data pipeline between the repos is proven.

## 2. The case for pulling it in

- Encoding is the product's mechanism (tsumugu-ed's firewall #1: "char mechanism IS the product"); v1 core renders everything EXCEPT the mechanism in-app.
- Tap-out costs the reading position and a context switch per glance; the modal costs one overlay.
- The component is built; the remaining work is the data seam, not a new surface.

## 3. Steelman for leaving it gated (the WO-CORE-4 position)

v1's bet is the READER; the dictionary already exists one tap away, and every in-app dictionary surface grows the bundle and duplicates tsumugu-ed's rendering (two places to fix every display bug — the exact duplication Wedge guards against). Also: the tap-out drives dictionary traffic, which the dictionary's own iteration feeds on. This position held on 2026-06-21 and is not wrong — the counter is that the modal renders a SUBSET (form/story/composition card), not the full entry, and links onward to tsumugu-ed for depth, so duplication is bounded to one card shape.

**Decision rule:** if Wedge weighs bundle size + render duplication over in-flow encoding, stay gated and close this PRD as ruled-out — that outcome is a valid resolution of this proposal.

## 4. Scope (if approved)

- Modal shows: glyph, form prose, story, composition tree with roles, Hán-Việt reading on the VI rail. Nothing else — no examples, no collocations, no bridge surfaces (those live in tsumugu-ed).
- One "full entry →" link out, carrying the `PRD-Dict-Handoff-Axes.md` params.
- Data path decision: (a) bake-time inline vs (b) sidecar fetch. Recommendation: **(a) inline at bake** — v1 is static-first, the wave rebake is the natural join point, and it keeps runtime fetch surface at zero. Price: bigger prepared JSON (measure on 10 readings before committing; if >20% inflation, switch to (b)).

## 5. Success criteria (falsifiable)

1. Tap word → modal ≤ 150 ms from cached data; reading position preserved on close.
2. Typecheck clean: the `as any` cast is gone, `encoding?: EncodingPageDoc` typed end-to-end.
3. Bundle/prepared-size delta measured and recorded; under the agreed ceiling.
4. Feature flag flipped ON by default only after Wedge walks it on 10 characters including one two-telling char (方) and one loan (沒).

## 6. Sequencing

After Content Wave 1 (the bake-time data path rides the wave rebake). Independent of the design pass.
