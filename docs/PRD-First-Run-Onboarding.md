---
title: "PRD — First-run orientation: teach the substrate in 30 seconds, locally"
type: prd
status: draft — net-new proposal (not on any existing roadmap)
created: 2026-07-02
updated: 2026-07-02
audience: Wedge (accept/reject), then Claude Code Opus
owns: a first-visit orientation layer; nothing server-side
authority: none prior — this is net-new; consistent with PRD-Tsumugu-Core-v1.md §1.3 (static, local-only, account-free)
---

# PRD — First-run orientation

**Net-new proposal: a one-time, dismissible, local-only orientation that teaches the three things a new visitor cannot discover by looking — the rail switch, the known-state coloring + number-key grading, and lookup-is-capture. The reader's power features are all invisible affordances; a first-time visitor sees colored words and ruby text with no explanation, and the LingQ-style keybinds (the fastest part of the product) are undiscoverable without documentation.**

## 1. Why now, why at all

- The substrate is rich: 2 rails × 3 reading systems × 2 gloss languages × 6-state word coloring × keyboard grading. None of it self-describes.
- The VI rail — the moat — is one toggle away, and a Vietnamese visitor who lands on the EN default (current persisted default is `en`) may never find it. The orientation is the cheapest moat-exposure mechanism that doesn't change the default-rail decision.
- Post-wave, real traffic arrives (SEO pages, shared links). First-session comprehension converts or loses them.

## 2. Shape (deliberately small)

- **Not** a multi-step modal tour. One dismissible overlay on first reader open: three panels (rails / coloring + keys / tap-to-capture), each one sentence + one picture, skippable in one keypress. `localStorage` flag; never shows again.
- A persistent "?" affordance in the reader chrome reopens it — doubles as the keybind reference.
- EN and VI variants (the VI one written per Writing-Standards, not translated word-by-word).
- Zero network, zero accounts, ~1 KB of state. Fits §1.3 exactly.

## 3. Success criteria (falsifiable)

1. Fresh profile → open any reading → orientation shows once; Esc or ✕ dismisses; never reappears; "?" reopens it.
2. All copy passes the front-facing Writing-Standards rules (no em dashes, facts only, no "not X but Y").
3. The three features it teaches are demonstrably learnable from it alone: a tester who has never seen the app can switch rail, grade a word by key, and open a definition after reading it.
4. Reader first-paint unaffected (overlay lazy-mounts after content renders; measure no added blocking JS).

## 4. Steelman against building it

"Good design needs no manual — fix discoverability in the affordances instead." Fair as a north star; concretely, keyboard grading and rail semantics have no visual affordance that could carry them, and every comparable product (LingQ, Migaku) ships an orientation. The overlay is 3 panels, not a crutch for bad design. What would flip it: if the design-unification pass produces chrome that makes rails + keys self-evident, cut this to just the "?" keybind card.

## 5. Non-goals

Progressive tours, tooltips-on-everything, analytics on onboarding steps (cookieless posture stays), server anything, and gating any feature behind completion.

## 6. Sequencing + price

After the design pass (the overlay should speak the final visual language). Price: roughly one session including both language variants — small enough that the main cost is Wedge's copy review.
