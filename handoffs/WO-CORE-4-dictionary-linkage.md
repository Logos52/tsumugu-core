# WO-CORE-4 — Dictionary linkage: lookup-is-capture + tap-out to tsumugu-ed

**For:** Composer (codegen). Use your own subscription model — no metered/pay-per-token APIs.
**Parent contract:** `/Users/n1/Projects/tsumugu-core/docs/PRD-Tsumugu-Core-v1.md` (§4.5 read path, §4.6 local-only known-state + lookup-is-capture, §8.3 ports).
**Status note:** the PRD §10 sequencing table labels WO-CORE-4 as the generate→critique→repair loop. That table is now reconciled (PRD §10 fixed 2026-06-23). **This WO-CORE-4 is the dictionary-linkage work scoped below.** Do not implement the generation loop here.

---

## Goal

One gesture: opening a word's gloss card **records it as seen** in the local engine word store (lookup IS capture), and the card's deep-dive button **deep-links out** to the published tsumugu-ed dictionary in the reader's active rail — replacing the dead in-app `#/encoding/{word}` route.

## Why / context

Per PRD §4.5–§4.6: known-word state is local-only (no accounts in v1), and the dictionary is a **separate static site** the reader taps OUT to via URL, never an in-app route. Today two reader/popup code paths still navigate to `location.hash = "#/encoding/{word}"` (`apps/web/src/reader/reader.ts:533`, `apps/web/src/hover/wordPopup.ts:115-122`) — a route this WO's leave-behind list deletes (PRD §8.4). Capture-on-lookup is currently only done in bulk per-content (`AppState.recordSeenContent`, `apps/web/src/state.ts:277-283`), never on the lookup gesture itself.

This WO touches the Core reader package that WO-CORE-5 stands up over the reused `reader.ts` / `wordPopup.ts`. Implement against those reused sources; if WO-CORE-5's package shell does not yet exist, implement directly in the ported copies and leave the link config + resolver as standalone modules WO-CORE-5 imports.

---

## Exact deliverables

### A. Origin/rail link config — NEW module
**Create:** `src/dict/dictLink.ts` (in the Core reader package).

```ts
/** Published tsumugu-ed origin. Config constant; default = chosen domain (decided). */
export const DICT_ORIGIN = "https://tsumugu.cc"; // PRD §12 (decided); single source of truth

/** The active rail axes carried into the dictionary URL so it opens in the matching scaffolding. */
export interface DictRailParams {
  script: "trad" | "simp";       // data-script
  reading: "py" | "zh" | "hv";   // data-reading
  gloss: "en" | "vi";            // data-gloss
}

/** Read the live rail axes off <html> (the data-* substrate; PRD §4.3). */
export function readRailParams(root?: HTMLElement): DictRailParams;

/**
 * Build the tsumugu-ed deep-link for a headword.
 * Resolution decides kind (c | w | g) via the search-index resolver (deliverable C);
 * unresolved words fall back to kind "c" on the first CJK char (still a valid char page).
 * Path matches the published shape exactly: `{kind}/{headword}.html`, headword URL-encoded.
 * Rail axes ride as query params: ?s=trad&r=hv&g=vi
 */
export function dictUrlFor(word: string, kind: "c" | "w" | "g", p: DictRailParams): string;
```

- **Published URL shape (verified):** tsumugu-ed serves `c/{headword}.html`, `w/{headword}.html`, `g/{slug}.html` (e.g. `exports/site/c/望.html`). The search index `url` field is literally `"{kind}/{headword}.html"` (`build_search_index.py:126`). Build `${DICT_ORIGIN}/{url}?s=…&r=…&g=…` with `encodeURIComponent` on the headword segment.
- **Query-param contract:** `s` = data-script, `r` = data-reading, `g` = data-gloss. tsumugu-ed will read these (its side is a separate task — DO NOT modify tsumugu-ed in this WO; just emit the params per this contract).

### B. Lookup-is-capture — MODIFY the popup open seam
**Modify:** `src/hover/wordPopup.ts` (ported from `apps/web/src/hover/wordPopup.ts`).

- In `open(word, anchor)` (currently `wordPopup.ts:191`), **the first action** records the lookup:
  ```ts
  app.store.recordSeen(app.lang, word, app.clock);
  ```
  `recordSeen` (engine `store/wordStore.ts:121`) sets `firstSeen` (if absent), `lastSeen`, increments `seenCount`, defaults `status:"new"`. It is idempotent-safe (re-lookup just bumps `seenCount`/`lastSeen`). `app.lang` = the content language (`state.ts:224`); `app.clock` is the injected clock (do NOT call `Date.now()` directly — engine rule).
