# WO-CORE-5 — Public catalog + metadata layer + publisher (Reading Wall manifest)

**For:** Composer (codegen). **Owner of acceptance:** Claude (review) + Wedge (sign-off).
**Parent contract:** `/Users/n1/Projects/tsumugu-core/docs/PRD-Tsumugu-Core-v1.md` (§3 scope, §4.7 catalog surface, §8 reuse, §10 sequencing).
**Numbering note:** the task spec scopes this as **WO-CORE-5**. The PRD §10 table lists "Catalog + facets + BYO importer" as WO-CORE-6; **the BYO importer is split out and NOT in this WO** (see Out of scope). This WO is catalog + metadata + publisher only. Treat the WO id in filenames as authoritative; reconcile the §10 table when WO-CORE-6 (importer) lands.

---

## Goal
Build the public Reading Wall: a static, SEO-friendly catalog/browse surface over the reused `library`/`catalog` modules (named rungs + per-band counts, facets serialized to the URL hash, a per-reading metadata card with optional local coverage badge), and a rebuilt publisher that emits the owned/generated `__readings.json` manifest with grade-level + ACCC-binding fields and **no personal inbox/slug map**.

## Why / context
v1 is a static, read-only catalog of ~150 AI-original graded readings (PRD §3.1). The personal monorepo's catalog (`library.ts`/`switcher.ts`/`coverage.ts`) and publisher (`publish-public-vault.ts` + `catalogEnrich.ts`) are built for a personal vault — they group by `source`, surface YouTube/GSM kinds, hardcode a `YOUTUBE_TITLES` slug map, and copy a voice/audio sidecar tree. We reuse the coverage math and the manifest shape, drop the personal coupling, and add the public browse chrome the mockup implies but does not contain (the canonical mockup `mockups/reader-house-silk.html` is the *reader*, single-reading view; it carries the `.chip.band` / `.chip.bind` vocabulary this catalog must echo, not a catalog surface). Reads land → browse → read with **zero login** (PRD §4.7).

---

## Exact deliverables

