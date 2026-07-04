# Companion-readings resize run — 2026-07-01 (resumable)

**What:** Re-author the ACCC companion readings (lesson viewer / `build_lesson_data.py`) so each article is a real read, not the old ~77-Han snippet. Wedge's decisions this session:

- **Size:** per-article floor ≈ **1.5× the textbook article** at that level (~**250 Han** at Book 1), scaling up by book. Justified because our reader has click-to-reveal dictionary + sentence translations, so a longer/denser article is an *easier* read than the textbook → we can exceed textbook length.
- **Count:** **keep exactly 3 articles** per lesson; union still covers **100% of the lesson's vocab + grammar** (the HARD gate). Deliberately ~3× the textbook's reading volume — accepted.
- **Variety:** vary story/topic AND format across the 3 articles (對話/自述/短文/問答/日記…) and across lessons.
- **Copyright:** original scenes only; generic speakers 甲乙丙丁 / 高林周 + invented surnames; NEVER the textbook cast (王開文/陳月美/李明華).
- **Naturalness > floor:** hit 250 via richer natural scenes, not padding; if a lesson can't reach it naturally, get close and flag (naturalness wins).

**Size evidence:** `docs/super-app/textbook-companion/ARTICLE-SIZE-SAMPLES.md` (10 real ACCC articles measured: 98→870 Han across Books 1→5).

## Pipeline / gate (the "equation")
- Vocab per lesson = dangdai deck (auto, all books). Grammar/theme/objectives = `mockups/lesson-highlights.json` (curated only B1L01–06; **L07–15 need curation**).
- Gate = `mockups/check_candidate.py B1L0X drafts/B1L0X.json --min 250` → exits 0 iff exactly 3 articles, 100% vocab+grammar union, each ≥ floor.
- Spec for authors = `mockups/print_lesson_spec.py B1L0X`.
- Encounter-formula spread (40/20/10/5, floor-8 lifetime touches) is ADVISORY — see `ENCOUNTER-FORMULA-AND-PILOT.md`.

