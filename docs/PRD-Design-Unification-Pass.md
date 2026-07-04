---
title: "PRD — Design unification pass: every surface to the House/Silk-Seam language"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Claude Code Opus (design-capable session), mockups reviewed by Wedge
owns: visual design of home, library, static pages, and global chrome; NOT the reader (locked)
authority: docs/PRD-Tsumugu-Core-v1.md §4.2, docs/v1-STATUS-AND-ROADMAP.md ★ Design review & pass, mockups/reader-house-silk.html
---

# PRD — Design unification pass

**Bring home, library, the five static pages, and the global chrome (TopNav, palette switcher, footer) to the House layout / Silk-Seam language the reader already speaks. Today the reader is the only surface with a locked design; everything around it is functional but undesigned, so the site reads as one finished room behind an unfinished hallway.**

## 1. Problem (from v1-STATUS, verified in tree)

- `mockups/` covers the reader only. Home, library, and static pages have no mockup, no design decision on record.
- The Library is explicitly "functional; design unreviewed" — card density, rung layout, badge treatment all unaudited.
- Global chrome never had a pass: TopNav density, the palette switcher affordance, footer, and the mobile layout of each surface.
- Two open Wedge decisions gate this work: **default palette** (Silk-Seam is the kickoff judge pick, never confirmed — v1-STATUS Review #6) and **default rail** (`en` persisted vs the mockup's `vi` demo — Review #5).

## 2. Success criteria (falsifiable)

1. A mockup (or annotated screenshot set) exists for home, library, one static page, and the chrome, approved by Wedge before implementation — same discipline as `reader-house-silk.html`.
2. Every surface uses only the two-layer tokens in `app/src/styles/tokens.css`; grep finds no new hard-coded colors.
3. All six palettes × light/dark render every surface without contrast failures (spot-check the worst pair per palette).
4. Mobile: each surface verified at 375px and 768px; the ≤980px/≤720px reader breakpoints stay untouched.
5. Default palette and default rail are decided, recorded in this PRD's changelog, and set in code.

## 3. Constraints

- The reader design is **locked** (Silk-Seam). This pass may not modify reader layout or its CSS beyond shared tokens.
- Front-facing copy is owned by `PRD-Front-Facing-Copy.md`; this PRD owns the frame it sits in. Sequence: design pass first with placeholder-length real copy, or run both PRDs together in one session. Recommendation: together — copy length drives layout.
- Writing-Standards front-facing rules apply to any microcopy this pass touches (no em dashes, complete sentences, no taglines).

## 4. Plan

1. Wedge decisions first: default palette, default rail (two AskUser questions, 5 minutes).
2. Chrome pass: TopNav, footer, palette switcher — the shared frame.
3. Home landing: hero, value props, CTAs into reader/library (layout; copy per the copy PRD).
4. Library: see `PRD-Library-UX.md` for behavior; this pass owns the visual system it renders in.
5. Static pages: one template, five instances.
6. Mobile audit of all of the above.

## 5. Non-goals

Reader redesign, new palettes, animation systems, dark-mode-only features, and any Phase-2 surface (gated off; they get designed when they get scheduled).

## 6. Steelman of not doing this

"Ship on reader strength; design the rest after the content wave proves demand." Rejected because the home page and library ARE the acquisition funnel for the reader — an undesigned front door prices every marketing effort at near-zero conversion. What would flip it: if wave-1 traffic goes reader-direct via deep links (measurable in analytics), the funnel argument weakens and this pass can slip a cycle.
