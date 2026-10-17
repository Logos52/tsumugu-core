# Content rights

Copyright 2026 Logos52 (Tsumugu).

The Apache License, Version 2.0 in LICENSE applies to the code in this repository.

The paths below are content. The Apache License, Version 2.0 does not cover them. All rights reserved. No content license is chosen.

## Paths

`content/` holds titles, title shards, and blog posts.

`docs/companion/` holds the cast, story premises, cover and title prompts, and the quality review of that corpus. `docs/companion/LIBRARY-DESIGN-NOTES.md` is a design note. The Apache License covers that file.

`app/public/dict-search/` holds the dictionary text: entry shards, gloss indexes, and facet indexes.

`app/public/vault/` holds generated readings, the reading catalog, titles, and the companion lesson index.

`app/public/blog/` holds the generated HTML of the blog posts.

`app/public/fixtures/sample.prepared.json` is a sample reading.

`mockups/drafts/` holds story drafts.

`mockups/specs/_content.json` is the sample reading shared by the design mockups.

`mockups/lesson-highlights.json` is the lesson-highlight table transcribed from the textbook.

`mockups/lesson-viewer-data.js` is the textbook vocabulary list used by the lesson viewer.

`scripts/gen/qa/pilot/` holds pilot readings.

## Sample reading inside layout files

These files embed the reading in `mockups/specs/_content.json`. That reading text is content. The markup around it is code.

- `mockups/house.html`
- `mockups/lamphouse.html`
- `mockups/loom-lamplight.html`
- `mockups/loom-signal.html`
- `mockups/reader-house-silk.html`
- `mockups/silk-seam.html`
- `mockups/site/home.html`
- `mockups/site/library.html`
- `mockups/site/library-card-studies.html`
- `mockups/site/reader.html`
- `mockups/site-import/site/home.html`
- `mockups/site-import/site/library.html`
- `mockups/site-import/site/library-card-studies.html`
- `mockups/site-import/site/reader.html`

## Audio and portraits

This repository contains no audio files. This repository contains no portrait or cover image files.

## Application icons

`app/public/logo-glyph.svg`, `app/public/icon-192.png`, `app/public/icon-512.png`, and `app/public/icon-512-maskable.png` are application icons. The Apache License covers them.

## Fonts

The build copies Inter, Noto Sans TC, and LXGW WenKai TC from `@fontsource/inter`, `@fontsource/noto-sans-tc`, and `lxgw-wenkai-tc-webfont` into `app/public/fonts/`, which is gitignored. Each package keeps its own license under the SIL Open Font License.