## How to resume
1. Read `mockups/drafts/_STATUS.json` — per-lesson state + the live workflow runId.
2. Each verified lesson is staged at `mockups/drafts/B1L0X.json` (durable). Re-verify any with the gate above.
3. To integrate staged drafts into the viewer: write each lesson's `readings` into `READINGS[...]` in `mockups/build_lesson_data.py` (set `UNITS` to the done lessons), then `python3 mockups/build_lesson_data.py` (coverage_qa must pass) → reload `mockups/lesson-viewer.html`.
4. Backup of the pre-run data file: `scratchpad/build_lesson_data.BACKUP.py` (this session's scratchpad).

## Scope / waves
- **Wave 1:** author B1L01–06 at ≥250 (highlights ready). 
- **Wave 2:** curate B1L07–15 Highlights (PDF Book 1 p19 table) → then author them. 
- **Later:** Books 2–5 need their Highlights (B2/B3/B5 = PDF p7; B4 manual, image-only PDF; B6 PDF absent).

## Status — see `mockups/drafts/_STATUS.json` for the live table.

---

## Session 2 (2026-07-01, later) — Books 2 + 3 finished, STOP for reassessment

Opus drove orchestration; **all authoring / checking / repair ran on Sonnet 5** (Wedge's call). Workflow `wf_6ef9a903-3d6` (author → critic → conditional repair, one agent per lesson, + a sweep-critic over the 5 prior-session B2 drafts).

**Book 3 Highlights — page location corrected.** The real 各課重點 "Highlights of Lessons" table is at **PDF pp.19–23**, not "p7" (p7 is just the table of contents). `extract_highlights.py` / `raw-bN.txt` grab the TOC hit, so they're unreliable — transcribed all 12 B3 lessons' title/theme/objectives/grammar **directly off the page images** (Read tool `pages=`), double-checking grammar→lesson alignment by both cell order and the Bits-of-Chinese-Culture pairings (Abacus→online shopping, Geographic Names→Story of Taiwan, etc.). Added a `re` (regex) detector type to `gram_hit()` for two-blank patterns (不但…還… / 一方面…一方面 / V來V去 backref). 87 B3 detectors, all compile-checked. Same page caveat almost certainly applies to B4/B5.

**What shipped (all green + integrated in the viewer, 42 lessons total = B1×15 + B2×15 + B3×12):**
- **Book 2 complete.** Authored the 5 gaps (L04, L06, L13, L14, L15); repaired L08 + L10 (R1/R2 were under the 450 floor → lengthened with natural added scene, no padding); sweep-critic confirmed L05/L07/L09/L11/L12 clean. All 15: grammar 100%, vocab 100%.
- **Book 3 complete.** All 12 at floor **750** (sizes mostly 800–900, B3L12 ~1020). Grammar 100% on every lesson; vocab 100% except two **within-budget deck-artifact deferrals** — B3L08 defers `EMBA` + `X分之Y`, B3L10 defers `照X光` (Latin-containing pseudo-entries / pattern annotations). `X光` itself is used naturally in B3L10 (standard Taiwanese medical orthography, like 卡拉OK / T恤).

**Critic caught + auto-repaired 3 lessons** (verified deduped: every flagged phrase now occurs exactly once):
- **B2L15** — R1/R2/R3 recycled 初五是迎財神的日子 / 全家圍爐的時間 / 才有過年的氣氛 across articles → reworded.
- **B3L05** — R1 had two consecutive same-speaker turns (attribution slip) → fixed (0 consecutive now).
- **B3L07** — R1/R2 copy-pasted the dog-misbehaviour beat (有時候還會咬家具 etc.) → rewritten with distinct detail.

Naturalness: ~85% "good", rest "ok" (B2L06, B3L01, B3L03, B3L05, B3L07 — the vocab-dense ones). No copyright leaks (no textbook cast), no pinyin/English in any text.

**Independent re-validation** (not trusting the agents): all 27 B2+B3 drafts `RESULT: PASS`; `build_lesson_data.py` coverage_qa HARD gate green; lesson-viewer-data.js rebuilt.

**Paused after B3 for reassessment.** Then resumed for Book 4 lessons 1–4 (below).

---

## Session 3 (2026-07-01, later) — Book 4 lessons 1–4, then STOP

Wedge: "do book 4, lessons 1–4… then pause there (that's about where my Chinese lessons stopped, so up to here will be valuable for me)." Sonnet 5 again (workflow `wf_4f0e8f8c-bc9`).

**B4 Highlights located + curated (L01–04).** Book 4's table is at **PDF pp.20–21** (printed XVIII–XIX). **Book 4's PDF has NO text layer at all** (font corruption — confirmed in `ARTICLE-SIZE-SAMPLES.md`), so it was vision-read straight off the page images. Book 4's objectives are **Chinese** in the source (B1–B3 were English) — translated faithfully to English for viewer consistency. Lessons: L1 十七歲還是二十五歲？(網路/Internet) · L2 眼睛、耳朵的饗宴 (藝術活動/Arts) · L3 雲端科技 (科技/Technology) · L4 床該擺哪裡？(風水/Feng Shui). 32 detectors, compile-checked; a few "summary of usages of 就/才" + particle (等/都) points use broad markers as intentional coverage proxies (the explicit grammar title drives the author). Added `re`-pattern hinting to `print_lesson_spec.py`'s `greq()`.

**Result — all 4 clean on the first author pass, NO repairs:** floor **950**, sizes ran **983–1173 Han**. Grammar 8/8 every lesson, vocab **100%** (zero deferrals), copyright + bare-vocab sweep CLEAN. Naturalness: L01/L03/L04 "good", L02 "ok". Independently re-validated (all `RESULT: PASS`), viewer rebuilt — **46 lessons now integrated (B1×15, B2×15, B3×12, B4×4).**

**STOPPED at B4L04 per Wedge** (matches where his own coursework reaches — this is the high-value stretch for him). Remaining if/when resumed: **B4L05–12** (floor 950; curate Highlights from PDF pp.22+ — vision-read, no text layer) and **B5L01–10** (floor 1000; re-verify the page first). **B6 stays blocked — no textbook PDF.** Workflow scripts: `author-companion-b4.js` (clone → swap LESSONS for B4L05–12) and `author-companion-b2b3.js`.
