import { LESSONS, REPO, RULES } from "./author-companion-b2b3.part2.js";

const SPEC_CMD = (u) => `python3 ${REPO}/mockups/print_lesson_spec.py ${u}`

const CHECK_CMD = (u, floor) => `python3 ${REPO}/mockups/check_candidate.py ${u} ${REPO}/mockups/drafts/${u}.json --min ${floor}`

const AUTHOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['unit', 'pass', 'sizes', 'formats', 'vocab_missing', 'grammar_missing', 'notes'],
  properties: {
    unit: { type: 'string' },
    pass: { type: 'boolean', description: 'true iff check_candidate printed RESULT: PASS on the final draft' },
    sizes: { type: 'array', items: { type: 'integer' }, description: 'the 3 per-article Han sizes from the checker' },
    formats: { type: 'array', items: { type: 'string' }, description: 'the 3 formats used' },
    vocab_missing: { type: 'array', items: { type: 'string' }, description: 'own-vocab words deferred (<=3)' },
    grammar_missing: { type: 'array', items: { type: 'string' }, description: 'grammar points still missing (must be empty)' },
    notes: { type: 'string', description: 'one or two sentences on the 3 scenes + any deferral rationale' },
  },
}

const CRITIC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['unit', 'verdict', 'gate_pass', 'copyright_ok', 'bare_vocab_ok', 'distinct_scenes', 'naturalness', 'issues'],
  properties: {
    unit: { type: 'string' },
    verdict: { type: 'string', enum: ['pass', 'revise'] },
    gate_pass: { type: 'boolean' },
    copyright_ok: { type: 'boolean', description: 'no textbook cast / no copied textbook scene' },
    bare_vocab_ok: { type: 'boolean', description: 'no pinyin/English/annotations leaked into the article text' },
    distinct_scenes: { type: 'boolean', description: '3 distinct formats AND 3 distinct situations, no verbatim cross-article reuse' },
    naturalness: { type: 'string', enum: ['good', 'ok', 'poor'] },
    issues: { type: 'array', items: { type: 'string' }, description: 'specific, actionable defects; empty if verdict==pass' },
  },
}

function authorPrompt(item) {
  const { unit, floor, mode } = item
  const repairLine = mode === 'repair'
    ? `\nMODE = REPAIR. A draft already exists at ${REPO}/mockups/drafts/${unit}.json that PASSES coverage but has article(s) UNDER the ${floor}-Han floor. READ it first. Keep what works; LENGTHEN the under-floor article(s) with natural added content (more turns, a richer sub-scene, more concrete detail) WITHOUT breaking coverage and WITHOUT padding/repetition. Re-check until every article >= ${floor}.\n`
    : `\nMODE = NEW. No draft exists yet. Author all 3 articles from scratch.\n`
  return `You are authoring one ACCC companion reading lesson for Tsumugu Core. Work in Traditional Chinese (zh-Hant).
${RULES}
YOUR LESSON: ${unit}   PER-ARTICLE FLOOR: ${floor} Han.
${repairLine}
STEP 1 — Read the spec (vocab + grammar + objectives + any carryover pool):
  ${SPEC_CMD(unit)}
${mode === 'repair' ? `STEP 1b — Read the existing draft: ${REPO}/mockups/drafts/${unit}.json\n` : ''}
STEP 2 — Author/repair the 3 articles per ALL the rules above. Shape the scenes toward the lesson's objectives. Every grammar point MUST appear in the union (100%). Cover the vocab (defer <=3 awkward words max).

STEP 3 — Write the draft to ${REPO}/mockups/drafts/${unit}.json (exact shape above).

STEP 4 — Run the gate and ITERATE until it prints "RESULT: PASS":
  ${CHECK_CMD(unit, floor)}
If it fails: read WHICH check failed (UNDER floor → lengthen that article; MISSING grammar → add that construction; MISSING vocab over budget → cover more words; JSON error → fix the JSON) and revise the file, then re-run. Do not stop until RESULT: PASS (or you have genuinely exhausted reasonable natural options — then report pass:false with the specific blocker).

Return the structured result. grammar_missing MUST be empty for a real pass.`
}

function criticPrompt(unit, floor) {
  return `You are a fresh-context critic for one Tsumugu Core companion lesson. Independently judge quality — do NOT trust the author.

LESSON: ${unit}  (floor ${floor} Han)

STEP 1 — Read the lesson spec (so you know the target vocab/grammar/objectives):
  ${SPEC_CMD(unit)}
STEP 2 — Read the staged draft:
  ${REPO}/mockups/drafts/${unit}.json
STEP 3 — Re-run the gate yourself (don't trust a claimed pass):
  ${CHECK_CMD(unit, floor)}

Now judge, reading the ACTUAL article text:
- gate_pass: did check_candidate print RESULT: PASS?
- copyright_ok: speakers are generic 甲乙丙丁 / invented surnames; NO textbook cast (王開文/陳月美/李明華); no retold textbook scene.
- bare_vocab_ok: the "text" fields contain ONLY Chinese characters + Chinese punctuation. FAIL if you find pinyin, English, POS tags, or parenthetical glosses copied into the text.
- distinct_scenes: 3 DISTINCT formats AND 3 DISTINCT situations (not same-event-retold / diary-of-the-dialogue / sequel); no long verbatim phrase repeated across articles.
- naturalness: 'good' = reads like real Taiwanese Mandarin; 'ok' = some stiffness or mild padding; 'poor' = contorted to hit vocab, or heavy padding/repetition.

verdict = 'revise' if ANY of {gate_pass, copyright_ok, bare_vocab_ok, distinct_scenes} is false OR naturalness is 'poor'. Otherwise 'pass'. List specific, actionable issues (which article, what's wrong, what to do). Empty issues iff verdict=='pass'.`
}

