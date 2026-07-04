# Companion article possibilities — master index

**414 enumerated article possibilities across the four book catalogs, grounded lesson-by-lesson in `mockups/lesson-highlights.json` themes/grammar and checked against the 138 existing drafts (no duplicates of shipped scenes survived QA).** Options, not commitments; generated 2026-07-02, verified same day (grounding, format discipline, policy, hygiene — all pass; the one-pass fix list applied).

| Catalog | Scope | Rows |
|---|---|---|
| [possibilities-B1.md](possibilities-B1.md) | B1L01–B1L15: 8 new possibilities per lesson + 8 book-level series | 128 |
| [possibilities-B2.md](possibilities-B2.md) | B2L01–B2L15: 8 per lesson + 8 series | 128 |
| [possibilities-B3.md](possibilities-B3.md) | B3L01–B3L12: 8 per lesson + 7 series | 103 |
| [possibilities-B4-plus.md](possibilities-B4-plus.md) | B4L01–B4L04: 9 per lesson + 7 series + 12 book-agnostic templates for B4L05–B5L10 and beyond | 55 |

Row shape everywhere: format · register (textbook-clean / everyday / colloquial-Dcard) · concrete premise (a person, a situation, an artifact) · the lesson grammar points it exercises · S/M effort.

## The format library the rows draw from

Core seven (COMPANION-SET-LAYOUT): 對話 dialogue · 自述 first-person monologue · 短文 short essay · 真實語境 real-context artifact (menu, notice, LINE thread) · 問答 Q&A/interview · 比較 comparison · 迷你廣播劇 mini radio play. Corpus-attested additions: 日記 diary · 報導 news report · 廣播 broadcast. Sample-library registers (docs/super-app/content-samples/): Dcard-forum thread, slice-of-life story, everyday how-to, laddered same-topic set. Adjacent specs, not yet instantiated: mini-radio-play scripts (WORKORDER-acquire-scripts.md), film-companion format (FORMAT-SPEC.md).

## Using the catalogs

- Authoring resumes at B4L05 (per `_STATUS.json` stop point); the B4-plus template section instantiates against any new lesson once its Highlights row is extracted.
- Before authoring from B1L04–L06: verify those grammar lists against the textbook PDF p19 (present in highlights but not `_meta.verified`).
- Every new article passes `check_candidate.py` (+ the F1–F4 lints proposed in [QUALITY-REVIEW-2026-07-02.md](QUALITY-REVIEW-2026-07-02.md) §2) before integration.
- Series rows (multi-lesson arcs, laddered sets, 廣播劇 arcs) are the natural place to break the 對話/自述/報導 monotony QA flagged in B4.
