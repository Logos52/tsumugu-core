# Handoff prompt — Opus / Fable (blog + pipelining copy)

Copy everything below the line into a new session.

---

You are editing **Tsumugu Core** public blog posts and related Chinese-character copy. Wedge moved two KB journal drafts off logos52 onto **tsumugu.cc** and left **inline maintenance notes** inside the source files flagging writing that still needs revision. Read those notes first; they are authoritative.

## Where the blog posts live now

**Canonical home (publish from here):**

```
/Users/n1/Projects/tsumugu-core/content/blog/posts/
├── rebuilding-dun.md
└── word-first-character-later.md
```

**Build pipeline:**

- `scripts/build-blog.ts` reads `content/blog/posts/*.md` and emits static HTML to `app/public/blog/`.
- Sections titled `## Maintenance` (and everything after) are **stripped** before publish — editor notes only.
- `pnpm build:blog` or `pnpm dev` / `pnpm build` runs the generator.
- Live URLs (after deploy): `https://tsumugu.cc/blog/rebuilding-dun/` and `https://tsumugu.cc/blog/word-first-character-later/`.

**Do not** treat the logos52 journal as the publish surface for these two pieces.

| Post | Removed from KB? | KB remnant |
|------|------------------|------------|
| Rebuilding 頓 | Yes — `journal/2026-07-02-rebuilding-a-forgotten-character.md` deleted | — |
| The Word First, the Character Later | No — still draft | `llm-knowledge-base/journal/2026-07-02-the-word-first-the-character-later.md` |

## Wedge's inline notes (read before editing prose)

Wedge added maintenance notes **inside the files** asking for copy fixes. These are not suggestions; they gate "finished" public copy.

### 1. Laundry / washing-machine analogy — replace everywhere

**Flagged in:**

- `tsumugu-core/content/blog/posts/word-first-character-later.md` → `## Maintenance — not published` (overlap paragraph: "the same trick as laundry…")
- `llm-knowledge-base/journal/2026-07-02-the-word-first-the-character-later.md` → `## Maintenance — next pass` (same)
- `llm-knowledge-base/wiki/Language/Chinese/The Pipelining Strategy.md` → `## Maintenance — next compile pass` (full spec: paras + §Overlap, "slow-laundry mistake", etc.)

**Task:** Keep the mechanism (staggered sessions, overlapping cohorts, constant throughput vs sequential batching). Drop Outlier's domestic-appliance frame. After rewrite, grep `laundry`, `wash`, `dry`, `load` — none should remain in public prose.

**Sweep together:** wiki Pipelining page, `Chinese Characters, Condensed`, `Learning, Condensed`, and both blog `.md` sources.

### 2. Pipelining wiki — broader compile pass (same maintenance block)

On `The Pipelining Strategy.md`, Wedge also asked for:

- Demote Outlier in the prose (sources belong in `## Sources` only).
- Raise `source-count` to **at least 3** independent sources (school bar); hunt `raw/Source Index.md`, ICS/SRS/Anki corroboration.
- Align dependent pages after the rewrite.

### 3. `rebuilding-dun.md`

No maintenance section yet — Wedge called the prose **good as-is**. Do not rewrite unless a factual error surfaces. Optional: add dictionary links to `/c/{char}.html` on tsumugu.cc if useful.

## Writing standards (bind before you touch prose)

| Surface | Authority |
|---------|-----------|
| tsumugu.cc blog + site copy | `tsumugu-core/Writing-Standards.md` (pointer) → canonical `llm-knowledge-base/02 - System/Writing Standards.md` — **Blog Posts Are Working Notes Made Legible** section (locked 2026-07-02, exemplar: Rebuilding 頓) |
| Wiki pages | High-Signal Wiki Pages + same file |
| Dictionary entries | `tsumugu/PRD-Entry-Authoring.md` §0.5–0.6 |

Blog register in short: agentless notebook cleaned up for strangers — no lecturing, no imperatives, no rhetorical questions; sparse second-person only for shared-experience recognition; no em dashes on front-facing surfaces.

## Suggested work order

1. Read all `## Maintenance` blocks listed above.
2. Draft a replacement for the laundry overlap image (one paragraph + wiki §Overlap) and get the mechanism right without a borrowed metaphor.
3. Apply the same fix to `word-first-character-later.md` body; remove or update its `## Maintenance` section when done.
4. Run the pipelining wiki compile pass (sources, demote Outlier, sweep condensed pages).
5. `pnpm build:blog` and spot-check `app/public/blog/*/index.html`.
6. Optionally sync the KB journal draft if it should mirror tsumugu source (it can stay `draft: true` on logos52).

## Success criteria

- [ ] Zero `laundry` / `wash` / `dry` / `load` in published blog HTML and updated wiki pipelining prose.
- [ ] `The Pipelining Strategy.md` has `source-count` ≥ 3 or an explicit Open Question explaining the gap.
- [ ] Blog posts still pass the locked blog register (Rebuilding 頓 remains the tone reference).
- [ ] `pnpm build:blog` succeeds; both posts appear on `/blog/`.

Ask Wedge before adding a Blog link to the SPA nav — not done yet.