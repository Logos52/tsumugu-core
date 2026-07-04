# Handoff — Library page (for Fable)

You're taking over the **Tsumugu Beta Library** design. The previous attempts drifted
and frustrated Wedge (books too wide/tall, lesson titles wrapping, whitespace, drift
from the chosen layout). This doc is the single source of truth. Read it fully before
writing code. **Wedge is exacting about design — do not cut corners or "improve" past
what's specified.**

Base file to fix: **`library-columns.html`** (this folder). Target look: **Option 5** in
**`library-layout-options.html`**. Binding rules: **`../../docs/DESIGN-PRINCIPLES.md`**.
Decisions log: **`../../docs/companion/LIBRARY-DESIGN-NOTES.md`**.

---

## The chosen layout — Option 5, parts to the right of the books

```
┌────┬────┬────┐   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 一 │ 二 │... │   │ 第一部分 L1–5│ │ 第二部分L6–10│ │第三部分L11–15│
│冊  │冊  │    │   │ 課1  Title   │ │ 課6  Title   │ │ 課11 Title   │
│ ↕  │    │    │   │ 課2  Title   │ │ 課7  Title   │ │ 課12 Title   │
│slim│    │    │   │ 課3  Title   │ │ 課8  Title   │ │ 課13 Title   │
│shrt│    │    │   │ 課4  Title   │ │ 課9  Title   │ │ 課14 Title   │
└────┴────┴────┘   │ 課5  Title   │ │ 課10 Title   │ │ 課15 Title   │
   the shelf       └─────────────┘ └─────────────┘ └─────────────┘
   (LEFT)                the three parts fill the space to the RIGHT
```

- **Books = a slim, short shelf on the LEFT.** Five volume spines (第一冊…第五冊).
- **The three parts fill the space to the RIGHT of the books** as three columns.
- The shelf and the columns start at the same top and read as one band. No dead
  whitespace to the right of, or below, the books at cold-start.

### Wedge's exact fixes to the current base file (all mandatory)
1. **Slimmer books.** The spines are too wide. Make them noticeably narrower. Slim
   spines free horizontal room for the columns (which fixes #3).
2. **Shorter books.** They're too tall (currently stretched to ~200px). The shelf
   should be short. Its height follows the columns' cold-start height, not a fixed 200.
3. **Every lesson title on ONE line (two at the absolute most).** Right now titles wrap
   to 2 lines because the type is too small and the columns too narrow. Fix by: slimmer
   books → wider columns, and a readable type size. One line is the goal.
4. **It must actually look like Option 5** — clean single-line rows in tidy columns.
   Open `library-layout-options.html`, look at Option 5, match that restraint.
5. **Click the 課# → that lesson's readings open underneath it** (accordion, inline).
   The click target is the lesson row; the readings appear directly beneath, indented.

---

## The hierarchy (Wedge stated this twice — honor it exactly)

**Book → Part → Lesson → Reading.**

- **Book (volume).** Click a spine on the shelf → its three parts load in the columns.
- **Part (第一部分 = L1–5).** Each column *is* a part and shows **all its lessons** (課1…課5).
- **Lesson (課1).** Click a 課# → **only that lesson's readings** expand underneath it
  (its ~3 readings, as title rows). Click again (or the 第N部分 header) → collapse.
- **Reading.** Click a reading → opens in the Reader.

So a column always shows the full list of that part's lessons; drilling into a lesson
reveals its readings. Nothing else expands by default.

Each **lesson row** shows `課N` + the lesson's leading title (so *interest* leads, not a
bare number). One line. The **reading rows** under an open lesson show a faint format dot
+ the reader-language title + the Chinese title.

> Ambiguity to confirm with Wedge if unsure: whether the lesson row's one-line label is
> the lesson's representative reading title (current assumption) or a lesson topic. He
> wants a *title* there and it must fit one line.

---

## Non-negotiables Wedge has repeated (the previous agent kept dropping these)

