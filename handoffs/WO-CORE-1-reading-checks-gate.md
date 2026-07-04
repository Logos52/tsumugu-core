# WO-CORE-1 — `reading_checks` — the fail-closed prose QA gate

**For:** Composer (codegen). Use your own subscription model — no metered/pay-per-token APIs.
**Parent contract:** [`docs/PRD-Tsumugu-Core-v1.md`](../docs/PRD-Tsumugu-Core-v1.md) §6.1, §6.4, §6.5, §10.
**Origin placeholder:** `tsumugu.cc` (not load-bearing for this WO).
**Status:** START NOW. This is the binding cost; it precedes every generation wave.

---

## Goal

Build the deterministic, fail-closed gate that validates a generated **reading** (whole-prose `PreparedContent`) — in-band coverage, Traditional-clean script, sentence quality, paragraph repetition, CI band, and dual-rail/bridge/polyphone integrity — exposed as a `verifyReading()` callable plus a CLI, run on 100% of readings before any batch ends, with a skip-and-log queue for failures.

## Why / context

The model writes out-of-band; this gate enforces the controlled vocabulary and quality contract **after** generation (generate-then-GATE; PRD §6.1). It is the real cost and calendar of the product. We are porting a proven, shipped discipline — `example_checks.py` (sentence-scope, tsumugu-ed) and `scripts/gen/lib/verify.ts` (`verifyContent`, prepared-content scope, tsumugu monorepo) — from sentence/entry scope to **prose/reading scope**. **Claude owns the rubric thresholds; you code them as clearly-marked config constants; Wedge adjudicates the thresholds before first production use.** This WO is gate-only — no generation, no critique LLM, no repair loop (those are WO-CORE-3/4).

---

## Deliverables (real paths; this is a TypeScript module in the new Core repo)

Implement in **TypeScript** (not Python). Rationale: the entire reuse surface — `checkDefLevel`, `verifyContent`, `scoreCI`, `PreparedContent` schema — is TS in `@tsumugu/engine` + `scripts/gen/lib`. A Python port would re-implement `checkDefLevel`'s jieba-seeded segmentation + decomposition-credit logic from scratch and drift. The PRD names the gate `reading_checks.py` by analogy to `example_checks.py`; honor the **discipline**, implement in TS, and name the CLI command `reading-checks` so the analogy survives. (If Wedge insists on a literal Python file, that is the Open Question below — do not assume it.)

Create in the **new Core repo** (WO-CORE-0 stands it up; depends on `@tsumugu/engine` as a versioned package — do NOT fork the monorepo):

| File | Purpose |
|---|---|
| `packages/content-pipeline/src/readingChecks.ts` | The gate. Exports `verifyReading()`, `ReadingCheckOptions`, `ReadingCheckReport`, and the config-constant block. |
| `packages/content-pipeline/src/readingChecks.config.ts` | **Claude-owned thresholds** as exported `const`s (see §Config). One file, heavily commented, so Wedge/Claude tune without touching logic. |
| `packages/content-pipeline/src/lessonTarget.ts` | `LessonTarget` type + a loader stub that reads the reconciled `lesson → {vocab, grammar}` index (WO-CORE-2 output). For this WO, accept the target as an injected object; the loader stub reads a JSON fixture and is finalized in WO-CORE-2. |
| `packages/content-pipeline/src/hanviet.ts` | Hán-Việt lookup over `hanviet.json` + a `char_vi` membership set, both build-time only. Exports `loadHanViet()`, `hanVietReadings(char)`, `charViHas(char)`. |
| `packages/content-pipeline/src/cli.ts` | CLI entry: `reading-checks <reading.prepared.json>...` → per-reading verdict + nonzero exit on any FAIL. Reuse the `parseArgs/str/num/list/flag` helper pattern from `scripts/gen/lib/args.ts` (copy it in; it is 47 lines, MIT-equivalent first-party). |
| `packages/content-pipeline/src/skipLog.ts` | Append-only skip-and-log queue writer. Exports `appendSkipLog(report, reason, path)`. |
| `packages/content-pipeline/test/readingChecks.test.ts` | vitest suite (see §Acceptance). |
| `packages/content-pipeline/test/fixtures/*.prepared.json` | Hand-built fixtures: 1 clean pass, 1 with a planted above-band token, 1 with a planted Simplified leak, 1 with a planted ungrounded bridge cognate, 1 with a planted polyphone silent-drop, 1 with a repetition/length-spread violation. |

