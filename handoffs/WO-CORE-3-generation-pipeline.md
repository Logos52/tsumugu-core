# WO-CORE-3 — Leveled-reading generation pipeline (Batches generate→critique→repair) + Textbook-Companion slot

**For:** Composer (codegen agent) · **Owner of rubric/adjudication:** Claude · **Owner of prompt content + authoring waves:** Claude/loom · **Reviewer:** Wedge
**Repo:** the new Core repo stood up in WO-CORE-0 (depends on `@tsumugu/engine` as a versioned package). **Origin placeholder:** `tsumugu.cc`.
**Parent contract:** `/Users/n1/Projects/tsumugu-core/docs/PRD-Tsumugu-Core-v1.md` (§6 content generation, §7 Textbook Companion, §5 the bridge). Read §6.1–6.8 and §7.1–7.4 before starting.

---

## Goal
Build the harness that takes an ACCC lesson target, generates an original level-graded reading out-of-band on the Batches API, runs it through generate→critique→repair, populates both rails (EN pinyin+gloss, VI Hán-Việt+gloss+verified cognate bridge), and emits a gated `prepared.json` — plus the prerequisite tooling that reconciles the five ACCC grammar extractions into one authoritative lesson→{vocab,grammar} index.

## Why / context
The product is content wearing a thin shell; the binding cost is QA throughput, not code. This WO is the mechanical spine that lets loom/Grok author at volume and Claude adjudicate. It implements the PRD's 7-stage pipeline (§6.2) and the companion-as-engine slot (§7.1). **Generate-then-GATE is non-negotiable:** the model writes naturally; the deterministic gate enforces the controlled vocabulary after the fact. **Never inject the wordlist into the generation prompt** — HSKStory proved that degrades quality (§6.1).

## Dependencies (must land first)
- **WO-CORE-0** — Core repo + extracted `@tsumugu/engine` (+ `scripts/gen` QA lib) as a versioned package. This WO imports from that package; do not reach into `/Users/n1/Projects/tsumugu/packages/engine/src` directly in shipped code.
- **WO-CORE-1** — `reading_checks.py`, the fail-closed mechanical gate. This WO **calls** it as stage 3 and stage 6 validation; it does not re-implement it. If WO-CORE-1 has not landed, stub the gate behind an interface (`runReadingChecks(preparedPath) -> {ok, violations[]}`) and wire the real binary when it lands.
- **Sub-task A (in this WO, blocks generation):** the ACCC grammar→lesson index reconciliation (§A below). No textbook-bound generation wave runs until this produces one authoritative file and Claude has adjudicated it.

---

## Sub-task A (PREREQUISITE) — Reconcile the ACCC grammar→lesson index

### Context
Five disagreeing extractions exist of the same ACCC grammar set, all in `/Users/n1/Projects/tsumugu-core/private/` (gitignored — `private/` is in `.gitignore`; **never republish**):

| File | points |
|---|---|
| `dangdai-grammar-index.json` | 227 |
| `dangdai-grammar-index.grok.json` | 351 |
| `dangdai-grammar-index.composer.json` | 374 |
| `dangdai-grammar-index.v2.json` | 386 |
| `dangdai-grammar-index.qwen.json` | 434 |

Each is `{ source, edition, extracted, points: [...] }`. A point looks like:
```json
{ "pattern_id": "accc-b1-l01-呢", "name_zh": "呢", "name_pinyin": "...",
  "structure_template": "S + 呢 + …", "function_tag": "...",
  "book": 1, "lesson": 1, "cumulative_through": "b1l01",
  "source_ref": { "pdf": "...", "page": 28 },
  "taxonomy_id": null, "tocfl_band": "A", "confidence": "high",
  "extraction_method": "text", "later_appearances": [] }
```
Ground-truth source pages are the highlights markdown: `/Users/n1/Projects/tsumugu-core/private/dangdai-grammar/book{1..5}-highlights.md` (the 各課重點 / Highlights pages). Per-book intermediate extractions are in `/Users/n1/Projects/tsumugu-core/private/dangdai-intermediate/`.

