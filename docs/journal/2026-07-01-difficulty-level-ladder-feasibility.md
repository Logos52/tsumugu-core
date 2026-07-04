# Difficulty level-ladder — feasibility read — 2026-07-01

**Status:** Idea captured from a brainstorm. Non-binding; no decision taken. The recommendation below is framed as "if pursued," and nothing here is wired into the PRD, the roadmap, or the B5 option without a separate go-ahead.

**Verdict.** If we pursue this, it works as *origination* — authoring an original piece at each level — on original or public-domain content, shaped as a monotone two-rung ladder (A2 → B1) topped by a generation-free "native + existing scaffolding" rung. It breaks as *distillation* of found copyrighted text: that stacks derivative-work exposure across every rung and crosses the GREEN-only stance in `recaps-synopses-feasibility.md`, and the linguistics says a distilled-down version of a specific text stops being that text before its words get simple. Keep it out of v1 — we have not run a single-rung content wave yet (the catalog is still demo fixtures), so multiplying an unproven unit by N is backwards.

## The idea (Wedge, 2026-07-01)

Find an interesting piece of content; split it into difficulty versions so a learner can read it at some level with minimal Chinese: TOCFL B1 (minimal, just enough for the gist) → B2 → C1 → fluent/native. Nuance loss accepted for the learner's benefit. Three questions: feasible, is there a better split, and how far can a text distill into the simplest words before it is unrecognizable or impossible to comprehend.

## It is already half-built here

- **B5 "Difficulty-laddered re-reads"** (`docs/super-app/content-options.md:137`) is this idea: the same story at TOCFL 2, then retold at TOCFL 3. Deferred to Phase-2. Its three stated catches — N× generation, drift breaking the "same story" promise, busywork when the gap is too small — are the exact failure modes the research confirms.
- **A live two-rung prototype** exists at `docs/super-app/content-samples/05-laddered-same-topic.md`: the 手搖 ordering scene written at A2 and at B1, side by side. Illustrative, 2026-06-22.
- **The C-doors** (`content-options.md:147`) already supply level-targeting: textbook+chapter, known-words import, just-my-level.
- **D1 "BYO paste"** (`content-options.md:183`) is the copyright-clean route for *found* content: paste it, scaffold it client-side, never store or serve it.

The new framing's one departure from B5 is the phrase "found interesting content." B5 stays clear of copyright by retelling original stories; "found" content puts copyright back on the table.

## 1 — Feasible?

Feasible as origination on owned or public-domain content at two or three wide-gap rungs, as a Phase-2 fast-follow. The proposed four-rung distillation of found content is the least feasible configuration on the table: highest cost, highest copyright exposure, and rungs placed where leveling adds least.

Two blockers sit on the literal version:

- **Copyright.** Distilling a copyrighted source across N hosted rungs stacks the §101 translation and abridgment derivative rights N times over. The operative risk is automated removal at scale (platform and payment-rail takedowns keyed to a matched title), not a courtroom. `recaps-synopses-feasibility.md` already bright-lines this. Reconciliation has three clean exits: ladder only original/PD text; turn "found content" into an uncopyrightable theme seed for an original piece; or read the user's own found text client-side through the WO-CORE-6 paste importer, never stored or served (which also honors the no-metered-API rule by using a local/BYO model).
- **No faithfulness gate exists.** `check_reading.py` / `readingChecks.ts` hard-gate in-band coverage and the new-word union and advise on recycle, encounter, and naturalness. Neither checks source fidelity or cross-rung consistency — the precise spot where automated simplification fails (74.1% of LLM information loss is oversimplification-to-vagueness, InfoLossQA 2024). A laddered set needs this one net-new gate before any volume.

## 2 — A better split

If pursued, the recommended shape is a monotone two-rung origination ladder plus a generation-free native top rung, content-type-gated, on original/PD content only.

- **Rung 1 — Base (gist floor).** An original piece authored at the content's natural floor: A2 (~1,200 cumulative TOCFL words) for narrative, B1 (~2,400 words, TOCFL Level 3) for anything expository. Target ~95% in-band coverage, the gist-with-assistance threshold (about one unknown word in twenty). True-beginner narrative can drop to the ~150-unique-character floor, authored with Mandarin-Companion cumulative-subset discipline.
- **Rung 2 — Stretch (one wide step).** The same base text plus a controlled set of precision words and connectives, dropped into sentences the reader already understands. One full CEFR band up (A2→B1, or B1→B2) — the only gap width shown to move comprehension (Rand 2020). It is a strict superset of Rung 1, so it clears the in-band gate by construction and feeds the ≥8 encounter ledger for free.
- **Top — Native + scaffolding (no new generation).** The real source read with the scaffolding already shipped: click-reveal dictionary, graduated in-band zh-Hant definitions, hover gloss, EN + Hán-Việt rails, the `1..4 | known | ignored` word-status model, CI band display. This walks one text across the 95%→98% functional-coverage band per reader, which collapses the proposed B2/C1/fluent cluster into a single rung.

