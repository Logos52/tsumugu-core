---
title: "PRD — Companion Articles: gate profile, publishing, rework, resumed authoring"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Wedge (sign-off §9) + Claude Code
owns: The companion-article corpus lifecycle — quality, conversion, the companion gate profile, the publish step, the rework/edit program, and B4L05+ authoring. Content facts: docs/companion/QUALITY-REVIEW-2026-07-02.md; possibilities: docs/companion/ARTICLE-POSSIBILITIES.md.
authority: Wedge sign-offs 2026-07-02 (PRD-Super-App-Unification.md §9a — catalog confirmed, post-cutover probe, grammar mapping publishes); out/companion/GATE-REPORT.md + gate-report.json (measured, post-segmentation-fix)
---

# PRD — Companion Articles

**Verdict: adopt a companion gate profile — the runnable A–H checks bind, three structurally-broken checks record as advisory until their upstream fixes land, and two sentence-check calibrations (a dialogue-interjection carve-out, a band-scaled length cap) correct rules tuned for narrative prose misfiring on this corpus. Under that profile, measured against `gate-report.json`: 26 readings are publishable today, 40 after the carve-out, 53 after the mechanical sweep, 72 after the band cap — and the remaining 37 need real edits (22 run-ons, 15 paragraph repetition) that fold into the existing rework program.** The alternative — holding the umbrella's "A–H, 0 waivers" literally — publishes zero readings forever, because two checks cannot currently pass for any reading in this repo; the profile is the scoped, signed exception that keeps the gate honest instead of performative.

## 1. What exists (measured 2026-07-02)

