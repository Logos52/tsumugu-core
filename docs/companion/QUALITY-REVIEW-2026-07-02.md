# Companion corpus quality review — 2026-07-02

**Verdict: the 138-article corpus is publishable in the majority after one mechanical sweep and 27 targeted reworks; one article must be rewritten on policy grounds regardless of quality (B3L08 R3 fabricates a biography of 吳寶春, a real living person). Grades across all 138: 42 strong · 69 acceptable · 27 needs-rework.** Book 3 is the strongest (26/36 strong); Book 1 is the weakest (6/45 strong, 13/45 needs-rework) — the earliest-authored lessons carry the most defects, which matches the recipe maturing as the run progressed. Method: six independent readers (Sonnet), one per book chunk, harsh-rubric grading with quoted evidence; structured findings aggregated here; converter/gate facts from the verified `out/companion/GATE-REPORT.md` run.

## 1. Per-book grade distribution

| Book | Articles | Strong | Acceptable | Needs-rework |
|---|---|---|---|---|
| B1 (L01–15) | 45 | 6 | 26 | 13 |
| B2 (L01–15) | 45 | 5 | 30 | 10 |
| B3 (L01–12) | 36 | 26 | 8 | 2 |
| B4 (L01–04) | 12 | 5 | 5 | 2 |

Full per-lesson grade table + the 27 rework items with quoted issues: appendix at the end.

## 2. The five systemic failure modes (recommendations attach to each)

