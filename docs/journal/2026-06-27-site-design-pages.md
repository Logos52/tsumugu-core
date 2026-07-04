# 2026-06-27 — Site design pages (Home, Library, footer/front pages)

**Ask.** Build design pages for review — Home, Library, footer pages, front-facing pages
(everything viewable we'd worked on), in the **same template as the reader**. Mid-task
redirects: (1) put them in a **new** Claude Design system called **Tsumugu.cc** (not the
existing "Tsumugu Design System"); (2) **interlink everything via a unified top menu**.

**Outcome.** 8 self-contained page mockups, all on the locked House-layout / Silk-Seam token
system, sharing one unified top menu + footer, pushed to a new Claude Design project. Ready
for review.

---

## What was built

A shared **site shell** + 7 generated pages + the reader adapted into the set:

| Page | What it shows |
|---|---|
| `home.html` | Hero + rail chooser (VI/EN, VI active = the moat) + CTAs + **live tappable bridge** sample (他 抬起 頭 ，望…) + 3 value props + a "why it's free" strip |
| `library.html` | The Reading Wall: continue strip, facet bar (Level/Kind/Audio/Sort/search), 3 rungs (A1 Starter / A2 Elementary / B1 Intermediate) of reading cards with coverage meters, binding chips, audio glyphs |
| `reader.html` | The locked reader (reader-house-silk.html) + the unified top-nav links added so it joins the menu |
| `method.html` | Principles (extensive reading, lookup-is-capture, two rails, the bridge, quiet status) + a live bridge demo + the status legend |
| `about.html` | Editorial: two-rails-one-stream, the 紡ぐ name, is/isn't |
| `privacy.html` | What stays on device / what we don't do / your control |
| `feedback.html` | Mailto CTA (hello@tsumugu.cc) + "what helps most" prompts |
| `colophon.html` | Type specimens (Inter/Newsreader/LXGW WenKai), 6-palette specimen (live-switch), brand + stack |

**Unified top menu** (every page): brand 紡 Tsumugu Core → Home · Library · Reader, +
the global **rail switcher (EN/VI)**, **6-palette swatch switcher**, and **light/dark toggle** —
so a reviewer can re-theme any page live. Shared **footer** links all the front pages. The
reader keeps its own richer chrome (script/reading/gloss segs) but gained the same nav links.

## Where it lives

- **Claude Design** — NEW project **"Tsumugu.cc"** (id `ed75e9fd-ade5-459c-b8f7-3bab65ed91ec`,
  owner Wedge), group **"Tsumugu.cc · Site"**, files under `site/`. (Separate from the older
  "Tsumugu Design System" `5cd4a9f0…`, per Wedge's redirect.)
- **Local source** — `tsumugu-core/mockups/site/` : `_shell.html` (the shared shell template
  with `__PAGE__`/`__TITLE__`/`__PAGECSS__`/`__CONTENT__`/`__DSCARD__` markers) + the 8 pages.

## How it was made (reproducible)

1. `_shell.html` authored by hand: the reader's **verbatim** two-layer token block (6 palettes ×
   light/dark + semantic `--tsg-*`), fonts (Inter/Newsreader/LXGW WenKai TC), the unified
   top-menu chrome, shared components (.chip/.btn/.card/.prose/.w/.bridge/.cog/.tg/.rh), the
   site footer, and the palette/theme/rail JS. Coherence guarantee: the shell is the single
   source of chrome.
2. A Workflow (`wf_e02c31c2-8c7`) fanned out **one agent per page**, each returning only
   `{pageCss, contentHtml}` (token-based, scoped) — never the shell.
3. Assembled deterministically with a python substitution into `_shell.html` (so every page's
   token block + header + footer + JS are **byte-identical** — verified: 12/12 shell markers,
   correct `data-page`, no leftover template markers, no escaped-entity leakage).
4. Reader adapted by hand (added `.primary-nav`); all 8 carry `<!-- @dsCard group="Tsumugu.cc · Site" -->`.
5. Pushed via DesignSync (`create_project` → `finalize_plan` → `write_files`).

To iterate a page: edit `mockups/site/<page>.html` directly (self-contained), or regenerate via
the workflow script and re-run the python assembler, then re-push with a new finalize_plan.

## Design discipline kept (matches the reader)

Violet reserved (brand / bridge / known-confirm only); status in the underline channel
(clay-new / dotted-amber-learning / violet-soft lesson-target / jade-known); reading face =
LXGW WenKai, UI = Inter, display = Newsreader; **everything token-based** so all 6 palettes ×
light/dark stay correct on every page.

## For review (tomorrow)
- Open the **Tsumugu.cc** project → "Tsumugu.cc · Site" group. Flip palettes / dark mode / rail
  in the top bar on any page.
- Biggest design calls to weigh: **Library** card + Reading-Wall layout (the densest surface),
  the **Home** hero + rail-chooser, and the **default palette** (Silk-Seam shown).
- These are mockups, not wired to the app yet — once approved they become the design contract
  for the real `home.ts` / `catalogView.ts` / `staticPages.ts` pass (roadmap §"Design review & pass").

## Pointers
- Shell: `mockups/site/_shell.html` · Reader template: `mockups/reader-house-silk.html`
- Roadmap this feeds: `docs/v1-STATUS-AND-ROADMAP.md` (the three ★ design to-dos)
- Workflow run: `wf_e02c31c2-8c7`

---

## 2026-06-29 — follow-up: Library card redesign studies

Wedge's review: the Library reading cards were "completely lacking — just metadata without any
design." Correct: the card was title + 3 chips + a thin coverage bar + a stat line — a database
row, no visual anchor, nothing showing what the reading *is*.

Built `mockups/site/library-card-studies.html` (pushed to Tsumugu.cc · Site) — three card
directions, same sample readings, to compare:
- **A — Reading Preview** (RECOMMENDED): the card *is* a mini-reading — one real excerpt line in
  the reading face with ruby + the status underline channel (known plain / learning dotted-amber /
  new clay / lesson-target violet wash). Unmistakably Tsumugu; makes "graded" tangible.
- **B — Cover Motif**: a big faded watermark hanzi as a cover + a conic coverage ring + new-word
  chips. Feels like a deck of book covers.
- **C — Graded Value**: the coverage ring + the actual new words you'd meet (reading-face chips)
  are the hero; a faded excerpt below. Sells the pedagogy.

Rec = A, optionally grafting C's coverage ring + B's watermark as accents. OPEN: Wedge picks a
direction → then roll it across the full `library.html` (and the real `catalogView.ts`). Held the
full-library rewrite until the pick, since A/B/C need different card data shapes.