138 articles / 46 lessons in `mockups/drafts/`, all passing the companion coverage gate (`check_candidate.py`: 100% vocab+grammar union, size floors, speaker policy). The converter (`scripts/companion/convert-drafts.ts`, `pnpm companion:convert`) emits schema-valid `prepared@2` + a full `CatalogEntry` manifest for all 138 with zero errors; token streams reproduce source text character-exact; every glossary entry carries VI bridge morphemes. The zh-Hant segmentation defect is fixed (greedy longest-match option on `populateDualRail`, default path untouched; surface-form expansion for the CSV's two alternate-form compounds): corpus CI range 0.5566–0.9242, word counts now count words. Quality: 42 strong / 69 acceptable / 27 needs-rework, five systemic failure modes, one policy rewrite (B3L08 R3, fabricated biography of a living person) — all in QUALITY-REVIEW-2026-07-02.md.

## 2. The companion gate profile

**Binding for converted companion drafts** (fail = does not publish):
- Companion coverage gate (`check_candidate.py`) — the corpus's own vocabulary/grammar control, already 46/46.
- Sentence checks (D) with two calibrations below; paragraph repetition (E); dual-rail integrity, script cleanliness, bridge grounding (G); glossary-resolvable (every unknown word has a usable gloss); vi-rail; polyphone-safety once its whitelist exists (see advisory).
- Three new deterministic lints (from QUALITY-REVIEW F4): fullwidth-punctuation class, surname whitelist (甲乙丙丁/高林周 + ban list), real-entity blocklist.

**Recorded-advisory until the named upstream fix lands** (logged per reading, never blocks):
- **In-band (A)** — cannot run: the private def-level pack is absent from this repo; and the companion policy lock already holds in-band advisory (naturalness > hard-gate). *Flip: binding the day the pack (or an ACCC-cumulative equivalent index) is wired.*
- **Grammar-marker (B)** — `dangdai-grammar-index.merged.json` stores category labels (句型, A-not-A問句), so `prose.includes(marker)` can never match; 138/138 fail wholesale. *Flip: binding when surface-string extraction lands in the index.*
- **Polyphone (H)** — flags HV-ambiguous particles (好/呢/的) by design; 2,240 rows / 217 chars logged. *Flip: binding once the HV-particle whitelist prunes the by-design rows.*
- **Per-reading recycle (newVocab ≥3×)** — the companion contract is set-level union across the lesson's three articles, held by the coverage gate; the per-reading rule stays informational. CI stays advisory by config.

**The two D calibrations** (profile-level, also upstreamed into `readingChecks.config.ts` as a named profile, never a fork):
1. **Dialogue-interjection carve-out.** 81 readings carry D-type sentence failures; the min-4-Han sub-rule accounts for 51 reasons on lines like 你呢？ 好啊！ 謝謝您。 — natural dialogue beats, exactly what a learner should read (too-long dominates the rest: 270 reasons, median offender 71 Han, handled by calibration 2). Sentences ≤3 Han that are complete utterances (。！？-terminated) are exempt from the minimum. Root cause upstream: the TS sentence splitter counts speaker labels into sentences; the Python gate already strips them (§6.5).
2. **Band-scaled length cap.** Max Han per sentence stays 60 for Books 1–2, rises to 80 for Books 3+ (floors already scale 250→1000 by the same logic). B2's 64–87-Han answer-turns above the scaled cap are genuine run-ons and get edited, never waived.

**Steelman of "A–H, 0 waivers" (umbrella §10):** a gate with named exceptions invites exception creep, and the whole point of fail-closed QA is that nobody argues with it. The answer is that two checks are not failing content, they are failing to *run* — a 0-waivers rule enforced today would measure the absence of a data file, not prose quality. The profile keeps 0-waivers semantics per check: every binding check has zero waivers; every advisory check has a named flip condition and a logged record. **The umbrella §10 criterion is amended to: "every published reading passes the companion binding profile, 0 waivers; advisory checks logged with zero unexplained entries."**

## 3. Publishing

**Eligibility** = passes all binding checks + QA grade acceptable-or-strong + no open policy flag. Excluded upfront: 29 readings (27 needs-rework ∪ 4 policy flags: B3L08 R3, B3L05 R1, B4L02 R1, B4L04 R2 — one overlap).

The measured ladder over the 109 remaining: **26 now → 40 with the carve-out → 53 after the mechanical sweep** (fullwidth punctuation in B2L13/15, 台→臺 variants, gloss supply for the 26-reading 臺北/訊息/支援/瞭解/傢俱 class) **→ 72 with the band cap**. The blocked 37 (22 sent-long, 15 paragraph — 4 overlap) join the edit program; the corpus converges on 138 as reworks land.

**Publish step** (`pnpm companion:publish`, to build): copies eligible readings `out/companion/readings/` → `app/public/vault/readings/zh-Hant/`, merges `CatalogEntry` rows into `__readings.json` idempotently (keyed by path; re-runs replace, never duplicate), stamps each entry `origin: "companion"` + the converter's fingerprint for provenance, and refuses to run if any copied reading's gate record shows a binding failure. Publishing 72 real readings replaces the fixture catalog the day the library work lands; the +30-day post-cutover probe (§9a, signed) reads from these.

## 4. The edit + rework program (priority order)

1. **Policy, now:** rewrite B3L08 R3; audit B3L05 R1 / B4L02 R1 / B4L04 R2 under the real-entity blocklist rule (historical-figure exemption pending Wedge's 邱吉爾 call).
2. **Mechanical sweep, one session:** punctuation, 台→臺, gloss supply — recovers 13 readings + unblocks parts of others; scriptable, hand-verified.
3. **Run-on + paragraph edits, 1–2 sessions:** the 37 gate-blocked readings; each edit re-runs convert + gate.
4. **The 27 QA reworks, 2–3 sessions:** batched by failure mode (F1 same-event-retold is the largest batch); replace scenes, never paraphrase them; each re-runs `check_candidate.py` + lints + gate.

## 5. Recipe hardening before B4L05+ authoring

No new article is authored until the recipe carries: the scene-fingerprint check (F1), the cross-lesson template lint (F2), the per-format execution checklists (F3), the three F4 lints, one continuity critic pass (F5), and the two D calibrations as authoring constraints (write ≤80-Han sentences natively rather than edit later). The 414-row possibilities catalog + 12 templates (ARTICLE-POSSIBILITIES.md) supply premises; B4L05–L12 needs the Highlights vision-read (pp.22+), B5L01–10 needs its Highlights pass, B6 stays blocked (no PDF).

## 6. Upstream work items (owned here, executed as sessions)

1. Grammar-index surface strings — extraction pass over `merged.json` adding matchable `surface[]` per point; flips B to binding.
2. Private def-level pack decision — wire the pack into this repo (or build the ACCC-cumulative index A actually needs for companion content); flips A.
3. HV-polyphone whitelist — prune the 217-char by-design set; flips H.
4. Python/TS gate unification — `check_reading.py` and `readingChecks.ts` still disagree on recycle constants and set-level semantics; the companion profile becomes the shared config's first named profile.
5. Speaker-label stripping in the TS sentence splitter (the Python `hc()` already does this) — 47 of the 81 D-failing readings are 對話/問答; landing this may lift the 72-wave without touching prose. Re-run the ladder when it lands.

## 7. Success criteria (falsifiable)

- The library renders ≥70 real companion readings, every one passing the binding profile with 0 waivers; the publish step refuses a seeded binding-failure in a test.
- Gate logs carry zero unexplained advisory entries (every advisory line traces to A/B/H/recycle with its flip condition named).
- Re-running `companion:convert` + `companion:publish` twice produces byte-identical vault state (idempotence test).
- B3L08 R3 rewritten; zero real-entity flags open; zero ASCII-punctuation readings in the published set.
- After the edit program: 138/138 eligible or explicitly retired with a reason line in `_STATUS.json`.

## 8. Wedge decisions — SIGNED 2026-07-02 (interview set 4)

1. **Companion gate profile: signed** as specified in §2, including both D calibrations and the amended umbrella criterion.
2. **Publish threshold: ship the 72-wave** as soon as the library lands; catalog grows as edits land.
3. **Real entities: living persons banned; figures deceased ≥70 years allowed** (the 邱吉爾 quote stays; its policy flag clears, so B4L04 R2 re-enters eligibility pending its own gate state). Organizations and venues (五月天 as a band, 雲門, 國家戲劇院) are outside the signed persons rule — the §4.1 audit still owes a recommendation on them.
