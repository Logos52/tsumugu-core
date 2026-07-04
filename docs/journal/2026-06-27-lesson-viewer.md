# 2026-06-27 — Lesson Viewer + book-agnostic content pipeline

A standalone internal tool to inspect graded lessons against the encounter-rate
formula, plus the generation pipeline behind it. Built across one long session with a
lot of mid-course corrections from Wedge. **Resume from here tomorrow.**

## What exists now (all green)

`tsumugu-core/mockups/`
- `lesson-viewer.html` — 3-column viewer (silk-seam tokens, vanilla JS, opens file://).
  - **Left**: the article, recency-coloured, speaker labels greyed; lesson focus card
    (theme + learning objectives) above it.
  - **Middle**: combined-lesson vocabulary as **bare characters** (no box, no pinyin),
    heat-coloured by how many of the 3 articles use each word; a **coverage panel**
    (`vocab 40/40 ✓ · grammar 6/6 ✓`, per-article counts, legend).
  - **Right**: "encountered, by recency" 40/20/10/5 % buckets + the lesson's official
    grammar points (present/absent + carried-over).
  - **Lesson swapper** strip below the header — one column per lesson with its 3
    articles stacked (R1/R2/R3); jump to any prior lesson/article in one click.
    (Replaced the header lesson-tabs + left-column article-pills.) Palette + light/dark.
- `build_lesson_data.py` — generator → `lesson-viewer-data.js` (`window.LESSONS`).
  Two gates: `coverage_qa()` HARD (3 articles, 100% vocab+grammar union) and
  `advisory_scan()` SOFT (out-of-band footprint, never fails).
- `lesson-highlights.json` — curated title/theme/objectives/grammar per unit (B1L01–03).
- `README.md` — the runbook (sources, rules, how to add a lesson). **Read this first.**
- `private/dangdai-pdfs/extract_highlights.py` — book-agnostic Highlights dumper.

Current data: **B1L01–B1L06** (Welcome / Family / Hobbies / Shopping / Food /
Locations), 34–41 vocab each. Each lesson = 3 original articles, union = 100% vocab +
grammar (all pass `coverage_qa` first-build). Recency cascade fully populates from L4 on
(40/20/10/5 + grammar). Swapper shows all 6 as columns. Added grammar pattern `v1v`
(softened action V一V) alongside `anota`.

**Known skew (improvement target):** the recency % buckets count ALL vocab incl.
function words, so L1's permanent substrate (你/我/是/的/不/很) inflates the "3 lessons
back" row above the "1/2 back" rows — display reads ~54/8/16 not 40/20/10. The right-col
caveat flags it; the real fix is a function-word (STOPWORDS) toggle so the bars match the
content-word formula.

## Decisions locked today (chronological)

1. **Full lessons, not halves.** Recency runs lesson-to-lesson (B1L01→B1L02→B1L03).
2. **Vocab source = the dangdai Anki deck** `private/dangdai-vocab/dangdai.csv` — not OCR,
   not hand-typed. Spans all 6 books / 74 lessons. ID `B#L##-dlg-term`.
3. **Fuse Dialogue I + II into ONE lesson** (no `-1/-2` split) — for authorship and
   student findability. One vocab list, one grammar set, one article set per lesson.
4. **Copyright: original readings only.** The QA pilot / textbook dialogues reuse the
   book's cast (王開文/陳月美/李明華) and scenes → Wedge called it plagiarism. We use
   generic speakers 甲/乙/丙/丁 + invented surnames 高/林/周, and dropped the deck's
   `Character` person-names from the viewer.
5. **Grammar + objectives + title = "Highlights of Lessons"** front-matter table
   (Book 1 PDF p19). Corrected earlier mistakes: L1 grammar is A-not-A/嗎/affirmative/
   不/很/呢 (NOT 什麼/哪); L2 is 的/的/有/都/measures (NOT 幾/沒/誰); L3 adds 吧.
6. **Book-agnostic pipeline.** Deck = all books automatically; `extract_highlights.py`
   locates+dumps each book's Highlights page (B1 p19, B2/B3/B5 p7; B4 not auto-located;
   B6 PDF absent). Curated into `lesson-highlights.json`.
7. **Reuse prior grammar work.** A large earlier extraction already exists —
   `private/dangdai-grammar-index.*.json` + `dangdai-grammar-reconcile-report.md`
   cover **books 1–5 incl. Book 4** (1255 pts, mostly `review`). Don't re-extract;
   reconcile. (Wedge flagged that I kept forgetting this → wrote it down.)
