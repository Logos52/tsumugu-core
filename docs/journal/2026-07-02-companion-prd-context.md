# Companion-Articles PRD — context checkpoint (paused mid-session)

**State: `docs/PRD-Companion-Articles.md` exists as a complete untracked draft (working tree, no git history — authored by a parallel session today). This session independently re-measured the gate math before writing and was paused pre-reconciliation; the draft stands, and the discrepancies below are the resume list.** Nothing was overwritten.

## What this session verified (from gate-report.json + qa-rework-2026-07-02.json, 2026-07-02)

- 138 articles / 46 lessons; converter clean (CI 0.5566–0.9242, totalWords real). 0/138 pass full A–H.
- Check-letter map confirmed in `packages/content-pipeline/src/readingChecks.ts`: A in-band · B features-new-items (BOTH newVocab touch/recycle AND grammar markers) · C script (delegated to G) · D sentence completeness/length/spread · E paragraph · F CI (advisory by config) · G dual-rail/glossary/script · H polyphone.
- The GATE-REPORT matrix's `newVocab` and `newGrammar` columns (each 138/138) are both check B — so B fails wholesale on two distinct sub-rules needing two distinct fixes: surface strings in the grammar index (labels 句型/正反問 can never match prose) and an encounter policy for union-covered companion sets (`NEW_TARGET_RECYCLE_MIN=3` per reading; the Python checker holds recycle advisory per the encounter-formula lock — measured Python/TS divergence).
- **Check D hides inside the `prose:` bucket** (the matrix column conflates A's could-not-run line with D): 81/138 readings carry D-type failures — 270 sentence-too-long reasons (`SENTENCE_MAX_HAN=60`; median offender 71 Han, max 136), 51 too-short (`SENTENCE_MIN_HAN=4`), 2 not-complete. 47 of the 81 are 對話/問答 — the TS splitter counts speaker turns/quoted runs whole, an artifact `check_candidate.py`'s `hc()` already corrects by stripping speaker labels.
- Mechanical fails (per-reading sets, overlaps counted): glossary 26 ∪ script 58 ∪ paragraph 22 ∪ vi-rail 1 = **74 readings** fail ≥1. Rework-27 ∩ mechanical = 14. Paragraph fails outside rework-27 = **16** (b1l01-r1, b1l02-r1, b1l10-r1, b2l01-r1, b2l05-r3, b2l06-r3, b2l07-r1, b2l10-r2, b2l11-r3, b2l12-r2, b3l01-r1, b3l02-r3, b3l05-r1, b3l10-r3, b3l12-r3, b4l01-r3). Policy holds outside rework-27: b3l05-r1, b4l04-r2 (b3l08-r3 + b4l02-r1 sit inside the 27).
- Eligible ladder under a profile where D length-bands are advisory until the splitter fix: **51 now → 94 after the F4 mechanical sweep (script+glossary+vi-rail) → 109 after the paragraph-E pass → ceiling 138** post-rework/audit. With D length-bands binding as currently calibrated, post-sweep eligible drops to **36**.

## Discrepancies to reconcile on resume (draft PRD vs this session's measurements)

1. **The D treatment is the fork.** The draft binds D with two calibrations (dialogue-interjection carve-out for ≤3-Han complete utterances; band-scaled cap 60→80 for Books 3+) → ladder 26 → 40 → 53 → **72**, with 37 readings (22 run-ons, 15 paragraph, 4 overlap) sent to real edits. This session held D length-bands recorded-advisory until the label-stripping splitter fix ports from Python → ladder 51 → **94** → 109. Same corpus, different profile choice; the draft's is stricter and edit-heavier, this session's leans on the known splitter artifact. One recomputation under whichever profile Wedge signs settles it.
2. **Draft §2 says "81 readings fail min-4-Han"** — measured: 81 is the total D-failing reading count; the min-4-Han sub-rule accounts for 51 *reasons* (too-long dominates at 270). The carve-out's recovery estimate (26→40) should be re-derived from the sub-rule split.
3. Draft's blocked-37 (22 sent-long / 15 paragraph) vs this session's paragraph-22 (16 outside rework): counts differ because the draft nets out its D calibrations first. Reconcile after #1.
4. Agreements, for the record: 4 policy flags with 2 inside the rework-27; excluded-upfront 29; B/A/H advisory with named flips; three new F4 lints binding; idempotent publish keyed by path with `origin:"companion"`; recipe hardening (F1–F5) before B4L05+; grammar-index surface strings / private-pack decision / HV whitelist / Python-TS unification as the upstream four.

## Resume list

1. Wedge picks the D fork (draft's calibrated-binding vs advisory-until-splitter-fix) — everything downstream renumbers from that.
2. Re-run the eligible ladder under the signed profile; fix draft §2's 81/51 conflation; then the PRD's numbers are final.
3. Draft is untracked — commit once reconciled.
4. Unchanged inputs: QUALITY-REVIEW-2026-07-02.md (grades 42/69/27, F1–F5), ARTICLE-POSSIBILITIES.md (414 rows), _STATUS.json (stop point B4L04; B4L05–12 need Highlights pp.22+ vision-read; B5 floor 1000; B6 blocked).