function repairPrompt(unit, floor, issues) {
  return `You are repairing one Tsumugu Core companion lesson that a critic flagged. Fix ONLY the flagged problems; preserve what works.

LESSON: ${unit}  (floor ${floor} Han)
DRAFT: ${REPO}/mockups/drafts/${unit}.json

CRITIC ISSUES TO FIX:
${issues.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

${RULES}

STEP 1 — Read the spec: ${SPEC_CMD(unit)}
STEP 2 — Read the current draft, then edit ${REPO}/mockups/drafts/${unit}.json to resolve every issue above WITHOUT regressing coverage or floor.
STEP 3 — Re-run the gate until RESULT: PASS:
  ${CHECK_CMD(unit, floor)}
Return the structured author-style result for the repaired draft. grammar_missing MUST be empty.`
}

phase('Author')

log(`Authoring ${LESSONS.length} lessons on Sonnet 5 (B2 ×7 @450, B3 ×12 @750) — author → critic → conditional repair`)

const results = await pipeline(
  LESSONS,
  (item) => agent(authorPrompt(item), {
    label: `author:${item.unit}`,
    phase: 'Author',
    schema: AUTHOR_SCHEMA,
    model: 'sonnet',
    effort: 'high',
  }),
  (authorRes, item) => agent(criticPrompt(item.unit, item.floor), {
    label: `critic:${item.unit}`,
    phase: 'Critic',
    schema: CRITIC_SCHEMA,
    model: 'sonnet',
    effort: 'high',
  }).then((critic) => ({ item, authorRes, critic })),
  async (prev) => {
    const { item, authorRes, critic } = prev || {}
    if (!critic) return { item, authorRes, critic, repaired: null }
    if (critic.verdict === 'pass') return { item, authorRes, critic, repaired: null }
    const repaired = await agent(repairPrompt(item.unit, item.floor, critic.issues || []), {
      label: `repair:${item.unit}`,
      phase: 'Repair',
      schema: AUTHOR_SCHEMA,
      model: 'sonnet',
      effort: 'high',
    })
    return { item, authorRes, critic, repaired }
  },
)

const summary = results.filter(Boolean).map((r) => {
  const finalPass = r.repaired ? r.repaired.pass : (r.authorRes ? r.authorRes.pass : false)
  return {
    unit: r.item ? r.item.unit : '?',
    floor: r.item ? r.item.floor : null,
    finalPass,
    criticVerdict: r.critic ? r.critic.verdict : 'no-critic',
    naturalness: r.critic ? r.critic.naturalness : '?',
    repaired: !!r.repaired,
    sizes: (r.repaired && r.repaired.sizes) || (r.authorRes && r.authorRes.sizes) || [],
    issues: r.critic && r.critic.verdict === 'revise' ? (r.critic.issues || []) : [],
  }
})

log(`Author phase done — ${summary.filter((s) => s.finalPass).length}/${summary.length} pass the gate; ${summary.filter((s) => s.repaired).length} needed repair`)

phase('SweepCritic')

const SWEEP = [
  { unit: 'B2L05', floor: 450 }, { unit: 'B2L07', floor: 450 },
  { unit: 'B2L09', floor: 450 }, { unit: 'B2L11', floor: 450 },
  { unit: 'B2L12', floor: 450 },
]

const sweep = await pipeline(
  SWEEP,
  (item) => agent(criticPrompt(item.unit, item.floor), {
    label: `sweep-critic:${item.unit}`, phase: 'SweepCritic', schema: CRITIC_SCHEMA, model: 'sonnet', effort: 'high',
  }).then((critic) => ({ item, critic })),
  async (prev) => {
    const { item, critic } = prev || {}
    if (!critic || critic.verdict === 'pass') return { item, critic, repaired: null }
    const repaired = await agent(repairPrompt(item.unit, item.floor, critic.issues || []), {
      label: `sweep-repair:${item.unit}`, phase: 'SweepCritic', schema: AUTHOR_SCHEMA, model: 'sonnet', effort: 'high',
    })
    return { item, critic, repaired }
  },
)

const sweepSummary = sweep.filter(Boolean).map((r) => ({
  unit: r.item ? r.item.unit : '?',
  criticVerdict: r.critic ? r.critic.verdict : 'no-critic',
  naturalness: r.critic ? r.critic.naturalness : '?',
  repaired: !!r.repaired,
  issues: r.critic && r.critic.verdict === 'revise' ? (r.critic.issues || []) : [],
}))

log(`DONE — main ${summary.filter((s) => s.finalPass).length}/${summary.length} gate-pass; sweep ${sweepSummary.filter((s) => s.criticVerdict === 'pass' || s.repaired).length}/${sweepSummary.length} ok`)

return { authored: summary, sweep: sweepSummary }
