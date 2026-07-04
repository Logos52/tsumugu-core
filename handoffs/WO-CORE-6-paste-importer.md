# WO-CORE-6 — Paste-only client-side BYO importer (copyright firewall)

**Audience:** Composer (codegen agent). Execute mechanically; surface only the §Open-question blockers.
**Operating model:** Composer drives this with **its own subscription model** — do NOT call any metered/pay-per-token LLM API anywhere in this work. No new runtime network calls of any kind (see §Out-of-scope).

---

## Goal
Ship a paste-only, fully client-side BYO importer: pasted Chinese text is segmented in-browser, glossed against the owned packs, assembled into an in-memory `PreparedContent` (`@2`), and rendered in the **same** reader + rails + tap-to-gloss — with the text **never leaving the browser**.

## Why / context
The copyright firewall: we cannot host user text, so the importer is the one interactive feature in the static v1 catalog (PRD §3.3, §9). It reuses the already-built primitives end to end — `segmentLiveText` (jieba-wasm) + the pack `dictionaryProvider` glossing + `AppState.setContent` — so this is wiring + a paste surface + visible legal copy, not new engine work. Parent contract: `/Users/n1/Projects/tsumugu-core/docs/PRD-Tsumugu-Core-v1.md` (§3.3 the one interactive feature, §4.5 read path, §8.2 the PreparedContent contract, §9 client-side-only import).

---

## Exact deliverables

All paths are in the **NEW Core repo** (`tsumugu-core` app package, stood up by WO-CORE-0), which consumes `@tsumugu/engine` as a versioned package and reuses the ported web modules. The importer is a thin layer over ported code; **do not modify `@tsumugu/engine`**.

### D1 — `src/import/prepareFromText.ts` (NEW, the core of this WO)
Pure, DOM-free, data-free. Turns a raw string into an in-memory `PreparedContent`. Reuses ports — does NOT reimplement segmentation or glossing.

```ts
import type { LanguagePack, PreparedContent, PrebakedEntry } from "@tsumugu/engine";
import { PREPARED_CONTENT_SCHEMA_V2 } from "@tsumugu/engine";
import { segmentLiveText } from "../packs/jiebaSegment.js"; // ported from apps/web/src/packs/jiebaSegment.ts

export interface PrepareFromTextOptions {
  pack: LanguagePack;          // zh-Hant pack from packForLang("zh-Hant", { vault })
  title?: string;              // user-supplied or first ~12 chars; default "Pasted reading"
  maxChars?: number;           // default 20000 — hard cap, reject longer (see D3)
}

/**
 * Segment `text` via the pack (jieba-wasm for zh-Hant), gloss each distinct
 * word via pack.dictionaryProvider, and assemble a PREPARED_CONTENT_SCHEMA_V2
 * PreparedContent. Words with no dictionary hit get a minimal stub entry
 * ({ term, gloss: "" }) so the reader still renders + colors them; hover shows
 * "No definition yet." (existing wordPopup fallback). NEVER throws on a missing
 * gloss. source MUST be the literal string "imported" (never the pasted text).
 */
export async function prepareFromText(
  text: string,
  opts: PrepareFromTextOptions,
): Promise<PreparedContent>;
```

Implementation contract:
- `tokens`: map each `Token` from `segmentLiveText` to `{ text, isWord }` (drop `start`/`end`). Preserve order incl. punctuation/whitespace tokens (`isWord: false`).
- `glossary`: keyed by surface form; one `PrebakedEntry` per **distinct** word token. Build each entry from `await pack.dictionaryProvider(word)` (returns `DictEntry | undefined`): map `reading`, `gloss`/`definitions.en`, `pos`, `level` when present; on `undefined`, emit `{ term: word, gloss: "" }`. Resolve all lookups with bounded concurrency (≈8 at a time) over the distinct set, not per-token.
- `lang: pack.id` (e.g. `"zh-Hant"`), `schema: PREPARED_CONTENT_SCHEMA_V2`, `source: "imported"`, `generatedAt: new Date().toISOString()`. **No `ciTarget`/`ciMeasured`** (unmeasured user text).
- Output MUST pass the engine's `isPreparedContent` / `parsePreparedContent` guard (`@tsumugu/engine` `content/prepared.ts`). Round-trip it through `parsePreparedContent(JSON.stringify(out))` in a test to prove conformance.

### D2 — `src/import/importPanel.ts` (NEW — the paste UI)
A controller that mounts the paste surface and, on submit, calls `prepareFromText` then `app.setContent(content)`. Reuses the existing reader: after `setContent`, the already-mounted reader re-renders from `app.content` (it listens on `app.emit("change")`), so **no bespoke render loop** — do not re-implement `renderWord`/`wordPopup`.

```ts
import type { AppState } from "../state.js";
export interface ImportPanelOpts { app: AppState; }
export interface ImportPanelController { open(): void; close(): void; destroy(): void; }
export function mountImportPanel(root: HTMLElement, opts: ImportPanelOpts): ImportPanelController;
```

