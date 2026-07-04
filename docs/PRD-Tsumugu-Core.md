> **SUPERSEDED (2026-06-23).** Retained for provenance only. Canonical build PRD: [PRD-Tsumugu-Core-v1.md](./PRD-Tsumugu-Core-v1.md).

# PRD — Tsumugu Core (working title)

Status: **v0.1, 2026-06-23.** This PRD captures the **settled foundation** (decisions Wedge has explicitly made) and the **first fully-specced, validated feature** — the Textbook Companion. Strategic and monetization decisions that are still open are **not** resolved here; they live in `docs/PRD-OUTLINE-and-open-decisions.md` and only enter this PRD with Wedge's sign-off. Research backing: `docs/` and `docs/super-app/`.

---

## 1. North star

"The Chinese-learning app I wish I'd had when I was learning Traditional Chinese in Taiwan." A **desktop-first super-app** — "Pleco for computers" — built on **one shared brain** (known-word state + dictionary + SRS), with many content surfaces docking onto it. Built for a real, lived itch (read a lot, at my level, in Traditional, with audio), not a market position.

## 2. Settled foundation (decided)

- **Traditional-first.** Traditional is the base; a Simplified toggle is easy and already built. Zhuyin and pinyin both supported (Taiwan-native).
- **Gloss rails: English + Vietnamese**, both already built. The VI Hán-Việt cognate bridge is retained as a deep feature.
- **One brain, many surfaces.** A LingQ-style per-word status model (1 / 2 / 3 / 4 / known / ignore) + the 2,662-entry character dictionary + FSRS. Reader, shadowing, BYO text, comics, and video all read and write the same brain.
- **Two bodies.** A standalone app + a companion browser extension (the extension is the legally-clean path for Netflix/YouTube overlay). **Platform order: desktop → iPadOS/iOS → browser extension (last).**
- **v1 focus:** (1) generate-and-read graded content at the learner's level, (2) read your own imported text (BYO, client-side), (3) sentence-segmented audio narration with Audacity-style looping. Video and comics come later.
- **Audio.** Every reading gets sentence-segmented narration; tap a sentence (or set A–B points) to loop; Taiwan-accented voice preferred. Reuses the existing reader audio stack (practiceBar / sentenceWaveform / player / shadowing / webAudio + local Qwen3-MLX TTS).

## 3. Content generation (Textbook Companion · Mini Radio Plays · Film Companion)

**Full spec → `PRD-Content-Generation.md`** — the dedicated content-generation PRD: the content model (≥5 rich readings/lesson, no cap, ~課文 length, cross-standard reuse, shadow-audio via local Qwen), all three content formats (one engine on different vocab sources), the generation + 5-gate QA pipeline, the data sources, and the materials compiler. The validated centerpiece (the Textbook Companion) is summarized below.

### 3.0 Feature: Textbook Companion  — VALIDATED (the centerpiece of "generate-and-read")

The fix for the #1 pain: a textbook teaches vocabulary and grammar lesson by lesson but gives only a trickle of reading at that level. Tsumugu Core generates **unlimited reading bound to exactly where a learner is in their textbook.**

### 3.1 What it does
Generate reading that uses **only the vocabulary and grammar taught through the learner's current lesson**, plus that lesson's **new** vocab and grammar deliberately featured — so it's comprehensible (i+1) and reinforces what was just studied, in whatever register the learner wants to read.

### 3.2 The level target (per lesson)
A lesson resolves to `{cumulative vocab set, cumulative grammar set, + the lesson's NEW vocab, + the lesson's NEW grammar}`, built from two per-textbook data sources:
- **Vocab** — per-lesson vocabulary. For ACCC: the `dangdai` dataset (4,960 terms, IDs tagged `BxLyy`). Cumulative-through-lesson = union of all prior lessons.
- **Grammar** — per-lesson grammar points. For ACCC: extracted from the 各課重點 / "Highlights of Lessons" pages — **435 points across Books 1–5, every book matching the official MTC count.**

### 3.3 Generation
Generate a reading on a lesson-appropriate topic, constrained to the cumulative vocab + grammar, featuring the lesson's new items naturally. **Register is a dial** (Dcard-colloquial / graded story / news / dialogue / topic-on-demand). Output Traditional (Taiwan lexis) with pinyin/zhuyin + EN/VN gloss + sentence-segmented audio.