- **Status coloring updates live:** after `recordSeen`, re-run the reader's existing per-word status repaint so the underline reflects the new state immediately. Reuse the engine `status/coloring.ts` mapping the reader already calls; do not reimplement coloring. If no repaint hook is exposed, add one narrow callback `opts.onCapture?(word: string)` to `createWordPopup` and have the reader pass its existing word-restyle function.
- **Do NOT** auto-promote status on lookup. Lookup = `seen` only. The "known" confirm stays the manual violet action (PRD §4.6); leave existing hotkey/promotion paths untouched.

### C. Deep-dive repoint — MODIFY both popup builders
**Modify:** `src/hover/wordPopup.ts:111-122` (the `↗` anchor) and `src/reader/reader.ts:524-537` (the `↗` button).

- Replace `#/encoding/{word}` navigation with an **anchor** (`<a target="_blank" rel="noopener">`) whose `href = dictUrlFor(word, kind, readRailParams())`, resolved at click time (so the active rail is current). Keep it an `<a>` so middle-click / open-in-new-tab works; keep `ev.stopPropagation()`.
- Label/title per the mockup (`reader-house-silk.html:635`, `:755`): button text `字 →`; title VI `"Mở trang chữ đầy đủ → tsumugu-ed"` / EN `"Open full entry → tsumugu-ed"`, chosen by `data-gloss` (or `data-rail`). The canonical design id is `aDict`.
- `kind` comes from the resolver (deliverable D).

### D. Resolver over tsumugu-ed's prebuilt search index — NEW module
**Create:** `src/dict/dictResolve.ts`.

- **Reuse tsumugu-ed's `build_search_index.py` outputs** (PRD §4.5; do not invent a new index). Outputs live at `tsumugu-ed/exports/site/assets/search/`: sharded `cjk-NN.json` (CJK uni/bi-gram → entry-id postings), `entries.json` (or `entries-N.json` + `entries-meta.json` when sharded), `meta.json`. Each entry row carries `h` (headword), `k` (kind: `c`/`w`/`g`), `u` (url) — see `build_search_index.py:_entry_rows` (`:234`).
- `resolveKind(word): Promise<"c"|"w"|"g">` — look the exact headword up in the entry table (load `entries.json`/shards once, memoize). If a multi-char word entry exists (`k:"w"`) return `"w"`; else if a single char entry (`k:"c"`) return `"c"`; else fall back `"c"` on the first CJK char of `word`. Grammar pages (`g`) are not reached from word lookup in v1 — never return `"g"` from a prose-word lookup.
- **Bundle the index, do not fetch tsumugu-ed cross-origin at runtime.** Copy the needed search assets into the Core app's static assets at build time (a copy step in the Core build; cite it in the module header). Resolution must work offline against bundled data.
- Keep this module tiny and stdlib-DOM (`fetch` of bundled JSON). No new dependency.

### Tokens / schema to honor
- Rail axes are the proven `data-*` substrate on `<html>` (PRD §4.3, verified in `reader-house-silk.html:3`): `data-script` ∈ {trad,simp}, `data-reading` ∈ {py,zh,hv}, `data-gloss` ∈ {en,vi}. Read them; never hardcode a rail.
- Word store status keys are the engine's: `new / l1..l4 / known / ignored` (`store/wordStore.ts:33`, types in engine `types.ts`). This WO only ever writes via `recordSeen` (status `new`).
- No new colors/components — the `字 →` button and underline status are already in the House+Silk-Seam design (PRD §4.2).

---

## Step-by-step (mechanical)

1. Add a build step that copies `tsumugu-ed/exports/site/assets/search/{meta.json,entries*.json,cjk-*.json}` into the Core app static assets (path documented in `dictResolve.ts` header). Source dir is read-only; never write into tsumugu-ed.
2. Write `src/dict/dictLink.ts` (deliverable A): `DICT_ORIGIN`, `readRailParams`, `dictUrlFor`.
3. Write `src/dict/dictResolve.ts` (deliverable D): memoized entry-table load + `resolveKind`.
4. Edit `src/hover/wordPopup.ts`: (a) `recordSeen` as the first line of `open()` + capture repaint hook; (b) swap the `↗`/`#/encoding` anchor to `dictUrlFor(...)` resolved on click, `target="_blank" rel="noopener"`, mockup label/title.
5. Edit `src/reader/reader.ts:524-537`: same deep-dive swap as 4(b). Remove the `location.hash = "#/encoding/..."` line (`:533`).
6. Delete/stub the in-app `#/encoding` route registration so no dead route remains (PRD §8.4 leave-behind: the `#/encoding` route + review/encoding views go). If route removal is WO-CORE-5's shell job, leave a `// LEAVE-BEHIND (WO-CORE-4): encoding route removed` marker and ensure no code links to it.
7. Add tests (below). Run the Core package's `vitest` and `tsc --noEmit`.