UI requirements:
- A `<textarea>` (paste target) + a "Read it" submit button + a "Clear" button. Inter chrome face; reading column uses the House layout once rendered.
- The **visible privacy notice** (D4) sits adjacent to the textarea, always visible (not behind a tooltip).
- On submit: trim, enforce `maxChars` (D3), build the zh-Hant pack via `packForLang("zh-Hant", { vault })` (vault may be null in v1 — packs degrade to prebaked/stub gloss), `await prepareFromText(...)`, `app.setContent(content)`, then close the panel so the reader is the surface. Loading state on the button while jieba-wasm warms (the ~4 MB wasm is a lazy dynamic import — first import is slow; show a spinner, never block bootstrap).
- Honor the active `data-rail`/`data-script`/`data-reading`/`data-gloss`/`data-palette`/`data-theme` on `<html>` — the importer sets NONE of them; the rendered reading inherits the live scaffolding (PRD §4.3). The VI rail will simply show empty Hán-Việt ruby + no bridge for imported text (the bridge is generation-time only; do not fabricate it client-side — see §Out-of-scope).
- Style with `--tsg-*` semantic tokens only (e.g. `--tsg-surface`, `--tsg-border`, `--tsg-ink`, `--tsg-muted`, `--tsg-accent` for the submit/"known" violet). Never hardcode hex. Tokens + the data-* substrate are defined in `/Users/n1/Projects/tsumugu-core/mockups/reader-house-silk.html` (the canonical design); the submit affordance MAY use reserved violet `--tsg-accent` (it is a confirm action), but status/prose fills must not.

