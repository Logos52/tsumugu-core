# 2026-07-04 — Library port + spectral-teal reskin, shipped

We ported the settled library design out of the mockups and into the app, retired
the Verdigris/Bound-Volume skin for the Apple-minimal teal system, and deployed.

## What shipped
- **Design system**: `app/src/styles/tokens.css` raw layer retargeted — spectral
  teal `#0C8DAF` (light) / `#43ADC6` (dark) on cool neutrals; Verdigris recorded
  in the retired-values block beside Seal-red. `--display` now points at the
  Inter/PingFang sans stack (WenKai stays the reading voice); Noto Serif TC
  dropped from the font load (Noto Sans TC in). All glows removed (body halo
  wash, brand-knot glow) per DESIGN-PRINCIPLES §5. New `--tsg-fmt-*` signifier
  tokens (format dots), themed per light/dark.
- **The library page**: new `app/src/library/libraryPage.ts` — the
  master–detail design from `mockups/explorations-2026-07/unified/
  library-columns.html`: 課本架/級別架 tabs, slim shelf left, the selection's
  three columns right (a volume's 三部分, or a level's volumes — B1 fans out to
  第三/四/五冊), title-led scoped reading table below (dot · EN/VI title · 中文 ·
  課 with ledger suppression), Lesson/Format/Title sort, in-place filter (⌘K
  focuses, Esc clears; no modal). Routed via the `LibraryView.ts` compat seam;
  `main.ts` mounts it with titles + companion lessons.
- **Titles**: `content/titles.json` (Composer, 138 readings) ships as
  `app/public/vault/__titles.json`; `loadCompanionTitles()` loads it. All 45
  published readings covered. Interest leads.
- **Supersessions**: `catalogView.ts` (masthead/continue/spreadsheet/cards hub)
  and `companionShelf.ts` (set-card shelf) stay in-tree **unrouted**, tests
  green — the continue strip + coverage return with the progress layer.
- **Quality gates**: tsc, eslint, vitest **284/284** (16 new libraryPage tests).
- **Deployed**: Cloudflare Pages `tsumugu-core-pages`
  (https://main.tsumugu-core-pages.pages.dev → tsumugu.cc).

## Decisions
- The library page IS the settled design — no stacked hub sections around it.
- Books 2–5 stay "尚未出版" until their drafts run `companion:publish`; the shelf
  and level columns state that honestly (dimmed spines, coming-soon columns).
- Part splits: 15→5·5·5, 12→4·4·4, 10→**4·3·3 (第五冊, assumed — confirm)**.
- Dropped part-header counts: on real data every complete part reads "15 篇"
  three times — the read·read·read redundancy defect (DESIGN-PRINCIPLES §2).

## Next (agreed with Wedge)
- **Covers (v2, tomorrow)**: Grok anime covers per `docs/companion/
  COVER-PROMPT-GROK.md`; the table/lesson rows gain thumbnails.
- **Progress layer (tomorrow)**: read-marks, travelled parts, quiet continue —
  an enhancement over this cold-start baseline, likely re-drawing on
  catalogView's coverage machinery.
- Publish B2–B4 readings (drafts exist; titles already shipped for them).

Design canon: `docs/DESIGN-PRINCIPLES.md` · `docs/companion/LIBRARY-DESIGN-NOTES.md`
· mockup contract `library-columns.html`.
