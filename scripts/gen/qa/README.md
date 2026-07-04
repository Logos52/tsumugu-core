# Reading QA checker (`check_reading.py`)

Mechanical self-QA for Tsumugu Core graded readings. Standalone, stdlib-only
Python — no jieba, no build step. It segments each reading by **greedy
longest-match against the lesson's own known vocabulary** (cumulative through the
target atomic unit), so in-band checking is exact and an agent (Composer / Opus /
Grok) can run it to check its own output before handing readings to the maker.

## Run

```bash
# one unit
python3 check_reading.py --set pilot/b1l02-1.json

# with prior units, so the encounter ledger accumulates lifetime touches
python3 check_reading.py --set pilot/b1l02-1.json \
        --history pilot/b1l01-1.json pilot/b1l01-2.json

# machine-readable (for an agent to parse and self-repair)
python3 check_reading.py --set pilot/b1l02-1.json --json
```

Vocab source defaults to `../../../private/dangdai-vocab/dangdai.csv`; override
with `--csv`. Exit code is `1` on any **hard fail**, else `0`.

## Input format (`set.json`)

```json
{
  "unit": "b1l02-1",
  "grammar": ["的", "有", "都", "張", "A-not-A"],
  "readings": [
    { "id": "R1", "format": "對話", "text": "王開文：你好…" }
  ]
}
```

`unit` is the atomic half-lesson id (`b{book}l{lesson:02d}-{1|2}`); the textbook's
Part I → `-1`, Part II → `-2`. Speaker labels (`王開文：`, `A:`) are stripped as
structural metadata. `A-not-A` in `grammar` is detected via the `V不V` regex.

## What it checks

**Hard (fails the run):**
- **In-band coverage** — every content token is in cumulative ∪ current-new. Any
  out-of-band character is a leak.
- **Current-new union** — every new *content* item of the unit appears in ≥1
  reading. Proper nouns are exempt (met via speaker labels). A bound morpheme is
  credited when met inside a known compound (`哪` via `哪國`) — decomposition credit.

**Advisory (reported, never fails — naturalness wins):**
- **Set recycle** — each current content word met ≥ `recycle_min` times across the
  *set* (the doc's "set-level recycling"). `recycle_min` = 2 if the unit has <30
  new items, else 3.
- **Multiplicity** — each current content word appears in ≥2 readings.
- **Regression** — content-token proportion by age: current ≥40%, L-1 ≥20%,
  L-2 ≥10%, L-3 ≥5%… (geometric, decay 0.5). Under-met on a topic jump is normal.
- **Encounter ledger** — lifetime touches per content word across `--history` +
  this set, flagged below the floor (8). Proper nouns exempt. **Rare words are
  allowed below the floor** when forcing them would hurt the prose. The floor is a
  *lifetime* target across the review window: a word introduced recently is still
  accruing touches from future lessons' review buckets, so a long below-floor list
  on the first few units is expected, not a problem.
- **Light naturalness** — sentence count, distinct sentence-opener ratio,
  single-word repetition share.

## Tuning knobs (top of `check_reading.py`)

`P_CURRENT`, `DECAY`, `MAX_REGRESSION_DEPTH`, `ENCOUNTER_FLOOR`,
`RECYCLE_SIZE_CUTOFF`, `RECYCLE_SMALL/LARGE`, `MULTIPLICITY_MIN`, and **`STOPWORDS`**
— the function-word substrate excluded from the regression denominator and the
repetition check. `STOPWORDS` is a deliberate judgment call (e.g. `是`/`有` are
taught words but behave as substrate); review it and edit to taste.

## Relationship to the TS gate

This mirrors part of `packages/content-pipeline/src/readingChecks.ts` but adds the
regression-bucket and encounter-ledger logic and runs without a build. Use this for
generation-time self-QA; the TS gate remains the build-time gate. Keep the two in
sync, or port this logic into the TS gate before production volume.