### D3 — Guardrails (in D1/D2, no separate file)
- **Length cap:** `maxChars` default 20000; over-cap submit is rejected with an inline message ("Paste is too long — trim to ~20,000 characters"). No silent truncation of a partial reading.
- **No persistence of text:** the textarea value and the resulting `PreparedContent` live in memory + the reader session only. Do **not** write the pasted text or the imported `PreparedContent` to localStorage/IndexedDB/sessionStorage/cookies. (Known-word state from *reading* the import still records via the existing `app.setContent → recordContentSeen → wordStore` path — that stores **words seen**, the engine's existing local behavior, not the source text. That is acceptable and intended; PRD §4.6 lookup-is-capture.)
- **No network:** `prepareFromText` and `importPanel` issue zero `fetch`/`XMLHttpRequest`/`WebSocket`/`navigator.sendBeacon` calls. jieba-wasm + packs are bundled/local. Add a test asserting no network primitive is referenced in the import module (see T5).

### D4 — Privacy / legal copy (visible in-UX)
Copy is **softened** per the critic's caution on the open EU/BGH theory (PRD §9): state what the client does, not an absolute guarantee. Use exactly this string (Wedge may revise wording in review — keep it as a single exported constant `IMPORT_PRIVACY_NOTICE` in `src/import/copy.ts` so it is trivially editable):

> "Your text is processed entirely in your browser. We never send it to a server, store it, or add it to any shared library."

Plus a one-line caption under the textarea: "Paste-only. Files, EPUB, and a shared library are not supported."

### D5 — Catalog/facets surface (the rest of the WO-CORE-6 PRD line)
Per PRD §10, WO-CORE-6 also covers the public catalog + facets→URL-hash + ACCC-binding facet over the ported `library/*` + `catalog/coverage.ts`. **Scope split:** if WO-CORE-6 is being executed as the importer slice only, build D1–D4 and STOP; leave a `// WO-CORE-6/catalog: see PRD §4.7, §10` marker. If executing the full line, add `src/catalog/facets.ts` (serialize `{ format, band, lessonBinding }` to `location.hash`, restore on load) over the existing `catalog/coverage.ts` (`percentKnown`, `readingBand`, `bandLabel`) + `library/switcher.ts` (`mountCommandSwitcher`). The importer (D1–D4) is the **load-bearing** deliverable and the acceptance gate below targets it; the catalog is additive.

---

## Step-by-step (mechanical)
1. Confirm WO-CORE-0 (repo + `@tsumugu/engine` package) and WO-CORE-5 (reader shell + restyle: `reader.ts`, `wordPopup.ts`, `state.ts`/`AppState`, `packs/*`, `--tsg-*` tokens) have landed in the Core repo. If `packs/jiebaSegment.ts` or `AppState.setContent` are not yet ported, STOP and report (this WO depends on them).
2. Port-check `segmentLiveText` (from `/Users/n1/Projects/tsumugu/apps/web/src/packs/jiebaSegment.ts`) and `packForLang` (from `.../packs/index.ts`) are available in the Core repo. Confirm `jieba-wasm` is a dep and resolves to the bundler build under Vite (dynamic `import("jieba-wasm")`).
3. Write `src/import/copy.ts` (D4 constants).
4. Write `src/import/prepareFromText.ts` (D1). Bounded-concurrency gloss resolution over the distinct word set.
5. Write `src/import/importPanel.ts` (D2) + minimal CSS using `--tsg-*` tokens. Wire submit → `prepareFromText` → `app.setContent`.
6. Add an entry point to open the panel from the reader chrome (a quiet "Paste text" control; recede it per PRD §4.1). Reuse existing chrome button styles.
7. Write tests T1–T6.
8. Run the gate (`npm test` / `vitest run`) and the typecheck; both green.

---

## Acceptance criteria / tests
- **T1 — schema conformance:** `prepareFromText("今天天氣很好。", { pack })` returns an object that `parsePreparedContent(JSON.stringify(out))` accepts without throwing; `out.schema === "tsumugu/prepared-content@2"`, `out.source === "imported"`, `out.lang === "zh-Hant"`.
- **T2 — segmentation + glossary:** tokens are in document order, punctuation tokens carry `isWord: false`, and every distinct word token has a `glossary[word]` entry (real gloss when the pack hits, `{ term, gloss: "" }` stub otherwise). `vitest` green.
- **T3 — renders with an empty WordStore:** construct an `AppState` with an empty `WordStore`, `setContent(prepareFromText(...))`, mount the reader; it renders every word span (`.tsg-word`) with a status color class and no throw. Tapping a word opens the existing `wordPopup` (real gloss → card; stub → "No definition yet.").
- **T4 — no persistence:** after a full import + read cycle in a jsdom test, assert `localStorage`/`sessionStorage` contain no substring of the pasted text and no key holding the imported `PreparedContent` body. (The word-store entries record words-seen only — assert the store has entries but none holds the raw paste string.)
- **T5 — no network:** static assertion that `src/import/prepareFromText.ts` and `src/import/importPanel.ts` reference no `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` (grep-style test or a fetch-spy that must record zero calls during T3).
- **T6 — length cap:** a `> maxChars` input is rejected by `importPanel` submit with the inline message and `app.setContent` is NOT called.
- **Typecheck + lint green; `vitest run` green.** Bundle hygiene: the import path must not pull `host/fsVault.ts` or any voice/transcript module (reuse the existing `bundleHygiene.test.ts` pattern if ported).

---

## Dependencies (must land first)
- **WO-CORE-0** — NEW Core repo + extracted `@tsumugu/engine` versioned package + ported web modules (`packs/*`, `state.ts`, `reader/*`, `hover/wordPopup.ts`, `catalog/*`, `library/*`). HARD prerequisite.
- **WO-CORE-5** — reader shell + restyle (House layout, `--wnac-*`→`--tsg-*` tokens, 6 palettes, underline status, the `data-*` substrate, tsumugu-ed tap-out). The importer renders into this shell and inherits its scaffolding.
- Independent of WO-CORE-1/2/3/4 (the content-generation + gate pipeline). The importer touches **no** generation, gate, or bridge code.

---

## Out of scope / do NOT
- **Do NOT fork the `tsumugu` monorepo.** Build in the NEW Core repo against `@tsumugu/engine` (PRD §8.1). Reuse by porting the named web modules, not by importing from the monorepo path.
- **Do NOT modify `@tsumugu/engine`.** If the contract feels insufficient, surface it as an Open question — do not patch the package.
- **No file/EPUB/.txt drag-drop.** Paste-only in v1 (PRD §3.3). No `<input type="file">`, no drop handlers.
- **No shared/community library, no upload, no server storage, no sync.** No backend call of any kind. The text is browser-only (PRD §9).
- **No machine-translation of prose.** Gloss morphemes/words only (the per-word pack gloss). Do not translate sentences or paragraphs.
- **Do NOT fabricate the VI cognate bridge for imported text.** The bridge is generation-time-verified against `char_vi` (PRD §5.2, §6.5); asserting it client-side would ship ungrounded cognates. Imported text on the VI rail shows Hán-Việt ruby (deterministic single-reading lookup, where the pack provides it) but **no bridge card**.
- **Do NOT integrate g2pW** here (it is "candidate / to-integrate", PRD §5.3); single-reading lookup only, accept silent polyphone behavior for imports (these are unverified user texts, not catalog content).
- **Leave-behind (do not import or wire):** `host/fsVault.ts` (File-System-Access vault), the voice/transcript/synced-video subsystem, Anki export from chrome, `scripts/publish-public-vault.ts`, the `#/encoding` route + review/encoding views (PRD §8.4). The wordPopup's `#/encoding/…` deep-link should be repointed to the tsumugu-ed tap-out in WO-CORE-5; this WO does not own that and must not re-add the encoding route.
- **No analytics/telemetry on the pasted content.** A page-level analytics hook (WO-CORE-7) must never receive text content.
- **No metered LLM API** anywhere in tooling or runtime — Composer uses its own subscription model.

---

## Open question for Wedge/Claude (only if it blocks)
1. **`maxChars` cap.** Default proposed: **20,000** chars (a long short-story / lesson 課文 scale; keeps jieba-wasm + per-word gloss responsive). Confirm or set the ceiling.
2. **Privacy copy phrasing (D4).** The string is softened per the EU/BGH caution (PRD §9). Wedge owns final wording — proceed with the proposed `IMPORT_PRIVACY_NOTICE` string and flag it for his review; no code blocks on it.
3. **D5 catalog scope.** Confirm whether this WO executes the importer slice only (D1–D4) or the full WO-CORE-6 line (D1–D5). Default: build D1–D4 first (load-bearing), catalog additive.