**F1 — Same-event-retold inside a lesson (the #1 defect, drives most B1 reworks).** The three articles of a lesson retell one event instead of three situations: B1L01 (all three retell the airport arrival — the known scene-variety flag, confirmed unresolved), B1L02 R3 clones R2's family-portrait template, B1L05 R1/R3 both center the same beef-noodle shop, B1L07 R1/R2 narrate one character's day twice (sharing a verbatim schedule line), B1L12 (all three retell the same study-worry arc and reuse 念到很累 verbatim ×3), B1L13 R3 diaries R1's party from the recipient's POV (reusing R1's line verbatim, contradicting R1 on location), B1L15 R3 re-beats R1's illness scene, B2L01 R3 near-copies R1's direction script, B2L09 R1/R3 share the foreign-trip-recap shape.
*Recommendation:* add a **scene-fingerprint check** to the authoring recipe and critic (participants + setting + event must differ per article; cross-article verbatim-line grep ≥8 chars = fail). Rework the listed articles by replacing the duplicate scene, never by paraphrasing it.

**F2 — Template reuse across lessons.** The elderly-shopkeeper monologue recurs near-verbatim in B3L04/B3L09/B3L11 R2 (same 林 surname, same age bracket, same 三十幾年 duration, same 人情味 closer); 4 of 7 B2b lessons close on an identical interviewer shell; 4 of 12 B3 lessons use the same veteran-reflects narrator; B4L02–04 run the identical 對話/自述/報導 triplet three lessons straight.
*Recommendation:* corpus-level variety audit at authoring time — the per-reading opener/repetition check (E) exists, but nothing compares across readings; add a cross-lesson template lint (narrator archetype + format triplet rotation) to `check_candidate.py`, and rotate B4's fourth format back in when authoring resumes.

**F3 — Format execution gaps.** 報導 without a news lead (B4L03 R3 opens as a generic essay; contrast B4L02 R3's clean 本報訊 lead), 對話 as customs-lecture chains (B2L15 R1) or objection→reassurance checklists (B3L02/B3L09 R1), 問答 answers as encyclopedia lectures (B3L03 R3), narrative as vocabulary checklists (B4L01/B4L02 R2's 我也 chains, B1L14 R2's X說喜歡Y drill), grammar-point drilling (B4L02 R1 uses 免得 six times).
*Recommendation:* per-format execution checklists in the recipe (報導: lead + dateline + ≥2 quoted voices; 對話: no speaker explains customs for >2 turns; 自述: one coherent arc, no topic sprawl; cap any single grammar marker at 3 uses per article).

**F4 — Compliance mechanicals (scriptable).** ASCII halfwidth punctuation throughout B2L13 + B2L15 (all 6 articles — the bulk of the gate's script-check failures); 台/臺 inconsistency corpus-wide; surname-policy breaks in B2L04 (黃主任, 陳美玲 — a near-collision with the banned 陳月美) and B2L08 (張師父/陳師父); real-entity references: **B3L08 R3's invented biography of 吳寶春 (rewrite now — fabricated facts about a living person)**, B3L05 R1 names 五月天, and (flagged from the possibilities QA) B4L02 R1 names 雲門/國家戲劇院 and B4L04 R2 quotes 邱吉爾.
*Recommendation:* extend `check_candidate.py` with three deterministic lints — fullwidth-punctuation class check, surname whitelist (甲乙丙丁/高林周 + explicit ban list), and a real-entity blocklist (persons, bands, companies; historical figures ≥70y deceased exempt — Wedge to confirm the 邱吉爾 line under that rule). Run once over the whole corpus; fix mechanically.

**F5 — Continuity and small factual slips.** B1L07 R2's timeline error (bank ends 1:30, "almost late" for 2pm), B1L06 R3's geography contradiction (lives in mountain dorm, trains to Hualien as a separate destination), B1L01 R3's antecedent-less plural, B1L15 R3 sends an office worker to a school 健康中心, B4L02 R1 attributes 演技 to a director, B2L09 R2's translated sardine idiom missing 罐頭, B3L03 status-metadata drift (B2L04–08 files say `draft` while `_STATUS.json` says DONE).
*Recommendation:* one continuity-focused critic pass per lesson at authoring time (cheap, catches all of the above class); reconcile the per-file `status` fields with `_STATUS.json`.

## 3. What to model (exemplars the readers singled out)

B2L10 R1 (dumpling party — doorbell interruption, comic banter), B2L12 R1 (fast-food banter, twist ending), B2L07 R2 (chase-the-garbage-truck — real story pull), B3L07 R1/R2 (breakup-over-a-dog pair), B3L01 R3 + B4L02 R3 (properly-led 報導), B4L04 R1 (natural grammar integration + callback joke), B1L03 R2 / B1L08 R2 / B1L13 R2 (distinct, sensory, idiomatic). The common property: a specific event with tension and resolution, written before the vocabulary is counted.

## 4. Gate facts (converter run, verified)

138/138 convert cleanly; token streams reproduce source text character-exact; VI bridge morphemes on every glossary entry sampled. The zh-Hant segmentation defect is fixed (greedy longest-match via a new `segmenter` option on `populateDualRail`, default behavior untouched; plus surface-form expansion for the two alternate-form CSV entries like `臺灣（＝台灣）`): b1l01-r1 ciMeasured 0.5599 → 0.7447, corpus CI range 0.42–0.75 → 0.5566–0.9242, totalWords now counts real words. 0/138 still pass the full A–H gate, for structural reasons that are findings about the *infrastructure*, not the prose: check A cannot run (private def-level pack absent from this repo), the grammar-marker check matches against category labels rather than surface strings (index data-shape issue), and the polyphone check flags HV-ambiguous particles by design — all three fail 138/138 wholesale. Real per-reading failures underneath the structural noise, post-fix: glossary 26 (unknown words with no usable CSV gloss: 臺北/訊息/支援/瞭解/傢俱 class) · script 58 (mostly the B2L13/15 punctuation + word-level 台→臺 variants the better segmentation now exposes) · paragraph 22 · vi-rail 1. The publish profile — which checks are binding for converted companion content vs generated content — is owned by PRD-Companion-Articles.md.

## 5. Rework priority

1. **Now, policy:** rewrite B3L08 R3 (吳寶春). Audit B4L02 R1 / B4L04 R2 / B3L05 R1 real-entity references under the F4 blocklist rule.
2. **One session, mechanical:** F4 sweep (punctuation, 台/臺, surnames) — scriptable, then hand-verify the 6 punctuation articles.
3. **Two to three sessions:** the 27 needs-rework articles, batched by failure mode (F1 batch is the largest); each rework re-runs `check_candidate.py` + the new lints.
4. **Before any new authoring (B4L05+):** land F1–F4 checks in the recipe so the next 54 articles don't inherit the modes.

## Appendix A — per-lesson grades

(Grades: S=strong, A=acceptable, R=needs-rework, in R1/R2/R3 order.)

B1L01 A·R·R | B1L02 A·A·R | B1L03 A·S·A | B1L04 A·A·A | B1L05 A·A·R | B1L06 A·A·R | B1L07 A·R·A | B1L08 A·S·A | B1L09 A·A·R | B1L10 A·A·R | B1L11 A·S·S | B1L12 R·R·R | B1L13 A·S·R | B1L14 A·A·S | B1L15 A·A·R | B2L01 A·A·R | B2L02 A·A·A | B2L03 A·A·A | B2L04 R·R·A | B2L05 A·A·A | B2L06 A·A·A | B2L07 A·S·A | B2L08 A·A·R | B2L09 S·A·A | B2L10 S·A·A | B2L11 A·A·A | B2L12 S·A·A | B2L13 R·R·R | B2L14 S·A·A | B2L15 R·R·R | B3L01 S·S·S | B3L02 A·S·S | B3L03 S·S·A | B3L04 S·A·S | B3L05 A·S·S | B3L06 S·S·S | B3L07 S·S·S | B3L08 S·S·R | B3L09 A·A·S | B3L10 A·S·S | B3L11 S·R·S | B3L12 S·A·S | B4L01 A·A·S | B4L02 R·A·S | B4L03 A·S·R | B4L04 S·S·A

## Appendix B — the 27 rework items

Machine-readable list with per-article quoted issues: `docs/companion/qa-rework-2026-07-02.json` (27 entries); the failure-mode assignments above cover all 27. The three lessons that rework wholesale: B1L12 (all three — same arc + verbatim collocation ×3), B2L13 and B2L15 (all three each — the ASCII-punctuation pair, plus stiff phrasing in L13 and lecture-shaped dialogue in L15).
