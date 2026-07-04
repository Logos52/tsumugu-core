# Title prompt — Composer (EN / VI / ZH titles for every existing article)

**Goal.** Give every reading we've authored an evocative title in three languages —
Traditional Chinese, English, Vietnamese — so the **v1 Library leads with the title**
(the interest landmark) instead of a raw first line. Titles first; cover art (Grok,
see `COVER-PROMPT-GROK.md`) is v2.

Run on **Composer's own subscription model** (no metered pay-per-token API).

---

## The corpus to title
Read every reading we've authored and its metadata:
- **Published:** `app/public/vault/` — indexed by `app/public/vault/__readings.json`.
  Each reading carries its Chinese article text + `book / lesson / format / band`.
- **Drafts not yet published:** `mockups/drafts/*.json` (lesson articles).

Decide each title from the reading's **full Chinese text + its lesson topic + format**
— the title should name what the piece is actually *about*.

## For each reading, produce
- `title_zh` — Traditional Chinese. **Reuse the reading's existing title if it has one;** otherwise write one.
- `title_en` — English.
- `title_vi` — Vietnamese, correct diacritics.

All three **parallel in meaning**, each natural and idiomatic in its own language — the
Vietnamese is real Vietnamese, not a transliteration of the English.

## Title style
- **Evocative of the premise** — name the interesting thing, the way a short-story or
  magazine title does: *"Chasing the Garbage Truck,"* not *"Dialogue 2."*
- **Concise** — ~2–6 words in English; similar economy in each language.
- **Faithful** — only what is actually in the article. No invented events, no spoiling a turn.
- **Warm, human, curious** tone — matches the readings. No clickbait, no exclamation bait.
- **Distinct** — no two readings share a title; a lesson's three titles feel like a set but each stands alone.

## Output
Write `content/titles.json`, keyed by the reading id/path from `__readings.json`:
```json
{
  "b2l07-2": { "zh": "追垃圾車", "en": "Chasing the Garbage Truck", "vi": "Đuổi theo xe rác",
               "lesson": "B2L07", "format": "短文" }
}
```
**Do not modify the reading files in this pass** — emit the titles map plus a short
report (how many titled, any skipped and why). Merging into app data is a follow-up.

## QA — self-check before finishing
- Every corpus reading has all three titles; none blank.
- Each title is faithful to its article (spot-read the text to confirm).
- Vietnamese diacritics correct; English idiomatic; `title_zh` Traditional only.
- No duplicate titles; a lesson's three titles are distinct yet coherent.
- No title is generic ("Reading 1") or just the raw first line.

## Constraints
- **Original.** Readings use our invented cast (高文 / 周怡君 / …) — fine to name them in
  titles; **never** the ACCC textbook cast (王開文 / 陳月美 / 李明華).
- Traditional characters only in `title_zh`.
- Composer's subscription model; no metered API.
