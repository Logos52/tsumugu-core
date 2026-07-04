---
title: "PRD — Dictionary handoff axes: carry the reader's state into tsumugu-ed"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Claude Code Opus
owns: CROSS-REPO — the URL contract between tsumugu-core dictLink and the tsumugu-ed site; implementation lands mostly in tsumugu-ed site.js
authority: docs/v1-STATUS-AND-ROADMAP.md (Polish tail #1), docs/COHESION-AUDIT-2026-06-25.md §3 item 15, WO-CORE-4
---

# PRD — Dictionary handoff axes

**Make the reader→dictionary tap-out preserve the learner's axes. Core appends `?s=&r=&g=` (script/reading/gloss) to every tsumugu-ed deep link, and tsumugu-ed ignores all three — a Vietnamese-rail reader taps out of Hán-Việt scaffolding and lands on a pinyin/EN dictionary page, which breaks the moat experience at its most important seam.**

## 1. Problem (audit §3 #15, verified)

- `app/src/dict/dictLink.ts` appends `?s=&r=&g=`; tsumugu-ed `site.js` has no URL-param reader — the params are dead weight.
- Param-name drift exists between repos (`?s=&r=&g=` vs `?script=&reading=&gloss=`); the contract was never written down.
- `DICT_ORIGIN` is hardcoded in `dictLink.ts` instead of reading `config/site.ts` (`VITE_SITE_ORIGIN`) — audit #48, same seam, fix together.
- tsumugu-ed already has a proven client-side axis system (`data-script/reading/gloss` + the 設 popover); this is a reader for it, not a new mechanism.

## 2. The contract (the deliverable that outlives the code) — RATIFIED 2026-07-02

This is the single param vocabulary for both repos. Core (`app/src/dict/dictLink.ts`)
emits exactly these values; tsumugu-ed's pre-paint reader parses exactly these values.

### 2.1 Param names, values, defaults

| Param | Axis    | Canonical values           | Default (missing/unknown) | Core internal source (`<html data-*>`) → canonical |
|-------|---------|----------------------------|---------------------------|----------------------------------------------------|
| `s`   | script  | `trad` \| `simp`           | `trad`                    | `data-script` (`trad`/`simp`) → identity           |
| `r`   | reading | `pinyin` \| `zhuyin` \| `hv` | `pinyin`                | `data-reading` (`py`→`pinyin`, `zh`/`zy`→`zhuyin`, `hv`→`hv`) |
| `g`   | gloss   | `en` \| `vi`               | `en`                      | `data-gloss` (`en`/`vi`) → identity                |

- **`r=hv`** = Hán-Việt ruby. tsumugu-ed must ship a `hv` ruby mode. **Until ed ships it,
  `r=hv` degrades to `pinyin`** — this is an explicit, signed downgrade (a VI-rail reader
  taps out and lands on pinyin, not a broken page). Track ed's `hv` ruby mode as the
  ED-REPO-BLOCKED prerequisite that removes the downgrade.
- Value vocabulary was reconciled here: core previously emitted `r=py|zh|hv` (drift). The
  reconciled reading vocabulary is `pinyin|zhuyin|hv`; `hanviet` is **not** a value (`hv`).

### 2.2 Precedence

- **URL params win at open** (seed the `data-*` axes **before first paint**, no flash of the
  ed default).
- **The ed popover wins + persists after the user interacts** — a click in ed's own 設 popover
  overrides the URL-seeded axis and writes to the visitor's persisted prefs for direct visits.
- Rationale: "the link brought me here configured; my clicks are mine."

### 2.3 Forward-compat

- Unknown params and unknown values are ignored silently and fall back to the §2.1 default.
- Missing params fall back to the tsumugu-ed persisted/default axis (param-less URLs behave
  exactly as today — zero regression).

### 2.4 ED-side reader requirement (ED-REPO-BLOCKED — for the ed agent)

tsumugu-ed's `render_site.py`-emitted head-inline script (the one that already restores
persisted `data-*` axes) must, **before first paint**:

1. Read `location.search` for `s`, `r`, `g`.
2. Map onto ed's `ted-*`/`data-*` axes: `s→data-script`, `r→data-reading` (`pinyin`/`zhuyin`/`hv`),
   `g→data-gloss`.
3. Apply URL params first; only fall through to persisted prefs when a param is absent/invalid.
4. Ship a `hv` (Hán-Việt) ruby reading mode; until it exists, treat `r=hv` as `pinyin` (the
   signed downgrade in §2.1).

## 3. Success criteria (falsifiable)

1. VI-rail reader taps a word → tsumugu-ed opens with Hán-Việt reading + VI gloss visible, no flash of the EN default before the axes apply.
2. EN-rail tap-out → pinyin + EN, same no-flash bar.
3. Round-trip: axes chosen in tsumugu-ed's own popover persist for direct visits exactly as today; the param reader introduces zero regressions for param-less URLs.
4. One param vocabulary in both repos; the drift is gone; the contract section above is filled in.
5. `DICT_ORIGIN` reads from site config.

## 4. Plan

1. Write the contract (param names/values) — 30 minutes, both repos referenced.
2. tsumugu-ed: `site.js` param reader seeding `data-*` axes pre-paint; simplest is reading `location.search` in the head-inline script that already restores persisted axes.
3. tsumugu-core: align `dictLink.ts` to the contract; un-hardcode origin.
4. Cross-repo test: manual matrix (2 rails × tap-out × back-navigation) recorded in the PR.

## 5. Alternative considered

Dropping the params instead (audit #15 offers it). Rejected: the tap-out is WO-CORE-4's "lookup-is-capture" flow and the VI rail's continuity is the product's differentiator; the fix costs an evening. What would flip it: if tsumugu-ed's inline axis-restore script can't run before first paint without layout shift, ship param-less and revisit.

## 6. Open question

Params-vs-persisted precedence on the tsumugu-ed side for RETURN visits within a session. Recommendation: params win at open, popover changes win afterward and persist — matches visitor intuition ("the link brought me here configured; my clicks are mine").
