# 2026-07-02 — Design personality exploration (checkpoint, paused mid-run)

Wedge directed (evening, ultracode): a new design doc for the Tsumugu-core library + reader, with 6 mockups. Explicit method constraint: do not just restyle what exists — reason from what a learner should *experience* given all the new functionality, extract the right design personality first, then write possibilities. This entry checkpoints the run at Wedge's "pause and journal" instruction: research sweep complete, personality panel not yet launched.

## Relationship to same-day decisions (surfaced, not re-litigated)

Two documents written earlier today assume answers this exploration re-opens:

- `docs/PRD-Super-App-Unification.md` records **Seal-red as the default shell**, closing v1-STATUS Review #6. Still `status: draft`, awaiting §9 sign-off.
- `docs/PRD-Design-Unification-Pass.md` assumes every surface converges on the locked **House/Silk-Seam** reader language.

Tonight's directive ("don't just take what i have") is the newest instruction, so this exploration treats both as inputs — strong taste signals, not walls. Seal-red and Silk-Seam are two of the revealed preferences the personality extraction weighs; the 6 mockups are the evidence set Wedge picks from, and whichever wins becomes the contract that amends or confirms those PRDs. The reader's "locked" status is Wedge's to re-open by picking a non-Silk-Seam direction; we will not treat it as breakable on our own authority.

## What ran: the research sweep

Workflow `wf_98bcc44d-74c` (11 readers, ~1.67M tokens, all green): super-app vision docs, super-app content modes + samples, the 2026-07-02 PRD set, core PRDs + strategy, app source (tokens, surfaces, interaction model), the 6 reader mockups (winner + rejected siblings), the 8 site mockups + card studies, lesson viewer + real companion drafts, all nine decision journals + Writing-Standards, tsumugu-ed's shipped design + KB founding journals, and the legacy public reader.

Per-area findings (structured JSON: functionality / designLanguage / learnerExperience / tasteSignals / constraints / contentShape) are preserved at **`research/design-exploration-2026-07/sweep/*.json`** — 11 files, ~350KB. A resumed session reads those, not the repos again.

## Signals already distilled (the personality raw material)

- **The learner-experience spine** (super-app vision): recede-the-chrome, content-first; lookup-is-capture; the page visibly whitening as words become known — "the honest metric that cannot be farmed and cannot lie"; one obvious next reading at the i+1 edge; a gentle, opt-in habit loop. Duolingo's retention mechanics studied and mostly rejected: no leagues, hearts, XP, streak-shame.
- **Traditional-first is the soul, not a feature** — born from the Taiwan content drought and Simplified-only erasure; audience includes zhuyin-native, TOCFL/Dangdai-leveled learners facing the classroom→PTT/Dcard cliff.
- **Library cards**: Wedge called the current cards "completely lacking, just metadata"; card-study A (Reading Preview — the text itself as the card) is the standing recommendation. Content-forward presentation is confirmed taste.
- **Writing Standards bind mockup microcopy**: front-facing copy transfers facts and wants nothing from the reader — no selling heroes, no taglines beyond catalog lines, no em dashes, no reveal framing. Every builder prompt carries these rules; the copy discipline is part of the design personality.
- **Current type/token state** (input, not contract): LXGW WenKai reading face, Inter UI, Newsreader display; six palettes (silk/celadon/sumi/loom/navy/mauve); violet reserved for brand/cognate-bridge/known-confirm; status renders as underline, never background fill; intensity ramp new-loud → known-invisible.
- **Unsettled by prior record**: warm-paper vs plain-white Reader Calm; default rail en/vi; rung display names.

## The plan from here (resume script)