### Deliverables (Sub-task A)
Mechanical tooling only — Composer builds the merge+validate+report; **Claude adjudicates the merged content**, Wedge signs off before first generation use.

- `scripts/accc/reconcile-grammar-index.ts` — load all five extractions, align points by `(book, lesson)` then fuzzy-match within a lesson on `name_zh` + normalized `structure_template`, emit:
  - `private/dangdai-grammar-index.merged.json` — the union with per-point provenance: `sources: ["json","grok","composer","v2","qwen"]` (which extractions carried it), `agreement: <int 1..5>`, and a `status: "confirmed" | "review"` (confirmed = agreement ≥ 3 AND book/lesson unanimous; everything else = review).
  - `private/dangdai-grammar-reconcile-report.md` — counts per book/lesson, the conflict list (points where extractions disagree on lesson assignment), and the orphans (points in exactly one extraction). This is the worksheet Claude adjudicates against the highlights markdown.
- `scripts/accc/validate-grammar-index.ts` — schema-validate the final adjudicated file; fail-closed on: missing `(book,lesson)`, `cumulative_through` not matching `b{book}l{lesson:02}`, duplicate `pattern_id`, `tocfl_band` not in `{A,B,C}`, `structure_template` empty.
- `private/dangdai-grammar-index.FINAL.json` — the authoritative output after Claude adjudication (Composer scaffolds the empty target + the validate gate; Claude fills/edits content; the validator must pass on it). Schema = same point shape, plus `status` dropped (FINAL is all-confirmed).

### Acceptance (Sub-task A)
- `reconcile-grammar-index.ts` runs clean against all five real files and writes both outputs; `merged.json` point count ≥ 434 (superset) with every point carrying `agreement` + `sources`.
- `validate-grammar-index.ts` exits non-zero on a planted bad point (e.g. `cumulative_through:"b1l1"` mismatch) and zero on `FINAL.json`.
- The report names every lesson-assignment conflict (this is the list Claude works).
- `FINAL.json` is gitignored (it sits under `private/`) and never enters a shipped artifact.

---

## Sub-task B — The Textbook-Companion lesson-target resolver

### Deliverable
`scripts/accc/resolve-lesson-target.ts` — given `"b4l3"` (or `{book,lesson}`), emit the generation target:
```ts
interface LessonTarget {
  lesson: string;                 // "b4l03"
  cumulativeVocab: string[];      // union of all vocab through this lesson (Traditional)
  cumulativeGrammar: GrammarPoint[];
  newVocab: string[];             // this lesson's 生詞 only
  newGrammar: GrammarPoint[];     // this lesson's new grammar points
  cumulativeHanzi: string[];      // distinct chars across cumulativeVocab
}
```
Sources (all gitignored, local):
- **Vocab:** `/Users/n1/Projects/tsumugu-core/private/dangdai-vocab/dangdai.csv` (4,960 terms; columns `ID,Traditional,Simplified,Pinyin,POS,Meaning,Audio,Variants,Tags`; ID format `B4L03-...`). Cumulative-through-lesson = union of all rows with book/lesson ≤ target. Pre-built cumulative fixtures exist for the PC-001 lesson: `private/dangdai-vocab/_cumulative-b4l3-trad.txt` and `_cumulative-b4l3-chars.txt` — use them to assert the resolver (through B4L3 = 2,196 words / 1,353 hanzi per PRD §7.2).
- **Grammar:** `private/dangdai-grammar-index.FINAL.json` from Sub-task A.

### Acceptance (Sub-task B)
- `resolveLessonTarget("b4l3")` returns 2,196 cumulativeVocab and 1,353 cumulativeHanzi (matches the `_cumulative-b4l3-*` fixtures).
- `newVocab` for B4L3 ≈ 20 words (PC-001); `newGrammar` non-empty.
- vitest green; resolver throws (not silently empties) on an unknown lesson id.

