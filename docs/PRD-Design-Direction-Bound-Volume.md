---
title: "PRD — Design direction: 冊 Bound Volume wins; the other five preserved as intentions"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Wedge (sign-off on the green, the grafts, and the supersessions), then a design-capable build session
owns: the visual direction of library + reader going forward; the disposition of the 2026-07 design exploration
authority: Wedge's pick (2026-07-02 evening); mockups/explorations-2026-07/; docs/journal/2026-07-02-design-personality-exploration.md
---

# PRD — Design direction: 冊 Bound Volume

**Verdict: Wedge picked 冊 Cè Bound Volume (`mockups/explorations-2026-07/ce-bound-volume.html`) as the design direction for the library and reader, and its green as THE palette — tuned toward a glowing blue-green ("a Spirited Away type of green"), with the light theme carrying a blue-green tint.** Five green candidates are staged at `mockups/explorations-2026-07/ce-green-studies.html` (A = shipped pine `#2E5E4E/#6FA893`; B–E move the light theme onto blue-green paper and raise the accent's glow; C Viridian Lantern `#1F8A70/#4FCDAF` is the most luminous and the closest reading of "glowing blue-green, similar to the dark version"). The cost of this verdict: it supersedes two same-day decisions (Seal-red shell, signed and already built; the Silk-Seam reader lock), so adopting it prices in a re-skin pass over the just-shipped front end.

## 1. What was decided (2026-07-02 evening, Wedge verbatim anchors)

- "ce bound volume is a winner. that green is excellent. feels like a spirited away type of green. i want this to be the palette."
- Light version: "maybe a sort of blue-green tint"; preference: "a glowing type of blue-green, similar to the dark version."
- The other five possibilities: dropped as directions; their intentions recorded here for review (§4).

## 2. Supersessions this creates (surfaced, not re-litigated)

Per the prefer-most-recent-decision rule, tonight's pick is the operative one. It amends:

1. **PRD-Super-App-Unification §4 (Seal-red shell)** — signed and built earlier today; the live front end wears Seal-red. Bound Volume green replaces Seal-red as the shell. Price: a token-swap plus component pass over the app CSS (~1,394 lines; the two-layer `--raw-*`/`--tsg-*` architecture keeps this a days-not-weeks job). Seal-red can remain in the palette switcher as an alternate.
2. **The Silk-Seam reader lock (PRD v1 §4.2)** — Bound Volume restyles the reader surface (Ming prose experiment, folio running head, no card frame). The House skeleton and all interaction mechanics survive untouched; the lock's *layout* half stands, its *theme* half is re-opened by this pick.
3. **PRD-Design-Unification-Pass** — its goal (every surface, one language) stands; its target language changes from House/Silk-Seam to Bound Volume.

What would flip this back: the Ming-prose experiment failing Wedge's own long-session read test (§5.2), or the green failing against the dictionary's vermillion handshake (§5.4).

## 3. The winning direction, restated as contract

- **Thesis:** the site wears Taiwan trade publishing; moving from Tsumugu into real Taiwanese books is continuity. Typographic adulthood is the genre's empty ground.
- **Palette:** paper near-white (light theme to take a blue-green cast per the studies), ink near-black, kraft as the material neutral (shelf rails, obi ground; cooled driftwood in B/C/E, warm copper kept in D), green accent for brand + bridge + known-confirm + the one deliberate action, clay/amber status underlines unchanged.
- **Type:** reading prose Noto Serif TC (the Ming experiment; LXGW WenKai TC stays a one-token retreat), display Noto Serif TC heavy, Latin/Viet Literata + Inter chrome.
- **Signature:** the 書腰 obi band — one fixed-position fact band on every card and lesson set (`A2 · 當代 B2 L07 · 518字 · 94% known · ≈6 min`). The can-I-read-this decision becomes one glance at one place.
- **Layout:** library = Continue counter-top strip, Companion shelf as slim slipcases (Books 1–5) opening into lesson set-cards, Reading Wall as face-out excerpt-hero cards on kraft rails; reader = one bound page, folio running head, chrome recedes on scroll.

## 4. The five dropped directions — intentions preserved for review

Each line: what it believed, and what is worth grafting into Bound Volume regardless. Grafts are a menu for Wedge to check, not decisions.

1. **染 Rǎn · Resist Dye** (`ran-resist-dye.html`) — believed the honest metric should be the whole identity: the library as one indigo bolt that pales as you learn; known = undyed is materially true in resist dyeing. **Graft candidates:** coverage as card ground-tint (pre-attentive fit reading, replaces rings); "the wash" on re-entry (words learned since last visit fade in one staggered breath — a delta report no surface currently gives); differential-ink Hán-Việt ruby (owned syllables full ink, foreign faint).
2. **稿紙 Gǎozhǐ · Composition Grid** (`gaozhi-composition-grid.html`) — believed measurement should wear the surface every Taiwan-track learner has counted characters on; coverage as countable cells; the practice grid fades as a word is learned; prose never gridded. **Graft candidates:** the counted block on lesson set-cards (the 3-article vocab union as cells that fill — the coverage guarantee made inspectable); the fading 米字格 inside the word popup; facts stated in 字 units in the obi.
3. **月台 Yuètái · Platform** (`yuetai-platform.html`) — believed the textbook learner's own coordinate system ("當代 B2·L07") should be the navigation: route line, station codes, you-are-here. **Graft candidates:** the route-map rendering of the Companion spine (a curriculum is honestly linear; this can live INSIDE the slipcase view); bilingual Han-over-Latin lockups for lesson headers.
4. **一盞 Yī Zhǎn · One Lamp** (`yizhan-one-lamp.html`) — believed the 9:40pm open should reach reading in ten seconds: the hub IS the next reading at full presence, the library dimmed behind it. **Graft candidates:** the Continue strip grown into a real readable first-paragraph block (live ruby, tappable) at the top of the library; an evening palette variant slot (the umbrella PRD already reserved one).
5. **朱印 Zhū Yìn · Seal Ledger** (`zhuyin-seal-ledger.html`, the family direction) — believed everything authored is print ink and everything the learner's behavior wrote is a second ink, with a chop pressed when a lesson's union coverage completes. **Graft candidates:** the two-ink provenance rule applied inside Bound Volume (learner-derived figures get one consistent treatment — the obi's coverage figure is already the learner's number); the chop as the lesson-complete state mark on slipcase cards (noun/state register only, never animated); 著重號 dots under lesson-target words in the reader.

Full specs for all six live in the build-workflow script and the journal; the personality constitution they were built against (underline-only status, page-wants-nothing microcopy, progress-as-subtraction, excerpt-is-the-sell, Taiwan-native-never-costume) binds the productization pass too.

## 5. Open decisions gating the build pass

1. **The green** — RESOLVED: Wedge picked **D Verdigris** (`#3B8577` light / `#77C6B3` dark), overriding the C Viridian recommendation, with the rider that non-green colors fade a step further toward minimal (§8).
2. **Ming prose** — RESOLVED by the §7 amendment: the reader's prose follows Rǎn's typography (the WenKai-family reading stack); Ming (Noto Serif TC) survives in display, titles, and the obi, pending the same full-article read in the convergence file.
3. **Grafts** — three decided in §7; the rest of the §4 menu stays open for checking.
4. **The dictionary handshake** — tsumugu-ed keeps vermillion Paper & Ink; the tap-down room-change (violet→vermillion today) becomes green→vermillion. Verify the pairing reads as siblings, not a clash, before the port.
5. **Un-repaired state** — the winner file shipped with self-review only; its three adversarial critiques completed and are recoverable from the workflow journal (`wf_83ac3c8f-881/journal.jsonl`). Apply them during productization.

## 6. Steelman of not switching (and the price of switching)

The Seal-red shell was signed, built, and is live in the vault as of this morning; it carries Wedge's own cultural rationale ("the 印泥 cinnabar of a name-chop") and switching costs a re-skin pass plus the palette-menu rework days after shipping. Keep Seal-red and this exploration becomes a palette-switcher entry. Rejected because the exploration was commissioned after the Seal-red build with explicit license to supersede ("you don't necessarily have to stick to what i've built"), and the pick was made on the built evidence, not a whim: the winner was judged against five live alternatives on the same content. The reversible-branch logic also favors the switch: the two-layer token architecture makes a shell swap cheap in both directions, so the cost of being wrong is a token swap back.

## 7. Amendment (same evening) — convergence grafts decided

Wedge, on reviewing the six: "i want to incorporate some other elements from the other layouts. like the yizhan-one-lamp border glow. the ran-resist dye reader fonts and reader experience is superior also. but the colors of the ce-bound-volume are good." Three §4 menu items therefore move to DECIDED, and the contract becomes a convergence build (the same move that produced `reader-house-silk.html`):

1. **Base** — Bound Volume's palette, library view, obi band, and chrome (§3 stands).
2. **Reader** — Rǎn Resist Dye's reader typography and reading experience lifted wholesale and recolored to the green tokens: its reading-face stack (the WenKai family, which settles §5.2 for prose), prose metrics, ruby treatment, word popup, progress thread, and the re-entry wash demo. Inside the reader view Rǎn wins conflicts; everywhere else Cè wins.
3. **Glow** — One Lamp's border-glow recipe re-pitched to the active green, applied scarcely: the Continue strip block, the reader word popup, the brand mark. Never ambient.

Artifact: `mockups/explorations-2026-07/ce-convergence.html` — the fusion with all five §5.1 green candidates wired as an in-context palette switcher (default A Pine). This file supersedes `ce-bound-volume.html` as the design source of truth once Wedge confirms it; the green pick (§5.1) is then made inside it rather than from the isolated studies page.

*(Overtaken within the hour by §8: the single-file convergence was stopped before build and replaced by the unified two-page set with the green decided, so the palette switcher and the ce-convergence.html artifact were never built.)*

## 8. Refinement directives (same evening, final) — the unified pages

Wedge, before the convergence file was built, refined the contract and re-scoped the artifact to the unified page set. All decided:

1. **Green = D Verdigris** (`#3B8577` light / `#77C6B3` dark). The palette switcher is dropped; the studies page stays in the repo for revisiting.
2. **Fade the non-greens**: browns/kraft/obi grounds, borders, and chrome sit a step quieter; status clay/amber desaturate one step while keeping underline legibility; backgrounds go plain (near-white light, the praised green-black dark). The green and the ink are the only full-strength voices.
3. **Tiebreaker**: when density and minimalism conflict, minimalism wins.
4. **Library default view = the 課本架 Companion (當代中文課程) layout.** The Reading Wall is scrapped in favor of a **large sortable spreadsheet** of the catalog, condensed and grouped by lesson, column sorting included. Statistics minimal: at most one fit fact per row (the new-word count); no rings, no percentages, no dashboards.
5. **Cards return later with AI pictures**: a "card studies · planned picture cards" section sits at the bottom of the library page (image placeholder blocks, real excerpt lines, muted obi line), some cards carrying the very faint One Lamp glow. The Continue strip and the reader word popup carry the same whisper glow.
6. **Reader default = the Rǎn reading experience on a plain background**, recolored to Verdigris.
7. **Artifacts**: `mockups/explorations-2026-07/unified/library.html` + `unified/reader.html` (self-contained, cross-linked, one shared shell). Built by a Fable-orchestrated workflow, Opus coding, Sonnet QA, Opus repair, per Wedge's process directive.
