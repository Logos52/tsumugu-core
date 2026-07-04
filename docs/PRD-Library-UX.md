---
title: "PRD — Library UX: states, honesty, and findability"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Claude Code Opus
owns: Library/catalog behavior — states, fallback honesty, search/facets, dict-hits; visual system owned by PRD-Design-Unification-Pass.md
authority: docs/v1-STATUS-AND-ROADMAP.md ★ Library design, docs/COHESION-AUDIT-2026-06-25.md §3 items 20, 40–46
---

# PRD — Library UX

**Make the Library honest and legible: real empty/loading/no-results states, an explicit demo-mode signal instead of the silent fixture fallback, working dict-hits styling, and a findability audit (facets → URL, search ranking, continue/up-next). The Library is functional and feature-rich — facets, search, ⌘K, coverage badges — but it lies by omission (fixtures render as if real) and several of its blocks ship half-wired.**

## 1. Problem (verified in tree)

- Fixture fallback is silent: a thin `__readings.json` swaps in `FIXTURE_CATALOG` with no banner; a visitor cannot tell demo from catalog. (Interim honesty matters even after Content Wave 1 — the fallback path stays in the code.)
- `tsg-dict-hits` renders markup with **no matching CSS** (audit §3 #40) — dictionary hits in library search paint unstyled.
- No designed empty / loading / no-results states; loading-skeleton and up-next-hint CSS missing (#40).
- Dead facet imports and pass-through re-exports (#41, #44) — the facet system has orphan surface area that confuses maintenance.
- Search ranking, facet→URL round-trip, and continue/up-next surfacing are unaudited against real catalog sizes.

## 2. Success criteria (falsifiable)

1. Three states designed and reachable: loading (skeleton), empty catalog (with cause: "no published readings yet"), no-results (with facet-reset affordance). Each has a test.
2. When fixtures render, a visible demo-mode banner says so. Zero paths where fixture data displays undeclared.
3. `tsg-dict-hits` block fully styled in all six palettes; dict hits verified in search results.
4. Facets round-trip through the URL hash: set facets → copy URL → open in new tab → identical view. Test pins it.
5. Search ranked sanely at catalog scale: exact title > title prefix > word match; verified against the wave-1 catalog (or fixture set pre-wave).
6. Dead facet imports/re-exports removed; `pnpm lint` and `tsc` stay green.
7. Mobile (375px): facet bar, cards, and ⌘K switcher usable; no horizontal scroll.

## 3. Plan

1. States + demo banner (the honesty fixes) — smallest diff, highest trust gain.
2. dict-hits + skeleton + up-next CSS (#40) in the token system.
3. Facet→URL audit + tests; dead-code removal (#41, #44).
4. Search ranking pass with measured examples in the PR description.
5. Mobile verification.

## 4. Sequencing

Runs before or parallel to Content Wave 1; the demo banner is MORE valuable pre-wave (that's when fixtures show). Visual language lands with the design pass; this PRD's states should be built token-native so the design pass restyles rather than rebuilds.

## 5. Non-goals

New Library features (collections, saved searches), server-side anything, changes to `CatalogEntry` shape (owned by Content Wave 1), and reader changes.