All paths are in the **NEW Core repo** stood up by WO-CORE-0 (`@tsumugu/core-web` app + pipeline). WO-CORE-0 defines the actual app root; this WO assumes the conventional `apps/web/src/` layout mirrored from the monorepo (confirm the root against WO-CORE-0's output before writing — if WO-CORE-0 chose a different root, rebase these paths, do not invent files outside it). Engine symbols are imported from the **versioned `@tsumugu/engine` package**, never by reaching into `/Users/n1/Projects/tsumugu`.

### A. Extended catalog row type — `apps/web/src/catalog/types.ts`
Extend (do not replace) the reused row. Port the monorepo type from `/Users/n1/Projects/tsumugu/apps/web/src/catalog/types.ts` and **add** Core fields. New shape:

```ts
export type ReadingKind = "story" | "dialogue" | "explainer" | "byo";   // REPLACES youtube/gsm-* kinds
export type ReadingOrigin = "generated";                                 // v1 is generated-only; drop "curated"
export type Band = "A1" | "A2" | "B1";                                   // TOCFL 1–3, the v1 range (PRD §3.2)

/** A textbook lesson binding carried as static facet metadata (PRD §3.2, §7.1). */
export interface LessonBinding {
  textbook: "accc";          // "當代中文課程"; only textbook in v1
  book: number;              // e.g. 4
  lesson: number;            // e.g. 3  → renders "當代中文課程 · B4 L3"
}

export interface CatalogEntry {
  path: string;              // e.g. "readings/zh-Hant/<slug>.prepared.json"
  lang?: string;             // "zh-Hant"
  title?: string;
  kind: ReadingKind;
  origin: ReadingOrigin;
  // grade level (NEW)
  band: Band;                // headline rung is derived from band (see §B)
  tocfl: 1 | 2 | 3;
  // ACCC binding (NEW, optional — a reading may be unbound)
  binding?: LessonBinding;
  // length / reading metrics
  sentences: number;
  minutes: number;           // est. reading minutes
  totalWords: number;
  wordCounts: Record<string, number>;  // surface form → count, for live % known
  newWords: number;          // count of lesson NEW-target words (PRD §4.2 scarce violet)
  hasAudio: boolean;         // false in v1 (audio off critical path) — field present for forward-compat
  dateAdded: string;         // ISO yyyy-mm-dd
}
```
Drop: `source` (replaced by `kind` + `binding`), the `youtube`/`gsm-*` kinds, the `"curated"` origin. Keep `ReadingBand` (`"in-range" | "stretch" | "outgrown"`) — that is the *coverage* band, distinct from the CEFR `Band`; **do not conflate them**. Rename or alias if needed for clarity (suggest `CoverageBand` for the coverage one) but keep `coverage.ts`'s public function names.

### B. Named rungs — `apps/web/src/catalog/rungs.ts` (NEW)
The headline of the catalog is a named difficulty rung; the band number is the subtitle (task spec). One source of truth:

```ts
export interface Rung { id: Band; name: string; subtitle: string; order: number; }
export const RUNGS: Rung[] = [
  { id: "A1", name: "<rung name>", subtitle: "A1 · TOCFL 1", order: 0 },
  { id: "A2", name: "<rung name>", subtitle: "A2 · TOCFL 2", order: 1 },
  { id: "B1", name: "<rung name>", subtitle: "B1 · TOCFL 3", order: 2 },
];
export function rungFor(band: Band): Rung;
```
Rung **display names** are an OPEN QUESTION for Wedge/Claude (see end) — until decided, ship `name: ""` and render the subtitle as headline so the surface is shippable. The band→subtitle string MUST match the reader's `.chip.band` text ("B1 · TOCFL 3", per `mockups/reader-house-silk.html:555`).

### C. Coverage helpers — extend `apps/web/src/catalog/coverage.ts`
Port from `/Users/n1/Projects/tsumugu/apps/web/src/catalog/coverage.ts` unchanged (`percentKnown`, `readingBand`, `bandLabel` — signatures below) and ADD:

```ts
// existing, port as-is:
percentKnown(wordCounts: Record<string, number>, totalWords: number, getStatus: (w: string) => WordStatus): number
readingBand(pct: number, min = 80, max = 95): CoverageBand
bandLabel(band: CoverageBand): string

// NEW — per-band counts for the rung headers; NEVER an aggregate total (task spec):
export function perBandCounts(catalog: CatalogEntry[]): Record<Band, number>
```
`percentKnown` already returns 0 when the WordStore is empty (`totalWords<=0` guard AND no known statuses) — that is the anonymous-visitor path; the coverage badge is **only rendered when local known-state exists** (≥1 word at a known status). Use `DEFAULT_KNOWN_POLICY` + `WordStatus` imported from `@tsumugu/engine`. For the metadata-card coverage %, prefer the engine's `scoreCI` (`@tsumugu/engine`, returns `CiReport.coverage` in 0..1) for consistency with the gate, or `percentKnown` for parity with the existing card — pick one and use it everywhere; do not mix.

### D. Facets → URL hash — `apps/web/src/catalog/facets.ts` (NEW)
Pure, DOM-free, deterministic, round-trippable. Facets: **topic, level (band), textbook-binding, kind**.

```ts
export interface CatalogFacets {
  band?: Band[];                  // multi-select
  kind?: ReadingKind[];           // multi-select
  topic?: string[];               // multi-select (topic taxonomy TBD; pass-through strings in v1)
  binding?: { book?: number; lesson?: number };  // "bound to ACCC B4L3"
}
export function facetsToHash(f: CatalogFacets): string;     // → "#band=A2,B1&kind=story&book=4&lesson=3"
export function facetsFromHash(hash: string): CatalogFacets; // inverse; tolerant of unknown keys
export function applyFacets(catalog: CatalogEntry[], f: CatalogFacets): CatalogEntry[];
```
Empty facets ⇒ empty hash ⇒ full catalog. Round-trip MUST be lossless for any value `facetsToHash` can produce. Deep links (someone pastes `…/#band=A2&book=4`) hydrate the filtered view on load.

### E. Catalog browse surface — `apps/web/src/catalog/catalogView.ts` (NEW)
Reuse the construction style of the monorepo's `library/library.ts` (`el`/`clear` DOM helpers, card factory, `app.on("change", render)` reactivity) but rebuild the structure for public browse:
- **Rung sections** as the spine: one section per `RUNGS` entry, header = rung name (or subtitle until named) + **per-band count** from `perBandCounts` (never a grand total).
- **Facet bar**: topic / level / binding / kind controls that write `facetsToHash` to `location.hash` and re-render via `facetsFromHash` on `hashchange`. Do not store facet state anywhere but the hash (single source of truth).
- **Per-reading metadata card** (factory `readingCard`), honoring mockup chip classes:
  - `.chip.band` → `band · TOCFL n` (mockup `:555`),
  - `.chip.bind` → `當代中文課程 · B{book} L{lesson}` when `binding` present (mockup `:556`),
  - length (`sentences`), est. minutes (`minutes`),
  - kind (story/dialogue/explainer),
  - has-audio indicator (suppressed in v1 since `hasAudio:false`),
  - **coverage % badge ONLY when local known-state exists** (`coverage.ts` + the chosen scorer); anonymous visitors see no badge and no error.
- Use the `--tsg-*` semantic tokens and the mockup's `.chip`, `.seg`, `.iconbtn` chrome classes (defined in `mockups/reader-house-silk.html` lines 276–330) so the catalog and reader share one visual language. Violet stays reserved (brand/bridge/known only) — **no violet status fills on cards** (PRD §4.2).
- Card click → `opts.onOpen(path)` (the reader mount, owned by WO-CORE-5/reader-shell, not this WO).
- Keep `library/switcher.ts` (Cmd/Ctrl-K jump) working against the new `CatalogEntry` — port it, swap `entry.source` references for `entry.kind`/binding in the meta line (`switcher.ts:88`).

### F. Publisher rebuild — `pipeline/publish-readings.ts` (NEW) + `pipeline/lib/catalogEnrich.ts` (ported)
Replace `/Users/n1/Projects/tsumugu/scripts/publish-public-vault.ts`. The new publisher:
1. Reads generated `*.prepared.json` from the Core content dir (e.g. `apps/web/public/vault/readings/zh-Hant/` — confirm against WO-CORE-0/WO-CORE-7 hosting layout).
2. For each, builds a `CatalogEntry` via a **ported, slimmed** `enrichCatalogEntry` (from `/Users/n1/Projects/tsumugu/scripts/lib/catalogEnrich.ts`) that:
   - keeps `wordStats`, `sentenceCount`, `minutesFromCues`→`minutesFromWords` (no cues in v1; use `Math.max(1, round(totalWords / WORDS_PER_MINUTE))`),
   - **reads `band`/`tocfl`/`binding`/`newWords` from the prepared doc's Core metadata extension** (see §G), not from slug heuristics,
   - sets `origin:"generated"`, `kind` from the prepared `kind` field, `hasAudio:false`.
3. **DROPS** entirely: `YOUTUBE_TITLES`, `hasVideoId`/`youtubeReady`/`publishable` gating, the `audio/`, `voice-notes`, `section-audio`, `word-audio` sidecar copy tree, the `personal/inbox` source path, and the `personal/vault/.../word-store.json` seed copy (v1 ships an empty/stub store or none — known-state is local-only, PRD §4.6).
4. Emits `__readings.json` (pretty-printed, trailing newline, deterministic sort by `band` then `binding` then `title`) at the static vault root consumed by the reused `host/httpVault.ts` `listVaultReadings`.
5. `host/httpVault.ts` is **ported unchanged** (`/Users/n1/Projects/tsumugu/apps/web/src/host/httpVault.ts`) — it already reads `__readings.json` over static GET via `staticVaultBase()`/`listVaultReadings`. Do NOT port `fsVault.ts`.

### G. PreparedContent metadata extension (the generation↔render contract handshake)
The Core fields (`band`, `tocfl`, `binding`, `newWords`, `kind`) ride on the prepared doc as an **additive, optional** block so the engine's `PREPARED_CONTENT_SCHEMA_V2` (`@tsumugu/engine`, `content/schema.ts` `RawPreparedContent`) still validates. Define a Core wrapper type in `apps/web/src/catalog/preparedMeta.ts`:

```ts
import type { RawPreparedContent } from "@tsumugu/engine";
export interface CorePreparedMeta {
  core?: { band: Band; tocfl: 1|2|3; kind: ReadingKind; newWords: number; binding?: LessonBinding };
}
export type CorePreparedContent = RawPreparedContent & CorePreparedMeta;
```
The publisher reads `doc.core` to populate the manifest row; if absent it MUST fail loud per-file (a generated reading without Core metadata is a pipeline bug — exit non-zero, name the file). Do NOT modify the engine schema in this WO; the `core` block is an extra top-level key the normalizer ignores.

---

## Step-by-step
1. Confirm WO-CORE-0's app root + content dir; rebase paths if they differ. Confirm `@tsumugu/engine` exposes `WordStatus`, `DEFAULT_KNOWN_POLICY`, `scoreCI`, `CiReport`, `RawPreparedContent` (they do, via the barrel `index.ts` → `status/`, `ci/`, `content/`).
2. Write `catalog/types.ts` (§A): extend the row, define `Band`/`LessonBinding`/`ReadingKind`/`ReadingOrigin`, rename coverage band to `CoverageBand`.
3. Write `catalog/rungs.ts` (§B) with `RUNGS` + `rungFor` (names blank pending decision; subtitle as headline).
4. Port + extend `catalog/coverage.ts` (§C): add `perBandCounts`; keep `percentKnown`/`readingBand`/`bandLabel` signatures.
5. Write `catalog/facets.ts` (§D): `facetsToHash`/`facetsFromHash`/`applyFacets`, lossless round-trip.
6. Write `catalog/preparedMeta.ts` (§G): the `CorePreparedContent` wrapper.
7. Write `catalog/catalogView.ts` (§E): rung sections, facet bar bound to `location.hash` + `hashchange`, metadata cards, conditional coverage badge, mockup chip/token classes.
8. Port `library/switcher.ts` to the new row (§E last bullet).
9. Write `pipeline/lib/catalogEnrich.ts` (ported/slimmed) + `pipeline/publish-readings.ts` (§F). Port `host/httpVault.ts` unchanged.
10. Write vitest specs for every pure module (`facets`, `coverage` incl. `perBandCounts`, `enrichCatalogEntry`, `catalogView` render against a fixtures catalog with an empty and a populated WordStore). Add fixtures: ≥2 readings, ≥1 with a `binding`, ≥1 unbound, spanning ≥2 bands.
11. `pnpm test` (vitest) green; `pnpm build` (or the Core equivalent) clean; typecheck clean.

---

## Acceptance criteria / tests (concrete, checkable)
- `vitest run` green for `catalog/facets.test.ts`, `catalog/coverage.test.ts`, `pipeline/catalogEnrich.test.ts`, `catalog/catalogView.test.ts`.
- **Facet round-trip:** `facetsFromHash(facetsToHash(f)) deepEquals f` for a property-style sample incl. multi-select bands, kind, and `{book,lesson}`; empty facets ⇒ `""` ⇒ full catalog.
- **Deep link:** mounting the catalog with `location.hash = "#band=A2&book=4"` renders only A2 readings bound to ACCC book 4.
- **Per-band counts, never aggregate:** rung headers show `perBandCounts` values; assert no element renders a sum-of-all-bands total. `perBandCounts` of a 3-band fixture returns `{A1,A2,B1}` matching fixture composition.
- **Anonymous render:** `catalogView` renders with an **empty WordStore** — every card draws, **no coverage badge** appears, no throw, no NaN/`undefined%`.
- **Coverage badge gated on local state:** with a WordStore where ≥1 word is `known`, the affected card shows a coverage % badge; a card whose words are all unknown shows none.
- **Card chips:** a bound reading renders `.chip.band` = "B1 · TOCFL 3" and `.chip.bind` = "當代中文課程 · B4 L3"; an unbound reading renders the band chip and **no** bind chip.
- **Publisher drops personal coupling:** `publish-readings.ts` emits a `__readings.json` with no `youtube`/`gsm-*` kinds, no `source` field, no audio sidecars copied, `origin:"generated"` on every row; output is byte-stable across two runs (deterministic sort + formatting).
- **Publisher fails loud on missing metadata:** a prepared doc lacking `doc.core` causes a non-zero exit naming the file.
- **httpVault unchanged path:** `listVaultReadings(staticVaultBase())` parses the emitted manifest into `CatalogEntry[]`.
- **No violet status fills:** grep the catalog CSS — `--tsg-accent`/`--raw-violet` appear only on brand/bridge/known-confirm/topic, never on a status or card-fill rule (PRD §4.2).

---

## Dependencies
- **WO-CORE-0 MUST land first** — the new repo, the app root/content layout, and the published/linked `@tsumugu/engine` package this WO imports from. Do not start before the engine package resolves.
- **WO-CORE-5 reader-shell** (PRD §10 row WO-CORE-5 "Reader shell + restyle") owns `onOpen` / the reader mount and the `--tsg-*` palette token set + `data-*` substrate. This catalog WO consumes those tokens and calls `onOpen`; if the reader shell is a sibling task, coordinate the `LibraryMountOpts`-style interface (`{ catalog, onOpen, ... }`). It does not block writing the pure modules (types/facets/coverage/publisher) — start those immediately.
- The `core` metadata block (§G) is **produced by** WO-CORE-3/4 (generation). This WO defines the *read* contract and a fixtures producer; coordinate the field names with WO-CORE-3/4 so generation writes exactly `doc.core.{band,tocfl,kind,newWords,binding}`.

---

## Out of scope / do NOT
- **No BYO paste importer** — split to WO-CORE-6 (PRD §3.3). This WO is catalog + metadata + publisher only.
- **No accounts, no server sync, no payments, no analytics wiring** (analytics is WO-CORE-7). Known-state is local-only.
- **No live lesson-picker / on-demand binder** — bindings are static facet metadata only (PRD §3.1, §7.1).
- **Do NOT fork the `tsumugu` monorepo.** Import engine symbols from the versioned `@tsumugu/engine` package; never `import` from `/Users/n1/Projects/tsumugu/...`. Reading those files for reference is fine; depending on them is not.
- **Leave behind** (PRD §8.4): `host/fsVault.ts`, the voice/transcript/synced-video subsystem, Anki-from-chrome, `scripts/publish-public-vault.ts` personal inbox map, the `#/encoding` route + review/encoding views. The publisher rebuild explicitly drops `YOUTUBE_TITLES`, the audio sidecar copy, and the personal word-store seed.
- **Do NOT modify the engine `PREPARED_CONTENT_SCHEMA_V2`** — the `core` block is additive and the normalizer ignores it.
- **Do NOT introduce a grand-total reading count** anywhere — per-band counts only (task spec).
- **Composer uses its own subscription model** — no metered/pay-per-token LLM APIs in tooling or tests.

## Open questions for Wedge / Claude (only blockers)
1. **Rung display names** (the headline over each band). Until decided, ship subtitle-as-headline (`band · TOCFL n`); the surface is fully functional without names. (Claude to propose 3 candidate name-sets; Wedge picks.)
2. **Topic taxonomy** — facet `topic` is pass-through strings in v1; if a fixed topic vocabulary is wanted in the facet bar, it must come from the generation spec (WO-CORE-3/4). Default: derive the topic chip list from distinct `topic` values present in the manifest (no fixed taxonomy) — confirm this is acceptable for v1.
3. **Coverage scorer choice** — `scoreCI` (gate-consistent) vs `percentKnown` (card parity) for the card badge. Recommend `percentKnown` for the card (cheap, count-based, already matches the reused card math) and reserve `scoreCI` for the gate. Confirm.