1. **Personality panel** — one workflow, six lens agents reading the sweep JSONs: (a) the learner's emotional journey first-visit→daily-ritual→year-later; (b) mechanism honesty (whitening page, honest metrics) as visual language; (c) genre differentiation vs Duolingo/DuChinese/Pleco/HSKStory and the three AI-design default looks; (d) Taiwan/Traditional cultural soul — the authentic-vs-kitsch line; (e) Han typography craft (ruby, mixed-script EN/VI+Han, reading at the edge of ability); (f) Wedge's revealed taste fingerprint (Silk-Seam win, rejected siblings, Seal-red pick, card-study feedback, Ulysses mapping, writing standards). Each returns traits, anti-patterns, direction sketches.
2. **Synthesis (main session, not delegated)** — one design-personality brief; then 6 direction specs (name, thesis, palette hexes, type pairing, layout concept, signature element), chosen to span the space rather than orbit one look.
3. **Build** — one workflow, 6 builders: each direction becomes one self-contained HTML mockup showing *both* surfaces (library wall + reader view with ruby/gloss/status coloring), using real companion-draft content from `mockups/drafts/` (copyright-clean, ours), microcopy per Writing Standards. Output to `mockups/explorations-2026-07/`.
4. **Critique + fix** — per-mockup adversarial critics (brief fidelity, craft, genericness/AI-slop tics, palette contrast incl. light/dark), builders repair.
5. **Deliver** — design doc (personality brief + the 6 directions + decision frame, High-Signal Decision Writing) at `docs/design-exploration-2026-07/DESIGN-DOC.md`; mockups pushed to Claude Design project **Tsumugu.cc** (`ed75e9fd-ade5-459c-b8f7-3bab65ed91ec`) as a new group for review (DesignSync `finalize_plan` requires `deletes: []`).

## State at pause #1 (superseded by pause #2 below)

- Sweep: done, preserved in-repo. Panel/synthesis/build/critique/doc: not started.
- Workflow cache: script + run `wf_98bcc44d-74c` resumable this session only; the in-repo JSONs are the durable copy.
- Nothing committed; working tree gained `research/design-exploration-2026-07/` and this journal.

## Continuation and pause #2 (same day, Wedge: "prioritize tokens to another workflow")

Between the pauses the run advanced two full phases:

1. **Personality panel ran** (7 lenses over the sweep: learner journey, mechanism honesty, genre differentiation, Taiwan soul, Han typography, Wedge's taste fingerprint, library-as-place) → 25 direction sketches + a convergent trait constitution. The laws every lens hit independently: progress renders as subtraction (the page whitens; absence is the reward); the excerpt is the sell; register matches the room (never dashboard chrome near prose); the page wants nothing (microcopy law = visual law); status in the underline channel only, never alarm-red; structure conservative, dress adventurous (keep the House skeleton, spend novelty on material/marks/type); Taiwan-native never costume; feasibility is a taste axis.
2. **Wedge sharpened the brief mid-run:** 5 of 6 mockups independent and new; only 1 may descend from the existing silk/seal/violet family.
3. **All six mockups are BUILT** (one self-contained HTML each, library + reader views, light/dark, real B2L07/B1L01/B4L04/B3L01 corpus text, Writing-Standards-clean microcopy) at `mockups/explorations-2026-07/`:
   - `ran-resist-dye.html` — 染 Resist Dye: the library is one indigo bolt that pales as you learn; known = undyed; coverage as card ground-tint; "the wash" re-entry delta as the one motion.
   - `ce-bound-volume.html` — 冊 Bound Volume: Taiwan trade-publishing register; the 書腰 obi fact-band; slipcase Companion shelf; the never-run Ming-prose experiment (Noto Serif TC).
   - `gaozhi-composition-grid.html` — 稿紙 Composition Grid: counted coverage cells; 米字格 practice grid that fades with status; margin ledger in 字; blackboard-green dark. Prose never gridded.
   - `yuetai-platform.html` — 月台 Platform: Taipei-wayfinding library (route-map Companion spine, you-are-here, bilingual station lockups); warm paper reader untouched by signage.
   - `yizhan-one-lamp.html` — 一盞 One Lamp: dark-native evening register; the hub IS the next reading at full presence, library dimmed to a quiet ledger behind it.
   - `zhuyin-seal-ledger.html` — 朱印 Seal Ledger (the family direction): two-ink doctrine (authored = print ink, learner-derived = cinnabar), 著重號 lesson-target dots, the chop pressed on a lesson when union coverage completes.
4. **Build workflow `wf_83ac3c8f-881` stopped mid-critique** at Wedge's token-priority call: 15/30 agents done (all 6 builds + ~9 of 18 critics); **repair pass not applied** — the files are first-draft-plus-self-review only. Completed critic findings are recoverable from the workflow journal (`…/subagents/workflows/wf_83ac3c8f-881/journal.jsonl`); the workflow script itself carries the authoritative distilled constitution + all six direction specs.

**Remaining when resumed:** finish critics + apply repairs → local index page → the design doc (`docs/design-exploration-2026-07/DESIGN-DOC.md`, High-Signal Decision Writing, priced recommendation, Seal-red/Silk-Seam relationship stated) → push the set to Claude Design project Tsumugu.cc as group "Design Exploration · 2026-07" → close this journal. Memory pointer updated (`tsumugu-design-exploration-2026-07`).

## Resolution (same day, evening) — 冊 Bound Volume wins

Wedge resumed the run ("proceed all"), and on reviewing the six mockups decided before the critique/repair pass finished: **冊 Cè Bound Volume is the direction, and its green is the palette** ("that green is excellent. feels like a spirited away type of green"), with a request to explore blue-green tints for the light theme and a glowing blue-green quality matching the dark theme's `#6FA893`. The remaining machinery was cut on his instruction: the resumed workflow had completed 3 more critics (18 of 30 agents; all six critiques for the winner are among the completed and remain recoverable from the workflow journal) and applied no repairs; the big design doc and the Claude Design push of all six were dropped as moot.

What shipped instead:

- **`mockups/explorations-2026-07/ce-green-studies.html`** — five green candidates on the Bound Volume card anatomy, both themes: A Pine (shipped baseline `#2E5E4E/#6FA893`), B Celadon Glow, C Viridian Lantern (most luminous, the closest reading of the ask), D Verdigris (keeps warm copper kraft), E Lake Teal (the boundary post where blue-green stops reading green). B–E put the requested blue-green cast into the light paper itself.
- **`docs/PRD-Design-Direction-Bound-Volume.md`** — the decision record: winner restated as contract; the two supersessions surfaced and priced (Seal-red shell signed AND built the same morning; the Silk-Seam reader lock's theme half re-opened while its layout half stands); the five dropped directions' intentions preserved with per-direction graft menus (ground-tint coverage, the re-entry wash, differential-ink HV ruby, counted blocks, fading 米字格, route-map spine, lamp-hub Continue block, two-ink provenance, the chop, 著重號 dots); open decisions gating the build pass (the green pick, the Ming-prose verdict, grafts, the green→vermillion dictionary handshake, applying the winner's recoverable critiques).
- `mockups/explorations-2026-07/index.html` updated with the verdict and links.

The exploration is closed. Next actions are Wedge's: pick the green (rec: C, fallback B), rule on Ming prose after a full-article read, check graft boxes; then a build session ports Bound Volume onto the live Seal-red front end (two-layer tokens make the swap a days-scale pass).

### Same evening — convergence grafts

Minutes later Wedge named the grafts himself: One Lamp's border glow, Rǎn's reader fonts and reader experience ("superior"), on Bound Volume's colors. PRD §7 records the amendment; the Ming-prose question resolves for the reader (Rǎn's WenKai stack carries prose; Ming keeps display/titles/obi). A convergence build was commissioned, then stopped by Wedge before it wrote anything and replaced by a sharper contract (PRD §8, all his calls): green = **D Verdigris** `#3B8577/#77C6B3`; non-green colors fade a step further (minimalism wins any tie with density); the library's default view is the 課本架 Companion layout with the Reading Wall scrapped for a **large sortable lesson-grouped spreadsheet** (stats at most one fact per row); AI-picture card studies parked at the bottom of the library page, some wearing the very faint One Lamp glow; the Rǎn reader on a plain background is the default reading experience. Artifact re-scoped to the unified two-page set `mockups/explorations-2026-07/unified/{library,reader}.html`, built by a Fable-orchestrated workflow with Opus coding, Sonnet QA, and Opus repair (Wedge's process directive). These pages, once confirmed, are the design source of truth for the port onto the live front end.

**Shipped and QA'd the same night.** The workflow ran 1 Opus builder → 3 Sonnet critics → 1 Opus repair; 7 must-fix findings, all applied: the LXGW WenKai CDN pin was a live 404 (1.7.0 never existed; repinned to the real 1.2.0, verified 200), the catalog's excerpt column was de-clipped and given compact ruby on marked words (the excerpt-is-the-sell clause now holds everywhere), the reader popup caret got a runtime alignment fix, and three light-theme contrast failures (accent-as-small-text, `--faint` microcopy, the learning underline) were repaired with recomputed AA-safe values (`--g-text` #38806F, `--faint` #757060, `--learn` #B08942) after the critics' own suggested hexes failed recomputation. One honest skip: a 30-to-40-row density stress-test needs a throwaway preview with fabricated rows (the corpus only carries 12 real readings in the mockup), owed as a disposable check before sign-off. QA's Playwright pass live-verified the three-state numeric column sort, cross-page theme persistence, and that the whisper glow is pixel-present exactly on the declared cards and nowhere else.