---

## Sub-task C — The leveled-reading prompt template

### Deliverable
`scripts/gen/prompts/leveled-reading-zh.md` — a sibling of the existing `scripts/gen/prompts/content-prep.md` and `dict-examples-zh.md`. Mirror their format exactly: H1 + "agent-run, no live API in the gen CLI" framing + Inputs / What to produce / Rules / Output sections.

**Hard rules the template must encode (these are the load-bearing content decisions — Claude/loom own the prose; Composer scaffolds the file + the input-wiring):**
- The controlled-vocab arrives as a **FROZEN CACHED PREFIX**, never as a pasted wordlist in the active turn. The template's Inputs section names: `lessonTarget` (the cumulative set lives in the cached system prefix), `newVocab` + `newGrammar` (the few items the reading must feature, named explicitly — these are allowed in-prompt because they are the assignment, not the wall), `format` (`story|dialogue|explainer`), `band` (A1–B1), `topic` (lesson-appropriate), `lengthTarget` (the lesson's 課文 char count).
- A **STYLE-CARD** register-discipline block: Traditional + Taiwan lexis only; natural prose to the register; no snippets; show-don't-tell; the six banned moves from the dictionary entry standard (no instruction verbs, no mood labels, no paraphrase-of-the-visible) carried over where they apply to graded prose.
- Output = a draft reading (plain Traditional prose, the new items woven in), NOT yet `prepared.json` — segmentation + glossary + rails are baked downstream (Sub-task E) so the model writes naturally and the harness owns structure.
- **NEVER instruct the model to "use only these words."** State the topic, register, format, length, and the few new target items; the gate enforces the controlled vocabulary after the fact.

The actual style-card prose is written by Claude/loom in a follow-up; Composer scaffolds the file with clearly-marked `<!-- CLAUDE/LOOM: style-card prose here -->` blocks and the mechanical Inputs/Output contract filled in.

---

## Sub-task D — generate→critique→repair on the Batches API

