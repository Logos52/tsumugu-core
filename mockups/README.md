# Lesson Viewer + lesson-content generation

Internal tool for inspecting graded lessons against the encounter-rate formula.
Three columns: **the reading** (recency-coloured) · **current vocabulary** · **what was
encountered, bucketed by recency** (40 / 20 / 10 / 5 % + grammar). Lesson focus
(theme + learning objectives) sits above the reading.

Open `lesson-viewer.html` directly (file://). It is data-driven and book-agnostic.

## Files

| File | Role |
| --- | --- |
| `lesson-viewer.html` | the viewer (silk-seam tokens, vanilla JS) |
| `lesson-viewer-data.js` | **generated** — `window.LESSONS`. Do not hand-edit. |
| `build_lesson_data.py` | generator. `python3 mockups/build_lesson_data.py` |
| `lesson-highlights.json` | curated Highlights (title/theme/objectives/grammar) per unit |

`UNITS` at the top of `build_lesson_data.py` selects which units publish (now B1L01–03).

## WHERE THE DATA COMES FROM (so we stop rediscovering it)

1. **Vocabulary + pinyin + gloss + POS → the dangdai Anki deck**
   `private/dangdai-vocab/dangdai.csv`. Spans **all 6 books / 74 lessons**. ID
   `B3L07-II-04` = Book 3, Lesson 7, Dialogue II, term 4. A full lesson = Dialogue I +
   II. `Tags`: `Character` = the book's people (we drop them), `Name` = places/products
   (kept). **Never retype vocab from PDF OCR** — read the deck.

2. **Title / theme / learning objectives / grammar points → "Highlights of Lessons"**
   A single front-matter table in each *textbook* PDF (the `…A Course in Contemporary
   Chinese N.pdf` variant, NOT `(Workbook)`). Per-book page differs:
   **B1 = PDF p19, B2/B3/B5 = p7, B4 = not auto-located (OCR variance — locate by hand),
   B6 = textbook PDF absent from `private/dangdai-pdfs/`.**
   - `private/dangdai-pdfs/extract_highlights.py [book]` dumps raw text →
     `private/dangdai-pdfs/highlights/raw-bN.txt`. OCR is rough — **verify against the
     page image** (`Read` tool, `pages=N`) before promoting into `lesson-highlights.json`.
   - Objectives + grammar lists are factual metadata, safe to reproduce. They are a
     **soft** guide for shaping readings.

3. **PRIOR detailed grammar extraction — REUSE, don't redo.** A large earlier effort
   already parsed the per-lesson grammar sections:
   - `private/dangdai-grammar-index.*.json` (+ `.FINAL.json`, `.merged.json`, per-source
     grok/composer/qwen/v2) and `private/dangdai-grammar-reconcile-report.md` — **covers
     books 1–5 incl. Book 4** (lessons 1–12). 1255 merged points, mostly `review` status,
     needs reconciliation. Check here before extracting grammar again.
   - `private/dangdai-pdfs/_grammar_slices_composer.jsonl` — raw grammar-section text for
     books **1, 2, 3, 5** (NOT 4). Used to verify L2/L3 points here.
   The clean *short* list still comes from Highlights (2); the index above is the detailed
   point inventory.

4. **Readings → ORIGINAL, hand-authored. *** COPYRIGHT *** **
   Do **not** reuse textbook dialogues or the QA pilot (`scripts/gen/qa/pilot/`) — those
   copy the book's cast (王開文 / 陳月美 / 李明華) and scenes. Authored readings live in
   `READINGS` in `build_lesson_data.py`: generic speakers (甲/乙/丙), invented surnames
   (高/林/周), original everyday scenes shaped by the lesson's objectives.

## Rules (learned the hard way)

- **Copyright:** original readings only; drop the deck's `Character` person-names.
- **Naturalness > hard gate.** In-band vocabulary control is **advisory**:
  `advisory_scan()` reports the out-of-band footprint and **never fails the build**.
  Common basics a touch early (她, 和, 家裡, 常常) are fine. Don't contort sentences to
  dodge a word — the formula doc says naturalness wins over the encounter floor.
- **Objectives are soft.** Shape scenes toward them; don't force them.
- **Encounter formula** (40/20/10/5 over content words) is the *display* lens here.
  The real production gate is `scripts/gen/qa/check_reading.py` +
  `docs/super-app/textbook-companion/ENCOUNTER-FORMULA-AND-PILOT.md`.

## Add a lesson

1. `extract_highlights.py <book>` → verify the dump → add the unit to `lesson-highlights.json`.
2. Author original `READINGS[unit]` in `build_lesson_data.py`.
3. Add the unit to `UNITS`. Vocab arrives automatically from the deck.
4. `python3 mockups/build_lesson_data.py` and reload the viewer.

## Open gaps

- Locate Book 4's Highlights page (auto-extract missed it); reconcile its grammar from
  the existing `dangdai-grammar-index.*` rather than re-extracting.
- Obtain a Book 6 textbook PDF (only the deck has B6).
- Promote B1L04+ and other books once Highlights are verified.
