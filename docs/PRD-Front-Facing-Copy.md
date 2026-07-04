---
title: "PRD — Front-facing copy: landing + about/privacy/feedback/colophon/method, EN and VI"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Claude Code Opus (writing session, Writing-Standards loaded)
owns: all public prose on non-reader surfaces, both languages
authority: Writing-Standards.md (front-facing rules, binding), docs/v1-STATUS-AND-ROADMAP.md ★ Front-facing webpages, tsumugu/PRD-Entry-Authoring.md §0.5–0.6 (register)
---

# PRD — Front-facing copy

**Write the real public prose: the home landing and the five static pages (about, privacy, feedback, colophon, method), in English and Vietnamese. Today `staticPages.ts` is 56 lines rendering a bare `h2` plus one body block from thin i18n strings — the site's trust story, SEO story, and "why it's free" framing do not exist yet.**

## 1. Problem

- `app/src/shell/staticPages.ts` renders skeleton pages; bodies come from placeholder-thin `strings.ts` entries.
- No landing copy: value props, the dual-rail pitch, CTAs into reader and library are unwritten.
- The pages carry the SEO weight for both rails (per-rail title/description/lang already wired) but have nothing behind the meta.
- VI is not a translation afterthought: the VI rail is the moat, and PRD §2.1 says the Vietnamese reader gets a complete experience without English.

## 2. Success criteria (falsifiable)

1. Six surfaces (landing + 5 pages) have full EN and VI copy in `strings.ts`, rendered, no placeholder strings remaining (grep for the current stubs returns zero).
2. Every claim is checkable against the actual system before ship — no efficacy claims, no feature promises ahead of the tree (Writing-Standards front-facing rule 7).
3. Zero em dashes in front-facing prose; no "not X but Y" constructions; no taglines-as-sales-copy (rules 3–5, 9).
4. The "why it's free" framing stays out of monetization-private territory: nothing from `private/` surfaces in public copy.
5. Privacy page states the true posture: local-only WordStore, cookieless analytics, no accounts — each verified against `features.ts` and `vite.config.ts` at writing time.
6. Wedge reads all six EN surfaces and all six VI surfaces before merge; VI additionally spot-checked against the register authority (PRD-Entry-Authoring §0.5–0.6).

## 3. Content requirements per surface

- **Landing** — what the site is (graded Traditional-Chinese reading, two scaffolding rails), who each rail serves, the dictionary linkage, why free, CTA to reader + library. Facts, not feelings; the page wants nothing.
- **About** — the Tsumugu line (engine / dictionary / core), ownership of content generation, the two walls it dissolves (copyright, OCR) stated as facts.
- **Method** — how readings are generated and gated (generate-then-GATE, A–H checks), leveling, the dual-rail bake. This page carries the credibility load.
- **Privacy** — the true local-only story. Short because the posture is short.
- **Colophon** — stack, type, palettes, licensing of the dictionary layer (CC BY-NC-SA on published derivatives).
- **Feedback** — how to reach Wedge; what feedback is useful; no fake community framing.

## 4. Plan

1. Load `Writing-Standards.md` in full (the digest is not a substitute).
2. Draft EN landing + method first (hardest, carry the most claims); Wedge review checkpoint.
3. Remaining EN pages; then VI as an independent writing pass (not sentence-by-sentence translation), same standards.
4. Wire into `strings.ts` / `staticPages.ts`; verify per-rail SEO meta still matches the new copy.

## 5. Non-goals

Page layout/visual design (owned by `PRD-Design-Unification-Pass.md`), blog posts, marketing pages, and any copy for Phase-2 surfaces.

## 6. Open question

Whether "method" and "colophon" merge into one page. Recommendation: keep separate — method is a trust document for learners, colophon is a craft document for builders; merging weakens both audiences' scent. Flips if the design pass finds the footer can't carry six links cleanly.