**Routing rule (load-bearing).** Concrete narrative → ladder allowed down to A1/A2 by origination. Abstract / expository / argumentative / technical → refuse to emit below B1/B2 and serve through the native+scaffolding rung. Found copyrighted text → no hosted ladder; BYO client-side via the paste importer, or use it only as an uncopyrightable theme seed.

Two problems with the proposed split, surfaced rather than papered over:

- **"B1 minimal" is mislabeled in both directions.** B1 at ~2,400 words is not minimal Chinese. The true "read it with minimal Chinese" floor for narrative is A1/A2 (~150 characters / ~1,200 words), a full band below B1. For abstract content B1 is already too low to stay faithful. The honest minimal-Chinese answer for non-narrative content is a gist card of one or two sentences, not a leveled rewrite that fakes comprehensibility.
- **The rungs sit where leveling helps least.** v1 targets A1–B1; the proposed ladder starts at B1 (v1's ceiling) and climbs to C1/fluent, where few learners sit and a reader can already lean on scaffolding. B1→B2 alone roughly doubles the vocab budget (~2,400 → ~4,750 words), so two adjacent "rungs" are not comprehensible input for the reader who just cleared the lower one.

Three alternatives stay live behind the recommendation: a three-rung A1/A2/B1 cumulative-subset ladder (wins for true beginners on concrete narrative; costs 3× authoring and refuses non-narrative at the door); a coverage-targeted single text leaning entirely on scaffolding (cheapest, near-$0 generation, but loses the "I can read the harder version now" progress payoff and the true beginner who cannot yet read native text); and a gist-card + one-reading + source stack (the honest shape for abstract content, which has no faithful A2 form).

## 3 — The distillation floor

A text has two floors, and content type sets both.

**Identity floor — where it stops being the same text.** Pushing a specific found text down fails by vagueness before deletion: 74.1% of LLM information-loss instances are oversimplification-to-vagueness, 25.9% outright deletion (InfoLossQA 2024). "The 1949 retreat to Taiwan" collapses into "some people moved" while the words are still mid-level. Below ~B1, automated leveling degrades consistently; at A1 only 53.3% of GPT-4 outputs hit the target level at all and up to 14% lose meaning entirely (Barayan 2024). A found *specific* text cannot be reliably distilled to A1/A2 and stay that text.

**Comprehensibility floor — where "simpler" reads harder.** Lexical-only distillation backfires. Replacing rare words with inline elaborations inflated sentence length +33% (24→32 words), lowered *perceived* difficulty, and *worsened* actual Cloze comprehension (p=.004) — Leroy et al. 2013, 187 participants. A single unknown word a reader can look up is cheaper than the long circumlocution that replaces it. The coverage anchors: ~98% of running tokens known for independent reading, ~95% for gist-with-assistance, a minority comprehending at 90%, no one at 80% (Hu & Nation 2000 / Laufer & Ravenhorst-Kalovski 2010). The curve is linear at roughly 2.3% comprehension per 1% of coverage (Schmitt, Jiang & Grabe 2011), so the floor is tunable to a target comprehension percentage and is not a sacred level.

**Content type decides how low.** Concrete narrative tolerates the floor and can be *originated* down to ~150 unique characters and stay a recognizable story (Mandarin Companion Breakthrough; Sinolingua Rainbow Bridge Starter) — by authoring an original plot around the word set, never by distilling a found one. Abstract, expository, and technical content needs near-100% coverage to land without background knowledge and carries incompressible tokens: chengyu (non-compositional classical idioms, gloss or avoid), proper nouns (survive every level), technical terms. Those give such content a hard B1/B2 basement; below it the "simpler" version is a different, vaguer text.

**Chinese-specific relief, with a catch.** About 65% of Mandarin vocabulary is compounds (電腦 = electric-brain, 飛機 = fly-machine), so "advanced" words decompose into known morphemes, and Chinese can go lower than an alphabetic language here. L2 readers do not exploit this automatically (777ms recognition vs 376ms native, no significant L2 transparency effect, Hao/Wu/Duan 2024). The relief cashes in only when the decomposition is surfaced — which Tsumugu's component and drift breakdowns already do.

## Fit, cost, and the cost of being wrong

- **Machinery.** A monotone ladder is synergistic with the encounter formula: re-reading one rung up gives every retained base word two or more extra encounters in already-understood context, and `rung_n` can feed `--history` into the checker so base vocab accrues touches faster. The Δvocab a rung introduces still earns its ≥8 only from later same-band content, so the ladder complements the formula and does not replace it. The in-band gate (`ABOVE_BAND_ALLOWANCE=0`) clears a monotone chain by construction, since the lower rung is a strict subset. The one net-new build is a cross-version plot-consistency / referential-fidelity check: named entities, dates, and specific events preserved across rungs or explicitly flagged.
- **Cost.** Two rungs run about 2× authoring plus the new fidelity gate plus one adjacency check, on owned content only. The four-rung distillation version runs 4× authoring plus a brand-new fidelity gate plus up to three consistency checks plus four non-parallel taste passes per piece, at maximal copyright exposure. Were the metered gen-pipeline ever used, N rungs multiply the dollar cost by N, against the no-metered-API rule.
- **Cost of being wrong.** Low. The two-rung ladder reuses the companion and encounter machinery and the prototype already exists; if it underperforms we drop the second rung and keep the native+scaffolding rung at $0 marginal generation. The expensive mistake is building four fine rungs before a single-rung wave has ever shipped.

## What would flip the recommendation

- Goal shifts from "reach a learner with minimal Chinese" to "serve advanced (C1+) learners" → the upper rungs gain value; the build stays origination, not distillation.
- A validated cross-version faithfulness gate is built → an automated multi-rung pipeline becomes safe (still owned/PD content only).
- An RCT or strong internal signal shows AI-*generated* leveling escapes the comprehension-null that *simplified* leveling produced (Rand 2020 found adjacent levels added nothing; Newsela's flagship RCT was Hedge's g≈-0.02 at intent-to-treat, p=.89) → more rungs justified. No such study exists today.
- We acquire or license content with derivative rights, or use public-domain Ming-Qing material → the copyright collision dissolves and hosted ladders go GREEN.
- The single-rung content wave ships and learners visibly stall between bands at scale → a demand signal for the second rung.
- The real audience turns out to be true beginners who cannot read any native text even with scaffolding → flips the top rung from "native + scaffolding" to an A1/A2 cumulative-subset origination ladder.

## Verified anchors

These survived an adversarial verification pass; the corrections are noted.

- Independent reading ≈ 98% known-token coverage (about 1 unknown in 50); gist-with-assistance ≈ 95% (1 in 20); a minority comprehend at 90%, no one at 80% (Hu & Nation 2000 / Laufer & Ravenhorst-Kalovski 2010 — confirmed).
- Coverage → comprehension is linear, ~2.3% comprehension per 1% of coverage across 92–100%, no cliff (Schmitt, Jiang & Grabe 2011 — confirmed).
- TOCFL B1 = Level 3 ≈ 2,400 cumulative words (published list 2,399; SC-TOP guideline ~2,500); A2 ≈ 1,200 (list 1,226); B2 ≈ 4,741–5,000. B1→B2 roughly doubles the budget (confirmed).
- Practical floor for a coherent Chinese story ≈ 150 unique characters / ~200 unique words, reachable only by authoring an original plot (Mandarin Companion Breakthrough; Sinolingua Rainbow Bridge Starter — confirmed).
- LLM simplification information loss is 74.1% oversimplification-to-vagueness vs 25.9% deletion (InfoLossQA 2024); below ~B1 meaning degrades, and at A1 only 53.3% of GPT-4 outputs hit target with up to 14% losing meaning (Barayan 2024 — confirmed).
- Lexical-only simplification inflated sentence length +33% (24→32 words), lowered perceived difficulty (2.16 vs 2.79, p<.001), and worsened actual Cloze comprehension (p=.004) — Leroy et al. 2013, 187 participants (confirmed).
- ~65% of Mandarin vocabulary is compounds, but the transparency advantage is not automatic for L2 readers (777ms vs 376ms recognition, no significant L2 transparency main effect — Hao/Wu/Duan 2024, confirmed); only surfaced decomposition cashes it in.
- Do not port: the English BNC 8,000–9,000-word-family (98%) and 4,000–5,000 (95%) figures are for authentic English prose. Laufer notes graded readers reach the same coverage with far smaller vocabularies, so these counts do not transfer to Chinese character/word inventories or to TOCFL budgets.

KB overview deferred. This is a private-repo capture; promote to the vault only if the idea advances past brainstorm.