### Interfaces this WO must honor (verified against real source)

**The contract — `PreparedContent` (`@tsumugu/engine`, `types.ts:415`).** The gate's input is a generated reading already in this shape:
```ts
interface PreparedContent {
  schema: "tsumugu/prepared-content@1" | "tsumugu/prepared-content@2";
  lang: string;                                 // "zh-Hant"
  title?: string; source?: string;
  ciTarget?: number; ciMeasured?: number;
  tokens: PreparedToken[];                       // { text, isWord }
  glossary: Record<string, PrebakedEntry>;       // word → pre-baked resolution
  generatedAt?: string;
}
```
Tsumugu Core extends it (metadata only) with a vocab/grammar fingerprint + ACCC binding facet — the gate reads those if present but does not require them.

**`PrebakedEntry` (`types.ts:390`)** carries the VI rail: `bridge?: BridgeInfo`. **`BridgeInfo` (`types.ts:267`)**:
```ts
interface BridgeInfo {
  bridgeLang: string;            // "zh-Hant"
  etymon?: string;               // "發展"
  bridgeReading?: string;        // Hán-Việt "phát triển"
  morphemes?: BridgeMorpheme[];  // { surface, etymon, reading?, gloss? }
  meaning?: string; confidence?: number; corrected?: boolean;
}
```