8. **Naturalness > hard gate.** In-band vocab control is ADVISORY only; common basics a
   touch early (她/和/家裡/還/先) are fine. Don't contort sentences. Objectives are a
   SOFT shaping guide.
9. **UI: bare characters** in the middle (Wedge knows English — gloss/pinyin on hover
   only), and **longer readings** (~8–10 lines).
10. **3 articles per lesson, 100% union coverage**, enforced by `coverage_qa`, and made
    visible by the coverage panel + character heat-map.

## Encounter-rate smoothing (same-day, session 2)

**Problem (measured).** Raw encounter counts are Zipf-skewed: function words flood
(你×20, 在×16, 塊×7), rare content words starve (圖書館×1, 對不起×1, 名字×1). Across the
6 lessons, 10–26 content words per lesson appear in only ONE of the 3 articles. Two
symptoms: (a) the recency 40/20/10/5 buckets read wrong because L1's function substrate
inflates the "3-back" row; (b) rare target words get a single, clustered exposure.

**Principle.** Two word classes, opposite treatment. Function words (pronouns, particles,
是/不/很/都/也/在, measures, determiners, aux) self-saturate from volume — exclude them
from any target. Content words, especially the rare tail, need a deliberate floor. We
floor by **spread, not raw count** (spacing effect: 8 exposures spread > 8 clustered):
target = each content word in ≥2 of the 3 articles, rarest tier in all 3. A graduated
count target `E = E_min·(1 + α·rareness)` collapses to this floor in practice because the
corpus self-measures rareness (starved words bubble to the bottom). Builds on the
existing encounter formula (`E_min≥8`, `ρ=2` rarest tier) in
`docs/super-app/textbook-companion/ENCOUNTER-FORMULA-AND-PILOT.md`.

**Decisions.**
- The smoothing math lives in the **QA layer, advisory** — NOT the authoring prompt.
  Authoring stays "natural + cover all vocab." Naturalness still wins.
- **No full 6×3 rewrite.** The check flags rare-content singletons; we patch those
  surgically (lift into a 2nd article). Genuinely-rare words may stay thin (the lifetime
  floor accrues across later lessons).
- The content/function split is shared with the recency-bucket fix.

**What we built today (minimal version).**
- `build_lesson_data.py`: a content/function classifier (POS `Ptc/Adv/Det/M/Prep/Vaux/
  Conj` + pronouns + 是; tunable STOPWORDS knob), a `func` flag on emitted vocab, and
  `check_encounter_balance()` — per lesson it reports the content-word spread distribution
  (#in 1/2/3 articles) and names the under-spaced singletons. Advisory, never fails.
- `lesson-viewer.html`: recency buckets default to **content-only** (toggle to show all) —
  fixes the 40/20/10/5 skew; coverage panel gains a **content-spacing** stat; under-spaced
  content words are tinted in the middle column so the target is visible.

**How to check it:** read the `check_encounter_balance` block in the build output, and look
at the amber-tinted (under-spaced) characters + the "content spacing X/Y" stat in the viewer.

**Finding once function words are removed:** the recency buckets flip from "function-padded"
(L4 ≈ 54% current) to honest content-only (L4 ≈ 78% current / thin review). So the real gap
is NOT the display — it's that the articles are topically siloed and barely recycle prior
*content* vocab, so the 40/20/10/5 regression isn't actually happening for content words.
The function substrate was masking it. The fix is deliberate cross-lesson content recycling
when authoring (the regression schedule), NOT a rewrite of the current set. Spacing is
advisory; genuinely-rare words may stay thin. No 6×3 rewrite.

## Open items — tomorrow

- **Naturalness polish:** reread the 9 articles; tighten anything that still reads
  textbook-stiff. (Wedge is the judge here.)
- **More lessons / books:** author 3 articles each for B1L04+; for other books, verify
  their Highlights into `lesson-highlights.json`, then author. Vocab is automatic.
- **Book 4:** locate its Highlights page; reconcile B4 grammar from the existing
  `dangdai-grammar-index.*` (don't re-extract). **Book 6:** obtain the textbook PDF.
- **Deeper QA:** coverage is the union gate only. The real encounter-formula checks
  (recycle, regression buckets, encounter floor) live in
  `scripts/gen/qa/check_reading.py` — wire the 3 articles through it before volume.
- **Productization:** decide whether this stays a standalone mockup or feeds the real
  tsumugu-core app / generation pipeline.

## Resume in one line

`open mockups/README.md` (runbook) + this journal; edit readings/highlights in
`mockups/build_lesson_data.py` + `lesson-highlights.json`; `python3
mockups/build_lesson_data.py`; reload `mockups/lesson-viewer.html`.
