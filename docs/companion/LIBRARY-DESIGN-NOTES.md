# Library — design notes & variants

Working record for the v1 Library page. Decisions first, pointers to the live mockups,
open questions at the end. Follows `../DESIGN-PRINCIPLES.md`.

## Shape (settled)
- **Books set where you are.** A shelf of the five 冊 (volumes) at the top of the band;
  selecting one is "choose your level / where you are on the journey."
- **Interest leads the content.** Below the band, a title-led spreadsheet: the
  reader-language **title** is the prominent column (EN or VI by rail), the Chinese
  title / lesson / band ride along as quiet columns, and a faint **format icon** is the
  only colour. No raw first-lines, no redundant labels.
- **Cold-start.** Nothing logged; a fresh reader lands on Volume 1, Part 1.

## The right-of-books slot — DECIDED: book-split
The whitespace to the right of the books is **load-bearing** (it must hold content, per
Wedge — "you keep filling it and taking it out later"). Two treatments were built:

- **✅ Shipping — `library-v1.html`: the book-split panel.** The selected volume's
  **three 部分 (parts)** as a small map that **filters** the spreadsheet. Chosen because
  the top band is "where you are," so the volume's own structure belongs there; it also
  gives the three-part split a real home and avoids repeating a reading that's already in
  the list.
- **🅰 Preserved — `library-v1-featured.html`: the Featured card.** Same slot, holding the
  volume's standout reading (title + one-line premise + Read →). Kept live so we can
  revisit; it's the better slot-filler if we later decide interest should lead *up here*
  too rather than only in the list.

Both live under `mockups/explorations-2026-07/unified/`.

## The three-part split
Each volume divides into three parts by lesson count:

| Volume | Lessons | Parts |
|---|---|---|
| 第一冊 / 第二冊 | 15 | 5 · 5 · 5 → L1–5 · L6–10 · L11–15 |
| 第三冊 / 第四冊 | 12 | 4 · 4 · 4 → L1–4 · L5–8 · L9–12 |
| 第五冊 | 10 | **4 · 3 · 3** → L1–4 · L5–7 · L8–10 *(assumed — confirm)* |

Content authored so far (from `content/titles.json`, 138 readings): 第一冊 全 (15 lessons),
第二冊 全 (15), 第三冊 全 (12), 第四冊 **Part 1 only** (L1–4), 第五冊 none. Empty parts render
dimmed with a "soon" count; unpublished volumes show "Not yet published."

## Sort options
`Lesson` (default) · `Format` · `Title`. Sorting acts within the active part. Lesson =
curriculum order; Title = A–Z on the lead (reader-language) title.

## Open
- **第五冊 split** — 4·3·3 assumed; Wedge to confirm the real boundary.
- **Covers (v2)** — anime covers (Grok, `COVER-PROMPT-GROK.md`) replace the title-only
  rows once generated; interest gets a picture, not just a title.
- **Wire to app** — this mockup reads the real `content/titles.json`; porting to the live
  app (`home.ts` / catalog view) is the follow-up once the design is locked.