**The content unit is a companion SET per lesson — not a single reading.** Each lesson gets **≥5 readings (a floor, no upper bound)** across formats (對話 dialogue · 自述 monologue · 短文 narrative · 真實語境 authentic-register · 問答 Q&A · 比較 compare · **迷你廣播劇 Mini Radio Play**), rotating topics and recycling the lesson's new grammar/vocab across the set for **breadth**, plus an unlimited on-demand tail.
- **Rich length** — each reading targets the lesson's **measured 課文 character count** (Book 1 ≈ 150–250 漢字 → ~500+ / full Dcard-article length by Books 4–5). No snippets.
- **Audio on every reading** — sentence-segmented, with a **loop-for-shadowing/chorusing waveform**. Audio is voiced **on-device by Wedge's local Qwen TTS** (natural Taiwan voices, $0, no API); the pipeline emits only the segmented text (+ per-speaker tags for radio plays). The loop/shadow UI already exists (`practiceBar`/`sentenceWaveform`/`player`/`shadowing`).
- **Content-tagged, reusable across standards** — each reading carries its vocab/grammar fingerprint, so it surfaces at any curriculum position (ACCC lesson / HSK / TOCFL / word list) whose cumulative known-set covers it. One shared, compounding pool; new standards inherit it for free.
Spec: `super-app/textbook-companion/COMPANION-SET-LAYOUT.md`.

### 3.4 Validation gate
Every reading is checked for **in-band coverage**: every character/word must sit within the cumulative-through-lesson set (the CI-scorer discipline), except deliberate new-target items. Above-band items are repaired or flagged. Grammar conformance is checked by an LLM critic — there is no clean mechanical grammar scorer (see `super-app/textbook-companion/grammar-targeting-and-verification.md`).

### 3.5 UX — one mechanism, three front doors
The learner picks **a textbook + book + lesson** ("A Course in Contemporary Chinese, Book 4, Lesson 3"), **or** any word list / their own known-words, **or** just a TOCFL level. Then reads an endless feed bound to that point; new words and grammar are highlighted and flow into the known-word brain.

### 3.6 Proof of concept (2026-06-23)
- ACCC grammar extracted from the Highlights pages for all 5 books: **435 points / 64 lessons**, each book matching MTC.
- `dangdai` vocab: 4,960 terms; cumulative through B4L3 = **2,196 words / 1,353 hanzi**.
- Demo reading bound to **Book 4 Lesson 3 (雲端科技)**, Dcard register: **100% in-band**, featuring 7 of L3's 8 new grammar points + ~20 of its 81 new words. → `docs/super-app/content-samples/b4l3-cloud-tech-demo.md` (logged as publishing candidate PC-001).

### 3.7 Copyright
The vocab list and grammar-point index are **functional facts** (which words/patterns are taught when), kept local and gitignored, never republished; ACCC's own texts, explanations, and example sentences are never reproduced. Generated readings are original content (clean).

### 3.8 Open / to-do
- First supported textbook = ACCC (當代中文課程); others later via the same mechanism.
- Book 5 四字格 (four-character idiom) per-lesson mapping to confirm (語法點 already validated).
- The generation pipeline **at volume** + its QA gate (the real throughput bottleneck) — see `docs/content-generation.md`.

## 4. Other v1 features (specced in the research docs)
- **BYO import** (client-side, copyright-clean) — `docs/super-app/byo-and-audio-options.md`
- **Audio + Audacity-style looping** (reuses existing code) — same doc
- **Reader + dictionary + known-word brain** (~80% already built) — `docs/super-app/` + `docs/scaffolding-inventory.md`
- **Content registers/types** — `docs/super-app/content-options.md` (register dial; the launch *mix* of registers is **not yet locked → open**)

## 5. Open decisions (NOT resolved here)
Tracked in `docs/PRD-OUTLINE-and-open-decisions.md`. Still open, per Wedge — do not bake without sign-off: content register/type launch mix; monetization (see the gitignored KB private note); EN-vs-VI positioning; comics/video unlock timing; the convert-to-learner demand assumption.

## 6. Data assets & provenance (all gitignored / local)
- Grammar index: `private/dangdai-grammar/book{1-5}-highlights.md`
- Vocab: `private/dangdai-vocab/` (clone of `ivankra/dangdai`)
- ACCC source PDFs: `private/dangdai-pdfs/` (never published)
- Engine / dictionary / audio: reused from `tsumugu/` and `tsumugu-ed/`