---

## Acceptance criteria / tests

- **`vitest` green** for the Core reader package; `tsc --noEmit` clean.
- **Capture-on-lookup (unit):** with a fresh empty `WordStore`, calling popup `open("望", anchor)` makes `store.getStatus(lang,"望") === "new"`, `store.get(...).seenCount === 1`, `firstSeen` set. A second `open("望", ...)` → `seenCount === 2`, status still `"new"` (no auto-promote).
- **Anonymous reading renders (unit/dom):** render a prepared reading with an **empty** WordStore — every word renders, no throw; opening any card both populates the store and shows the `字 →` deep-dive anchor.
- **URL build (unit):** `dictUrlFor("望","c",{script:"trad",reading:"hv",gloss:"vi"}) === "https://tsumugu.cc/c/%E6%9C%9B.html?s=trad&r=hv&g=vi"`. Flipping `data-rail` to EN (`reading:"py",gloss:"en"`) yields `…?s=trad&r=py&g=en`. `dictUrlFor("客棧","w",…)` uses the `w/` prefix.
- **Rail is live (dom):** set `<html data-script="simp" data-reading="py" data-gloss="en">`; `readRailParams()` returns `{script:"simp",reading:"py",gloss:"en"}`; the deep-dive href carries `?s=simp&r=py&g=en`.
- **Resolution (unit):** against a fixture entry table, `resolveKind("客棧") === "w"`, `resolveKind("望") === "c"`, `resolveKind("龘")` (absent) falls back to `"c"`. No grammar (`g`) result from a word lookup.
- **No dead route:** grep the Core package for `#/encoding` → zero hits in shipped code.
- **Deep-dive is an anchor:** the `↗`/`字 →` control is an `<a>` with `target="_blank" rel="noopener"` (middle-click opens a new tab); click does not navigate the SPA hash.

---

## Dependencies

- **WO-CORE-0** (repo + `@tsumugu/engine` package extraction) must land first — this WO imports `recordSeen`, `WordStore`, `status/coloring` from `@tsumugu/engine`.
- **WO-CORE-5** (reader shell + restyle) is the natural host for these modules. If WO-CORE-5 has not landed, implement against the ported `reader.ts`/`wordPopup.ts` copies and export `dictLink`/`dictResolve` standalone so WO-CORE-5 imports them. Do not block on WO-CORE-5.
- Independent of WO-CORE-1/2/3 (the gate, lesson index, generation) and WO-CORE-6/7 (catalog, hosting).

---

## Out of scope / do NOT

- **Do NOT** build accounts, server sync, or server-side capture. Capture is local-only via the engine word store (PRD §1.3, §4.6).
- **Do NOT** auto-promote status (no `l1..known`) on lookup. Lookup = `seen`. The "known" confirm is the separate manual violet action.
- **Do NOT** modify tsumugu-ed (`/Users/n1/Projects/tsumugu-ed`). You consume its published search index read-only and emit the agreed query params; tsumugu-ed reading those params is a separate task.
- **Do NOT** fork the tsumugu monorepo. Depend on `@tsumugu/engine` as the versioned package (PRD §8.1).
- **Do NOT** revive or extend the `#/encoding` in-app route, the review/encoding views, `host/fsVault.ts`, the voice/transcript subsystem, the publish-public-vault map, or Anki export from chrome (PRD §8.4 leave-behind).
- **Do NOT** make the dictionary an in-app route or iframe — it is a tap-OUT to a separate static site (PRD §4.5).
- **Do NOT** fetch tsumugu-ed cross-origin at runtime for resolution — bundle the index at build time.
- **Do NOT** add a runtime dependency or paid API. Composer uses its own subscription model for codegen.

---

## Open questions for Wedge / Claude (only if blocking)

1. **ORIGIN domain (Wedge).** `DICT_ORIGIN` defaults to `https://tsumugu.cc` (PRD §12 (decided),). One-line change when decided; ships behind the constant.
2. **Query-param key contract (Claude/Wedge confirm).** This WO emits `?s=&r=&g=` (script/reading/gloss). tsumugu-ed must read the same keys. Confirm key names before the tsumugu-ed-side reader task, or both sides drift.
