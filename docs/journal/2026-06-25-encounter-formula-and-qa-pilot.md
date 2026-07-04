# 2026-06-25 — Encounter-rate formula, the regression math check, and a hand-authored QA pilot

Private repo journal (full detail). A KB overview is deferred for now. Canonical
decision record: `super-app/textbook-companion/ENCOUNTER-FORMULA-AND-PILOT.md`.

## Verdict

We pressure-tested the 40/20/10/5 "reverse regression" before authoring on it, and it
needed two corrections, not a polish. The decay arithmetic was clean; the **denominator
was undefined** (used three incompatible ways across the docs) and the **review phase
guaranteed nothing**. We re-based the percentages on *content tokens*, turned the review
into a coverage guarantee, and derived a real lower-bound encounter formula:
`E_min = μ·r + Σ c_d·ρ ≥ 8` per word. We then hand-authored 13 readings across three
atomic units (b1l01-1 / b1l01-2 / b1l02-1) on Opus, built a standalone QA checker, and
watched the rarest word (接) hit exactly 8 cumulative touches — machine-verified.

## The math check (what was actually wrong)

- The geometric series is consistent: `p_d = 0.4·(0.5)^d`, review sum = 0.40,
  current+review = 0.80. The union-probability figures (1−0.6⁵≈92%, 1−0.7⁵≈83%) are
  right; the round-robin partition does force 100% union. So the headline math holds.
- **Problem 1 — denominator.** "40%" appeared as % of all tokens, % of the new-word
  list, and % of focus tokens, in different sections. The soundness proof was in token
  units; the gate code in list-size units. Same word, three gates.
- **Problem 2 — "% of all tokens" is impossible.** Chinese is ~35–45% function-word
  substrate (all Book-1 vintage), so an 80% recent stack over-books the budget; and 40%
  *unknown* tokens would break the 95% in-band gate sitting in the same repo. The fix:
  it's a recency schedule over **content words**, not a novelty schedule over all
  tokens. True novelty stays ~2–5%, governed by the in-band gate.
- **Problem 3 — review unguaranteed.** Intro phase (partition + multiplicity + recycle)
  guaranteed coverage; review was greedy rarest-first with no per-word floor. Real
  lower-bound encounter rate was just the intro phase (~6).

## The formula we adopted

`E_min(w) = μ·r + Σ_{d=1}^{2} c_d·ρ(w)`, with μ=2 (core multiplicity), r=2–3 (recycle,
scales with unit size), c_1=c_2=1 (review-coverage guarantee), ρ=2 for the rarest tier
else 1. Floor = **8** encounters for every word, including the rare tail. A capacity
side-condition tells us how far it can promise: c_1=c_2=1 is affordable; ρ=2 is fine at
age 1, tight by age 2. Rarest-first is the tie-breaker spending leftover review budget,
not the guarantee.

## Decisions (Wedge chose; locked)

- **Split into the textbook's two atomic halves** (`b1l01-1`/`b1l01-2`), K=5 core per
  half, grouped under the lesson in the UI. The split gives the clean d=1 review beat
  for free and halves per-unit new-load. (Refines COMPANION-SET-LAYOUT Q11's 3-per-half
  sketch — we use 5.)
- **Encounter floor 8, advisory not hard.** Wedge: "i don't mind if 接 can be rare if
  it's hard to turn prose into natural Chinese." Naturalness wins; the gate reports
  below-floor, never fails on it.
- **Recycle scales with unit size, set-level** (≥2 under 30 new items, else ≥3).
- **Reading count scales to expressible scenes** — origin ships 3, not 5 paraphrases.
- **Regression denominator = content tokens** (function-word substrate excluded; the
  exclusion list is a tunable knob — we put 是 in substrate, left 有/要 as content).

## The pilot + the checker

Authored b1l01-1 (3), b1l01-2 (5), b1l02-1 (5) strictly in-band against the real
dangdai vocab (cumulative 24 → 43 → 65 words), steering around every unlearned word.
Built `scripts/gen/qa/check_reading.py` (stdlib-only, segments against the known vocab
set, no jieba) for agent self-QA + human review. All three units pass the hard gates.
The checker earned its keep immediately: it caught a 17/19 coverage gap I'd hand-waved
as 19/19 (missing 日本; 哪 only bound in 哪國), and surfaced that the family lesson can't
naturally review the drinks lesson at d=1 (10.4% vs 20%). 接 reaches 8 by b1l02-1.

## Contradictions surfaced (not silently reconciled)

- **Metered-API vs the no-metered rule.** `reading-pipeline.ts` calls Opus/Sonnet via
  the Batches API, against PRD §5 and Wedge's standing preference. Not blocking the
  pilot (Opus subscription), but must be reconciled before bulk generation.
- **Two QA implementations** — the new Python checker vs TS `readingChecks.ts`. They
  coexist for now (generation-time self-QA vs build gate); port the regression +
  encounter logic into the TS gate before volume.

## Open / next

Continue authoring (b1l02-2, b1l03-1…) or wire the recipe into code
(`resolveLessonReadingTargets` with split units + partition + rarest-first + ρ=2 tail;
`checkRegression` in the TS gate). Issues 1–7 listed in the checkpoint doc; #5 (two
implementations) and #6 (metered API) gate production scale.