### Deliverable
`scripts/gen/reading-pipeline.ts` (new CLI subcommand, registered in the Core repo's gen entrypoint, mirroring `scripts/gen/cli.ts` command style). Drives the loop per the PRD §6.2 stages.

**Model + API contract (this is the deliberate product strategy — the product's content calls DO use Opus/Batches; this is NOT Composer's own tooling spend, see Out of scope):**
- **Batches API, 50% price.** Submit a batch of reading specs; each request carries a `custom_id` (the spec's stable id). Results return **unordered** — key strictly by `custom_id`, never positional.
- **Generate:** Opus 4.8 (the latest Opus 4.x; resolve the exact model id at build time via the `claude-api` reference, do not hardcode a stale id). **Sonnet 4.6 acceptable for low-band (A1–A2) generate.** Controlled-vocab cumulative set goes in the **cached prefix** (`cache_control` on the system block) so it is the frozen cached prefix, not re-billed per spec.
- **Critique:** **fresh-context Opus 4.8** (no generation memory — a separate request, not a continuation). Critic checks: grammar conformance to `newGrammar`, naturalness, Traditional-clean, and **facts (mandatory on `explainer` format)**.
- **Repair loop:** generate → mechanical gate (§E stage) → critic → repair. **Max 2 repairs, then skip-and-log.** A thin reading never ships; log the skip with the failing violations to `out/reading-skips.jsonl`.

**Mechanics:**
- A **claim-based idempotent spec queue** (the loom method): `out/reading-queue.json` of specs, each claimed atomically (CAS write, retry-on-lock), on-disk overlap check before claiming, **scoped commits — NEVER `git add -A`** (commit only the specific emitted files via explicit pathspec).
- Poll the batch; on completion, route each `custom_id` result through stages 3–7.
- **Concurrency law (measured, §6.6):** ~5 lanes ceiling; do not exceed. Make lane count a flag defaulting to 5.
- Read the API key from env (`ANTHROPIC_API_KEY`); the harness has no key baked in (matches the existing `scripts/gen` "no API in core" posture — the Batches client is the one deliberate exception, env-gated).

### Acceptance (Sub-task D)
- vitest green for the loop logic with the Batches client mocked: a planted critic-fail spec repairs twice then lands in `reading-skips.jsonl`; results are reassembled correctly when the mock returns them **out of `custom_id` order**.
- The cumulative vocab is sent once in a cached system block (assert the request shape: `cache_control` present; cumulative set NOT in the user turn).
- Lane default = 5; a `--lanes 9` run is allowed but the test asserts the default and the cap behavior.
- Skip-and-log fires at exactly repair #3; no reading with open violations is ever emitted.

---

## Sub-task E — Dual-rail population + the cognate-bridge gate

### Deliverable
`scripts/gen/lib/dualRail.ts` — turns an accepted draft reading into `prepared.json` (`PREPARED_CONTENT_SCHEMA_V2` = `"tsumugu/prepared-content@2"`, from `@tsumugu/engine` `types.ts`) with **both rails baked at generation time** (§6.5). A reading without a verified VI rail does not ship.

**The contract to honor (engine, do not redefine):** `PreparedContent = { schema, lang, tokens:[{text,isWord}], glossary:{ word -> PrebakedEntry } }`. Core extends it only with the vocab/grammar **fingerprint** + ACCC **binding facet** metadata (PRD §8.2) — add these as top-level optional fields, do not mutate the engine schema.

Population:
- **Segment** the draft via the owned jieba-wasm pack (the `packs/*` port).
- **EN rail:** pinyin ruby + English gloss, pre-resolved into each `glossary[word]` (instant offline hover).
- **VI rail — Hán-Việt:** populate from `/Users/n1/Projects/tsumugu-ed/sources/hanviet/hanviet.json` lookup. **94.2% single-reading deterministic** — that path ships. The `bridge/registry.ts` (`BridgeRegistry`, `BRIDGE_SCHEMA = "tsumugu/bridge@1"`) + gen `scripts/gen/lib/bridge.ts` (`cacheBridges`, `crossSeedFromRegistry`, `bridgeSkeleton`) carry the registry plumbing — reuse, do not rebuild.
- **Cognate bridge:** asserted on the VI rail and **verified against `char_vi`** (`/Users/n1/Projects/tsumugu-ed/sources/hanviet/char_vi.txt`). **A bridge asserting a cognate NOT present in `char_vi` FAILS the gate** — fail-closed, no ungrounded assertions ship.
- **Polyphone safety:** the ~5.8% polyphone path is the open risk. **g2pW is NOT integrated — label it "candidate / to-integrate" in every comment/output.** Where a char has multiple Hán-Việt readings, flag it (`hvAmbiguous: true`) rather than silently picking — the known `byReading` silent-drop gotcha must surface, not ship. Emit these to `out/polyphone-candidates.jsonl` for the measured-accuracy task (Sub-task F).

### Acceptance (Sub-task E)
- Emitting a draft yields a valid `PREPARED_CONTENT_SCHEMA_V2` file (engine schema validator green) with non-empty EN and VI glossary entries for every unknown word.
- A planted bridge asserting a cognate absent from `char_vi` makes the gate **fail** (return non-zero / violation), not warn.
- A polyphone char surfaces in `polyphone-candidates.jsonl` and is flagged `hvAmbiguous`, never silently resolved.
- Fingerprint + ACCC binding facet present on output (e.g. `binding: "ACCC b4l03"`, `fingerprint: { vocab:[...], grammar:[...] }`).

---

## Sub-task F — g2pW measured-accuracy task (eval only, no integration in v1)

### Deliverable
`scripts/accc/eval-g2pw-polyphones.ts` (+ `out/g2pw-eval-report.md`) — measure, do not integrate. Take the polyphone chars actually present across the generated/queued readings (from `polyphone-candidates.jsonl`), and report what fraction the deterministic single-reading lookup gets right vs. the open ambiguous set, against the actual char set. This is the evidence base that turns "candidate / to-integrate" into a decision later. **Do not wire g2pW into the pipeline in v1** — output a measured number and a recommendation only.

### Acceptance (Sub-task F)
- Report states a measured polyphone-resolution accuracy on the real char set with a denominator, plus the ambiguous residual; does not modify the generation path.

---

## Global acceptance criteria
- `vitest run` green across all new TS; the existing engine/gen tests still pass after the package extraction.
- A full smoke run (one A2 spec, Batches client mocked) produces a gated `prepared.json` with both rails baked, passes `runReadingChecks` (WO-CORE-1), and renders in the reused reader with an empty WordStore (no learner state required).
- **Gate fails a planted above-band token** (a B2 word in an A2 reading with no decomposition credit) via `checkDefLevel` (`@tsumugu/engine` gen lib `defLevel.ts`) — assert the violation surfaces.
- **Gate fails an ungrounded cognate bridge** (Sub-task E acceptance).
- No reading with open violations is ever emitted; every skip is logged with its violations.
- All ACCC functional-fact files (`*.FINAL.json`, lesson targets, polyphone logs) stay under `private/` / `out/` and are gitignored — never republished.

## Out of scope / do NOT
- **Do NOT fork the `tsumugu` monorepo.** Depend on the extracted `@tsumugu/engine` package (WO-CORE-0). Do not import from `/Users/n1/Projects/tsumugu/packages/engine/src/...` in shipped code.
- **Do NOT inject the controlled wordlist into the active generation prompt.** Cumulative vocab is the frozen cached prefix; the gate enforces it after the fact.
- **Do NOT integrate g2pW** — measure only; label everywhere "candidate / to-integrate."
- **Do NOT build:** accounts/sync/payments; the live lesson-picker / on-demand binder (bindings ship as static metadata only); news content; recaps/synopses; the reader shell, catalog, BYO importer, hosting (those are WO-CORE-5/6/7); the voice/transcript/synced-video subsystem; `host/fsVault.ts`; Anki export from default chrome; `scripts/publish-public-vault.ts`; the `#/encoding` route. (PRD §8.4 leave-behind.)
- **Do NOT republish** any ACCC functional-fact index, the dangdai vocab list, `char_vi`, or `chinese-hanviet-cognates.tsv`. They are build-time-only, gitignored (§9). The cognate bridge **displays** in v1 but is not yet a paid/marketed claim — license confirmations on `char_vi` (share-alike) and `chinese-hanviet-cognates.tsv` (unlicensed/build-time-only) are owed first (Open questions).
- **Composer's own codegen uses Composer's subscription model — no metered/pay-per-token APIs for the tooling.** The Opus 4.8 + Batches calls in Sub-task D are the *product's content pipeline* (a deliberate strategy), not Composer's tooling spend; keep them env-gated behind `ANTHROPIC_API_KEY` and out of any default `vitest`/`build` path.

## Open questions for Wedge / Claude (real blockers)
1. **Gate thresholds (Claude owns, Wedge adjudicates before first wave):** the in-band coverage floor, allowed new-target count per band, and length-spread minima for prose `reading_checks.py`. WO-CORE-1 sets these; this WO consumes them.
2. **Domain ORIGIN:** PRD recommends `tsumugu.cc` (placeholder);  Affects nothing structural here — used only in emitted metadata/links.
3. **Sub-task A adjudication:** the merged index's `review` points (lesson-assignment conflicts) need Claude's call against the highlights markdown before `FINAL.json` is authoritative. This is the hard gate before any textbook-bound generation wave.
4. **License confirmations** on `char_vi` and `chinese-hanviet-cognates.tsv` before the bridge becomes a Pro/marketing claim (build-time display is fine for v1).