**Reuse — DO NOT reimplement:**
- `checkDefLevel({ text, ceiling, index, field })` → `{ violations: DefLevelViolation[]; achievedLevel; levelEscalated; tokens }` — from `scripts/gen/lib/defLevel.ts`. This is the in-band engine: jieba-seeded segmentation (HMM off), TOCFL/freq band resolution, **greedy decomposition-credit** against the allow-list. `DefLevelViolation = { word, band, ceiling, field }`.
- `buildAllowList(ceilingBand, index)`, `resolveTokenBand`, `tocflOrdinal`, `tocflBandFromOrdinal`, `loadDefLevelIndex(dataDir?)` — from `scripts/gen/lib/defLevelData.ts`. `DefLevelIndex = { tocfl, freq, cedictWords? }`, loaded from `packs/private/zh-hant/data/{tocfl,freq,cedict}.json`.
- `scoreCI({ lang, tokens, getStatus, policy?, target?, targetWords? })` → `CiReport` — from `@tsumugu/engine` `ci/scorer.ts`. Use it for the CI band metric and the new-target recycle check (`targetWords` = the lesson's NEW vocab; `ok = count >= 3`).
- `verifyContent(opts)` → `VerifyReport` — from `scripts/gen/lib/verify.ts`. **Reuse its OpenCC `scriptNormalizer` path** (the `normalize()` helper diffing `pack.scriptNormalizer(s)` against `s`) for the s2twp guard. The reading-level gate WRAPS `verifyContent` for the glossary-scope checks (missing-glossary, zh-def band, OpenCC changes) and ADDS the prose-scope checks below.
- OpenCC s2twp discipline: mirror `example_checks.py` `simplified_diff(zh, allow)` semantics — `s2twp(text) != text` ⇒ Simplified/non-TW leak; the reading's own declared new-target headwords may be `allow`-exempted exactly as `example_checks.py` exempts the headword.

**Engine import surface (post-WO-CORE-0):** `import { scoreCI, parsePreparedContent, type PreparedContent, type PrebakedEntry, type BridgeInfo, type CiReport, type WordStore } from "@tsumugu/engine";` and the QA-lib pieces (`checkDefLevel`, `defLevelData`, `verifyContent`) from the extracted `scripts/gen` package. If WO-CORE-0's package boundary is not final when you start, import via a relative path against a local checkout and leave a `// TODO(WO-CORE-0): repoint to @tsumugu/...` marker — do not block on it.

### Data the gate reads (build-time only; gitignored; never bundled into client artifacts)

- **Band index:** `packs/private/zh-hant/data/{tocfl,freq,cedict}.json` (via `loadDefLevelIndex`). Private pack.
- **Hán-Việt:** `tsumugu-ed/sources/hanviet/hanviet.json` — `{ char: { hanViet, hanViets[], pinyinMap{}, sources[] } }`. **Verified: 10,540 chars, 9,928 single-reading (94.2%), 612 polyphone (5.8%)** — matches PRD §5.2.
- **Cognate membership:** `tsumugu-ed/sources/hanviet/char_vi.txt` (share-alike — build-time only, isolated, never shipped). Build a `Set<string>` of chars present, for the bridge-grounding check.

---

## Config (Claude owns these; mark them loudly; Wedge adjudicates before first prod run)

`readingChecks.config.ts` — every threshold a named exported `const` with a one-line rationale comment and a `// CLAUDE-OWNED — adjudicate before prod` banner at the top:

```ts
// CLAUDE-OWNED THRESHOLDS — adjudicate with Wedge before first production wave.
export const CI_BAND_TARGET = 0.95;          // coverage floor (engine DEFAULT_CI_TARGET)
export const ABOVE_BAND_ALLOWANCE = 0;       // tokens above ceiling beyond declared new-target that still PASS (0 = fail-closed)
export const NEW_TARGET_RECYCLE_MIN = 3;     // each lesson NEW word must recur >= N (scoreCI ok threshold)
export const SENTENCE_MIN_HAN = 4;           // shortest acceptable sentence, Han chars
export const SENTENCE_MAX_HAN = 60;          // longest before "run-on" flag
export const READING_LENGTH_SPREAD_MIN = 8;  // max - min sentence Han-count across the reading
export const PARA_REPETITION_MAX_RATIO = 0.30; // max share of any single content word within a paragraph
export const DISTINCT_OPENER_MIN_RATIO = 0.6;  // distinct sentence-opening bigrams / sentences
export const MIN_SENTENCES = 3;              // a "reading" must be real prose, not a snippet
```
Defaults above are Claude's starting proposal seeded from `example_checks.py` (SPREAD_MIN=5 was sentence-set scope; prose gets a larger spread). They are **not** Wedge-approved yet — that is the gate of "before first prod run," not of this WO landing.

---

## Step-by-step (mechanical)

1. **Scaffold** `packages/content-pipeline` in the Core repo with `package.json` (`"type": "module"`, depends on `@tsumugu/engine` + the extracted QA lib), `tsconfig.json`, and `vitest` as devDep. Add `"test": "vitest run"` (mirror the monorepo root `package.json`).
2. **Copy `args.ts`** (the 47-line `parseArgs/str/num/list/flag`) into `src/args.ts`. First-party, trivial.
3. **`hanviet.ts`:** `loadHanViet(path?)` parses `hanviet.json` into a `Map<string, { hanViets: string[]; pinyinMap: Record<string,string> }>`. `hanVietReadings(char)` returns `hanViets`. `charViHas(char)` checks the `char_vi.txt` membership set. Parse `char_vi.txt` by splitting each line on `_`; the leading field is the headword char — collect field[0] for every line into the set. (Confirm the column convention by eyeballing the file; the headword is the first underscore-delimited token.)
4. **`lessonTarget.ts`:** define
   ```ts
   interface LessonTarget {
     lessonId: string;                 // "ACCC-B4L3"
     ceiling: string;                  // "TOCFL-3" — the cumulative band ceiling
     cumulativeVocab: Set<string>;     // every word allowed without being new-target
     newVocab: string[];               // lesson NEW words (must appear + recycle)
     newGrammar: string[];             // lesson NEW grammar point ids/markers
   }
   ```
   Loader stub reads a JSON fixture; finalized against WO-CORE-2's reconciled index. **Hard-gate dependency:** real lesson targets are untrustworthy until WO-CORE-2 reconciles the 5 disagreeing extractions — this WO ships with fixtures and a stub.
5. **`readingChecks.ts` — `verifyReading()`.** Signature:
   ```ts
   interface ReadingCheckOptions {
     content: PreparedContent;       // the generated reading
     target: LessonTarget;
     store?: WordStore;              // optional; defaults to an empty store (anonymous reader)
     defLevelIndex?: DefLevelIndex;  // injectable for tests
     hanviet?: HanVietIndex;         // injectable for tests
     config?: Partial<ReadingChecksConfig>; // override constants in tests
   }
   interface ReadingCheckReport {
     pass: boolean;
     reasons: string[];              // human-readable FAIL strings (example_checks.py style: "field: what, got X")
     achievedLevel: string;          // max TOCFL band measured across the prose (TOCFL-N)
     aboveBandTokens: { word: string; band: string }[];  // tokens above ceiling, not new-target, not decomposition-credited
     ciMeasured: number;
     newTargetRecycle: { word: string; count: number; ok: boolean }[];
     scriptLeaks: { before: string; after: string }[];   // OpenCC s2twp diffs
     bridgeFailures: { word: string; etymon?: string; reason: string }[];
     polyphoneRisks: { word: string; char: string; reason: string }[];
   }
   export async function verifyReading(opts: ReadingCheckOptions): Promise<ReadingCheckReport>;
   ```
   Implement the checks in this order; **fail-closed** — any single failing check sets `pass=false` and appends to `reasons` (collect ALL reasons, do not short-circuit):
   - **A. In-band coverage.** Run `checkDefLevel` over the prose text (join word tokens) against `target.ceiling`, EXCEPT `target.newVocab` (exempt the declared new-target words). Any remaining violation (above ceiling, not decomposition-credited) beyond `ABOVE_BAND_ALLOWANCE` ⇒ FAIL; populate `aboveBandTokens`; `achievedLevel = checkDefLevel().achievedLevel`. Also FAIL any token NOT in `target.cumulativeVocab ∪ target.newVocab` once WO-CORE-2 lands a real set (with the stub, rely on the band ceiling).
   - **B. Features the new items.** Every word in `target.newVocab` must appear ≥1× (and recycle ≥ `NEW_TARGET_RECYCLE_MIN` via `scoreCI` `targetWords`). Every `target.newGrammar` marker must be detectable (substring/marker match — leave the grammar-marker matcher as a documented `TODO` keyed to WO-CORE-2's grammar representation; for now match literal marker strings). Missing new vocab/grammar ⇒ FAIL.
   - **C. OpenCC s2twp script guard.** Reuse `verifyContent`'s normalize path OR call the pack `scriptNormalizer` directly over `tokens[].text` + every glossary string; any diff not covered by `target.newVocab` headword allow ⇒ record in `scriptLeaks` + FAIL. Mirror `example_checks.py simplified_diff`.
   - **D. Sentence completeness + length spread.** Split prose into sentences on `。！？` (tolerate trailing closers `」』）)"'` exactly like `example_checks.py is_complete_sentence`). Each sentence: complete (ends in final punct), `SENTENCE_MIN_HAN ≤ hanCount ≤ SENTENCE_MAX_HAN`. Reading: `≥ MIN_SENTENCES` sentences; `max−min hanCount ≥ READING_LENGTH_SPREAD_MIN`. Reuse the `HAN_RE` + `han_count` regex semantics from `example_checks.py`.
   - **E. Paragraph-scope repetition / distinct-collocation.** Split on blank lines / paragraph token. Per paragraph: no single content word (word token, not punctuation/function word) exceeds `PARA_REPETITION_MAX_RATIO` of content words; distinct sentence-opening bigrams / sentence count ≥ `DISTINCT_OPENER_MIN_RATIO`. Violations ⇒ FAIL with the offending word/ratio.
   - **F. CI band.** `scoreCI({ lang, tokens, getStatus: store.getStatus, target: CI_BAND_TARGET })`; `ciMeasured = coverage`. Below target with an empty/anonymous store is expected for a graded reading; **the CI check is INFORMATIONAL by default** (report `ciMeasured`, do not FAIL on it) — the binding band check is (A). Mark this clearly; Claude may promote it to fail-closed via config after adjudication. (Rationale: an anonymous reader knows nothing, so CI-against-empty-store is structurally low; (A) is the real leveling gate.)
   - **G. Dual-rail integrity.** Every unknown word token must have a glossary entry with a usable gloss (reuse `verifyContent` `missingGlossary`). On the VI rail, each glossary entry's `bridge` (when present) must be **grounded**: for every `morpheme.etymon` char asserted, `charViHas(char)` must be true; a bridge asserting a cognate char absent from `char_vi` ⇒ `bridgeFailures` + FAIL (PRD §5.2, §6.4). A reading with no VI rail at all ⇒ FAIL (PRD §2.2: a reading without a verified VI rail does not ship).
   - **H. Polyphone safety (`byReading` silent-drop).** For each bridge morpheme/etymon char that is polyphone in `hanviet.json` (`hanViets.length > 1`), the asserted `reading` must match one of the `pinyinMap` values; an unmatched reading that would silently drop ⇒ `polyphoneRisks` + FAIL (PRD §5.3). Label any uncertainty "candidate / to-integrate" — **g2pW is NOT integrated**; do not call it or assume it.
   - Assemble `pass = reasons.length === 0`.
6. **`cli.ts`:** `reading-checks <file...>` loads each via `parsePreparedContent` (engine) → `verifyReading` → prints `OK <path>` or `FAIL <path>:` + indented reasons (exact `example_checks.py __main__` format). Resolve the lesson target from the reading's ACCC-binding facet via the `lessonTarget` loader. Exit nonzero if any FAIL. Add `--skip-log <path>` to route failures through `appendSkipLog`.
7. **`skipLog.ts`:** `appendSkipLog(report, reason, queuePath)` appends one JSON line `{ ts, path, reasons }` (JSONL). Idempotent append; create the file if absent.
8. **Tests + fixtures** (§Acceptance). Use **injected** `defLevelIndex`/`hanviet`/`target` fixtures (the real private packs are gitignored — tests must not depend on them; build tiny in-test indices, mirroring `defLevel.test.ts` which injects a fixture `DefLevelIndex`).
9. **README** at `packages/content-pipeline/README.md`: one screen — what the gate enforces, how to run it, where the Claude-owned thresholds live, and the explicit "adjudicate before prod" note.

---

## Acceptance criteria / tests (concrete, checkable)

- `pnpm --filter content-pipeline test` (vitest) is **green**.
- `verifyReading` on the **clean fixture** with an empty/anonymous `WordStore` returns `pass:true`, empty `reasons`, and a sensible `achievedLevel` (≤ the fixture's ceiling).
- A **planted above-band token** fixture (e.g. a TOCFL-5 word in a TOCFL-3 reading, not in `newVocab`, not decomposition-creditable) ⇒ `pass:false`, the token in `aboveBandTokens`, a reason naming it.
- A **planted Simplified leak** (e.g. `学` inside Traditional prose) ⇒ `pass:false`, the diff in `scriptLeaks`.
- A **planted ungrounded bridge** (a `morpheme.etymon` char NOT in the injected `char_vi` set) ⇒ `pass:false`, entry in `bridgeFailures`.
- A **planted polyphone silent-drop** (a `hanViets.length>1` char whose asserted `reading` matches no `pinyinMap` value) ⇒ `pass:false`, entry in `polyphoneRisks`.
- A **repetition / short-spread** fixture (one word >30% of a paragraph's content words, or spread < min) ⇒ `pass:false` with the offending detail.
- A **missing-new-target** fixture (a `newVocab` word absent, or present only once when recycle min is 3) ⇒ `pass:false`.
- CLI: `node dist/cli.js reading-checks test/fixtures/clean.prepared.json` prints `OK`, exit 0; on the planted-fail fixture prints `FAIL …` with reasons, exit nonzero.
- The gate **collects all failures** (a reading failing on script AND band reports both reasons), not just the first.
- All thresholds resolve from `readingChecks.config.ts`; a test overriding `config` (e.g. `ABOVE_BAND_ALLOWANCE: 1`) flips the planted-above-band fixture to pass — proving the constants are the single tuning surface.

---

## Dependencies

- **WO-CORE-0 (Repo + engine package extraction) — MUST land first.** This WO imports `@tsumugu/engine` + the extracted `scripts/gen` QA lib as packages. If WO-CORE-0 is mid-flight, develop against a relative checkout with `// TODO(WO-CORE-0)` repoint markers; do not block.
- **WO-CORE-2 (ACCC grammar→lesson index reconciliation) — soft dependency.** This WO ships with `LessonTarget` fixtures + a loader stub. Real lesson targets (and check A's `cumulativeVocab` set + check B's grammar-marker matcher) are only trustworthy once WO-CORE-2 reconciles the 5 disagreeing extractions (227/351/374/386/434). Wire the stub to consume WO-CORE-2's index when it lands.
- This WO **unblocks** WO-CORE-3 (dual-rail gen + g2pW eval) and WO-CORE-4 (generate→critique→repair) — both call `verifyReading` as the mechanical gate before critique.

---

## Out of scope / do NOT

- **No generation, no critique LLM, no repair loop, no Batches API** — gate only. (WO-CORE-3/4.)
- **Do NOT fork the `tsumugu` monorepo.** New Core repo; depend on `@tsumugu/engine` as a versioned package. Its `apps/web` is saturated with personal vault/voice/inbox coupling — leave it.
- **Do NOT reimplement** `checkDefLevel`, `scoreCI`, the OpenCC normalize path, or the band-index loader — import and wrap them.
- **Do NOT integrate or call g2pW.** It is "candidate / to-integrate." The 94.2% single-reading path ships; the gate only *flags* the 5.8% polyphone risk (check H), it does not resolve it.
- **Do NOT bundle copyleft data into shipped client artifacts.** `char_vi.txt` (share-alike) + `chinese-hanviet-cognates.tsv` (unlicensed) are **build-time-only, isolated, gitignored**. The gate reads them at build; nothing they touch ships to the browser.
- **Do NOT presuppose accounts/sync/payments.** `store` defaults to an empty anonymous `WordStore`; known-state is local-only. (Those systems are Phase 2/3.)
- **Leave behind** (do not import): `host/fsVault.ts`, the voice/transcript/synced-video subsystem, Anki export from chrome, `scripts/publish-public-vault.ts`, the `#/encoding` route + review/encoding views.
- **No AllSet Grammar Wiki** as a data source (CC-BY-NC-SA, ruled out).
- **Use your own subscription model for codegen** — no metered/pay-per-token APIs for tooling.

---

## Open question for Wedge/Claude (only blockers)

1. **Language of the gate: TS vs literal Python.** This WO implements in **TypeScript** (the entire reuse surface — `checkDefLevel`, `verifyContent`, `scoreCI` — is TS; a Python `reading_checks.py` would re-implement jieba-seeded decomposition-credit and drift from the proven path). The PRD names it `reading_checks.py` by analogy. **Confirm TS is acceptable** (recommended), or, if a Python file is required for parity with the tsumugu-ed corpus tooling, scope a thin Python CLI that shells the TS gate. — Claude's recommendation: **TS**.
2. **Thresholds in `readingChecks.config.ts` are Claude's starting proposal, not adjudicated.** They block *first production use*, not this WO landing. Wedge reviews the config block (esp. `ABOVE_BAND_ALLOWANCE=0`, `PARA_REPETITION_MAX_RATIO`, `READING_LENGTH_SPREAD_MIN`) before the pilot wave.
