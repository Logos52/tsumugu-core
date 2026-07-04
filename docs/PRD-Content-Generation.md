# PRD — Content Generation (Tsumugu Core)

Status: **v0.1, 2026-06-23.** The dedicated PRD for how Tsumugu Core produces its learning content. Consolidates the content model, the content formats, the generation + QA pipeline, the data sources, and the materials compiler. The product-level PRD is `PRD-Tsumugu-Core.md`; this is its content-generation half. Detail lives in the `super-app/` sub-docs referenced throughout. Supersedes the earlier research note `content-generation.md`.

## 1. Purpose
Generate an effectively-unlimited supply of **original, level-appropriate Traditional-Chinese reading + audio, bound to where a learner is.** The engine behind "read a lot, at my level."

## 2. The content model (settled)
- **Breadth: ≥5 readings per lesson — a floor, no upper bound.** More is always upside.
- **Rich length** = the lesson's measured 課文 character count (Book 1 ≈ 150–250 漢字 → ~500+ / full Dcard-article length by Books 4–5). No snippets.
- **The content unit is a companion SET per lesson**, not one reading — multiple formats (§4), rotating topics, set-level grammar/vocab recycling.
- **Content-tagged for reuse.** Each reading carries its vocab/grammar **fingerprint**, so it surfaces at any curriculum position (ACCC / HSK / TOCFL / word list) whose cumulative known-set covers it. One shared, compounding pool; new standards inherit it free.
- **Audio on every reading** — sentence-segmented + a loop-for-shadowing/chorusing waveform. **Voiced on-device by local Qwen TTS** (natural Taiwan voices, $0, no API); the pipeline emits only segmented text + per-speaker tags. Loop/shadow UI already exists.
- **Register dial** — Dcard-colloquial / graded story / news / dialogue / topic-on-demand.

## 3. The unifying engine (one mechanism, many sources)
A **curriculum position** = a cumulative known-set (vocab + grammar). The generator writes original content constrained to that set, featuring its new items; the in-band + grammar gates verify; output is tagged by fingerprint. The **same engine** drives every format — they differ only in their **vocab source / front door**: a textbook lesson, any word list / known-words, a TOCFL level, a film's subtitle-derived vocab, and so on.

## 4. Content formats
All three are the same engine on a different vocab source; all generate **original** content; all carry audio + shadowing.

### 4.1 Textbook Companion — VALIDATED
Reading bound to exactly where a learner is in their textbook: cumulative vocab + grammar through the lesson + its new items featured. First textbook = **ACCC (當代中文課程)**. Grammar read from the textbook's **各課重點 / Highlights pages** (435 points across Books 1–5, every book matching the official MTC count); vocab from the `dangdai` dataset. **Proven on Book 4 Lesson 3** (Dcard-register reading, 100% in-band, featuring 7/8 of L3's new grammar + ~20 new words). The per-lesson set spans 對話 · 自述 · 短文 · 真實語境 · 問答 · 比較 · 迷你廣播劇. Detail: `super-app/textbook-companion/{COMPANION-SET-LAYOUT,GENERATION-QA-CONTROL,feasibility,grammar-*}.md`.

### 4.2 Mini Radio Plays (迷你廣播劇)
A short **multi-voice scripted audio drama** (a 2-part story with an idiom/theme title) + a 詞語和例句 track + 聽力題目 — modeled on MTC's series (studied from the learner's own copy, private), but **our scripts are original**. Works as a per-lesson companion *and* its own graded series. Multi-character audio via local Qwen voices. Detail: `super-app/mini-radio-plays/`.

### 4.3 Film Companion — spoiler-free
A film as a **vocab source + thematic springboard**. A **private language index** is built from the learner's own subtitles (facts: vocab/grammar/idioms used); the **published** layer is **original** content at the film's level — three pillars: **side-stories** (the film's register/world, not its plot), **period/background** (life in Taiwan in that era), **themes** (first love, friendship, growing up). Never the film's plot/dialogue/media; the film stays **BYO**. Proof: `You Are the Apple of My Eye` index built (1,052 unique hanzi, ~Book-5 level, 86% ACCC-covered). Detail: `super-app/film-companion/FORMAT-SPEC.md`.

## 5. Generation pipeline + QA (two layers)
Per reading: build the target → generate (topics + register dial) → **5 automated gates** (① 100% in-band coverage · ② features the new grammar/vocab · ③ grammar-conformance critic · ④ naturalness + Traditional-clean critic · ⑤ format) → **the maker's taste pass** → publishing candidates. Gates ①③⑤ are objective and ②④ critic-against-dictionary, so the control **scales past the maker's own level**. Detail: `super-app/textbook-companion/GENERATION-QA-CONTROL.md`.

**Production:** Composer / Grok (subscription models) drive bulk generation + codegen; the "loom" parallel-wave method authors at volume; **local Qwen** does audio + bulk; Claude orchestrates + designs the gates. **No metered APIs.**

## 6. Data sources + the materials compiler
Sources: vocab (`dangdai`), grammar (ACCC Highlights → 435 pts), idioms (teacher 成語 PPTs → 34 compiled), radio plays (MTC audio + an Anki deck), films (learner subtitles), miscellaneous teacher PPTs. The **materials compiler** ingests them via per-format **intake adapters** (PDF · PPTX · audio · `.apkg` · CSV/SRT — several already built) and assigns each to lesson(s) by **content-fingerprint match**, assembling per-lesson **Lesson Material Bundles**. Detail: `super-app/MATERIALS-COMPILER.md`.

## 7. Copyright by content type
- **AI-original** readings / stories / side-stories / background / themes / radio-play scripts = clean, publishable.
- **In-copyright recaps** (plot retellings) = **not in v1** (Warhol v. Goldsmith / Castle Rock / takedown-at-scale). See `recaps-synopses-feasibility.md`.
- **Copyrighted source media** (textbook texts, films, MTC plays, teacher PPTs) = **private/study-only, BYO/client-side**; we extract **facts only** (vocab/grammar/idiom indices) and never reproduce, host, or republish them.
- **Fact indices** (which words/patterns/idioms a source uses) are functional facts, kept private/gitignored.

## 8. Proof / provenance
- Textbook Companion validated on ACCC B4L3 (100% in-band); 435 grammar points extracted, all books matching MTC counts.
- Film Companion index built (Apple of My Eye: 1,052 unique hanzi, ~B5).
- 成語: 34 idioms compiled from teacher PPTs.

## 9. Open
Content register mix at launch; the first end-to-end **demo** (deferred — the agreed next step); the build sequence (adapters → bundle assembler → first companion sets); strategic decisions tracked in `PRD-OUTLINE-and-open-decisions.md`.

## 10. Detailed docs
`super-app/textbook-companion/COMPANION-SET-LAYOUT.md` · `GENERATION-QA-CONTROL.md` · `grammar-sourcing-options.md` / `grammar-targeting-and-verification.md` / `grammar-pdf-extraction-plan.md` · `feasibility.md` · `super-app/mini-radio-plays/WORKORDER-acquire-scripts.md` · `super-app/film-companion/FORMAT-SPEC.md` · `super-app/MATERIALS-COMPILER.md` · `content-generation.md` (original research) · `recaps-synopses-feasibility.md`.