- **No whitespace to the right of the books, ever.** This has been raised ~4 times. The
  columns fill that space. The band must not leave a gap beside the shelf.
- **No sloppy gaps.** No label pushed to one edge with a value at the other and dead air
  between (the `第一部分 ……… 15篇` row was rejected). No dot-leaders-as-filler, no
  decorative lines. If a space exists, it must carry content or be deliberate breathing room.
- **Interest leads content.** Titles are the hook. Never lead with a raw Chinese sentence
  or a bare 課#. (Covers/images are v2, not now.)
- **Show, don't tell. No redundancy.** No captions narrating the layout, no fact stated twice.
- **One accent, held quiet.** Single teal accent: `#0C8DAF` (light) / `#43ADC6` (dark).
  It marks selection/state only, never decorates, **never glows** — tone it down in dark.
  Format categories get *faint* signifier dots only (small glyphs, not fills).
- **Cultural grain.** Books look like books; the selection mark goes **on top** of a spine,
  never on the left edge (Chinese reads top-down). Taiwanese, **no red** (mainland-coded).
- **Cold-start first.** Design the fresh, nothing-logged state. No "Continue" as the spine
  of the page. No progress bars in the baseline.
- **Timeless & Apple-minimal.** Durable conventions (a shelf, a table of contents),
  precise spacing/type, nothing trendy. Minimal = more precision, not more parts.
- **Fonts:** Inter + PingFang TC for the interface; **LXGW WenKai TC** only for the
  Chinese reading text (the zh titles). Cool neutral palette.
- **Dark mode must work** and not glow.

---

## Data (already embedded in the base file; keep it real)

- Source: **`../../content/titles.json`** — 138 readings, each `{zh, en, vi, lesson,
  format}`. The base file has them inline in `var BOOKS=[…]`; reuse verbatim.
- **Coverage:** 第一冊 15 lessons · 第二冊 15 · 第三冊 12 · 第四冊 **L1–4 only (Part 1)** ·
  第五冊 **none**. Empty parts render a quiet "coming soon"; 第五冊 is dim/unpublished.
- **Part split by volume length:** 15 lessons → **5·5·5** (L1–5 / L6–10 / L11–15);
  12 → **4·4·4** (L1–4 / L5–8 / L9–12); 10 → **4·3·3** *(第五冊 — ASSUMED, confirm with Wedge)*.
- **Rails:** EN default, VI toggle in the header. The toggle flips which reader-language
  title leads (the Vietnamese Hán-Việt rail is the product's moat — keep it first-class).
- **Formats → faint signifier dots:** 對話/dialogue, 自述/self, 短文·story, 日記/diary,
  問答·比較/Q&A, 報導/report, explainer. Colours already in the base file's CSS vars.

## Reference files
- `library-layout-options.html` — the 6 sketches. **Option 5 is the target shape.**
- `library-columns.html` — the current build to fix (right idea, wrong execution).
- `library-v1.html` / `library-v1-featured.html` — earlier abandoned directions (parts-
  panel + a preserved "Featured" card variant). Don't copy their right-panel treatments.
- `../../docs/DESIGN-PRINCIPLES.md` — the 10 binding principles. Re-read #3 (whitespace),
  #5 (accent + signifiers), #6 (cultural grain), #8 (progressive depth), #9 (cold start).
- `../../docs/companion/LIBRARY-DESIGN-NOTES.md` — split table, open questions.

## Definition of done
- Slim, short shelf on the left; three part-columns filling the space to its right; no
  gap beside or below the books at cold-start.
- Every lesson title on one line (≤2). Columns match Option 5's clean feel.
- Click 課# → its readings open underneath; click header/again → collapse.
- Book switch, EN/VI, dark mode all work. Real 138-reading data. No console errors.
- Passes a read-through against DESIGN-PRINCIPLES.md — especially no whitespace-right-of-
  books and no sloppy gaps.
