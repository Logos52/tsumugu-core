export const meta = {
  name: 'author-companion-b4-1to4',
  description: 'Author ACCC companion readings for Book 4 lessons 1-4 at floor 950 Han, Sonnet 5, self-checked against the coverage+floor gate, critic-verified.',
  phases: [
    { title: 'Author', detail: 'one Sonnet agent per lesson: write 3 articles, self-check the gate, stage draft' },
    { title: 'Critic', detail: 'fresh Sonnet agent: copyright / bare-vocab / distinct-scenes / naturalness / gate re-check' },
    { title: 'Repair', detail: 'fix only lessons the critic flagged, re-check the gate' },
  ],
}

const REPO = '/Users/n1/Projects/tsumugu-core'

// Lessons: B2 repair (existing drafts under floor) + B2 new + all 12 B3.
const LESSONS = [
  { unit: 'B4L01', floor: 950, mode: 'new' },
  { unit: 'B4L02', floor: 950, mode: 'new' },
  { unit: 'B4L03', floor: 950, mode: 'new' },
  { unit: 'B4L04', floor: 950, mode: 'new' },
]

const RULES = `
THE PRODUCT: Tsumugu Core companion readings — original graded Traditional-Chinese (zh-Hant, Taiwan usage) articles that re-teach one ACCC (當代中文課程) textbook lesson. The reader has click-to-reveal dictionary + sentence translation, so a longer, denser article is an EASIER read than the textbook — that is why we run well past textbook length.

HARD RULES (the gate enforces these — your draft must PASS check_candidate.py):
1. EXACTLY 3 articles per lesson.
2. Each article >= the per-book Han floor (see your task). NOTE: the size counter strips a leading speaker label ("甲：…" → only "…" counts), so 對話 needs more lines than narrative to reach the floor. Aim ~10-15% OVER the floor for safety.
3. The UNION of the 3 articles must satisfy 100% of the lesson's GRAMMAR points (NO deferral on grammar) and cover the lesson's VOCAB. Up to 3 genuinely-awkward vocab words MAY be deferred to a later lesson — prefer deferral over padding, but cover the rest.

AUTHORING RULES (quality — the critic enforces these):
4. THREE DISTINCT FORMATS across the 3 articles — pick from 對話 (dialogue) / 自述 (first-person monologue) / 短文 (narrative essay) / 問答 (Q&A or interview) / 日記 (diary) / 便條 (note) / 簡訊 (text messages) / 廣播 (broadcast) / 報導 (news report) / 比較 (comparison piece). Do not use the same format twice.
5. THREE DISTINCT SITUATIONS — three different scenes/topics/casts. NOT the same event retold from another angle, NOT a diary of the dialogue's scene, NOT a sequel. Vary the human situation.
6. NO verbatim cross-article reuse — do not repeat a long phrase/sentence across the 3 articles.
7. BARE VOCAB in the text — Chinese characters and normal Chinese punctuation ONLY. NEVER copy the spec's pinyin, English gloss, POS tags, or any annotation into the article. No Latin letters, no pinyin, no parenthetical glosses.
8. COPYRIGHT — original scenes only. Speakers are generic 甲/乙/丙/丁 or invented surnames (高/林/周/張/陳-as-generic-only-if-needed, and any others you invent). NEVER reuse the textbook's cast 王開文 / 陳月美 / 李明華 or its specific dialogues/scenes. Do not retell a textbook scene.
9. NATURALNESS WINS over the floor. Reach length through richer, real scenes — never padding, filler, or repetition. Modest above-level vocabulary is fine; do not contort sentences to stay perfectly in-band. Write the way a fluent Taiwanese speaker actually writes.

DRAFT FILE SHAPE (write with the Write tool to ${REPO}/mockups/drafts/<UNIT>.json):
{"unit":"<UNIT>","status":"draft","readings":[
  {"id":"R1","format":"對話","text":"甲：…\\n乙：…"},
  {"id":"R2","format":"自述","text":"…"},
  {"id":"R3","format":"問答","text":"…"}
]}
Use literal \\n (JSON-escaped newline) between lines inside "text". The 3 ids are R1/R2/R3.
`

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
log(`Authoring ${LESSONS.length} Book-4 lessons on Sonnet 5 (B4L01-04 @950) — author → critic → conditional repair`)

const results = await pipeline(
  LESSONS,
  // STAGE 1 — author + self-check + stage
  (item) => agent(authorPrompt(item), {
    label: `author:${item.unit}`,
    phase: 'Author',
    schema: AUTHOR_SCHEMA,
    model: 'sonnet',
    effort: 'high',
  }),
  // STAGE 2 — fresh-context critic
  (authorRes, item) => agent(criticPrompt(item.unit, item.floor), {
    label: `critic:${item.unit}`,
    phase: 'Critic',
    schema: CRITIC_SCHEMA,
    model: 'sonnet',
    effort: 'high',
  }).then((critic) => ({ item, authorRes, critic })),
  // STAGE 3 — conditional repair
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

log(`DONE — ${summary.filter((s) => s.finalPass).length}/${summary.length} pass the gate; ${summary.filter((s) => s.repaired).length} needed repair`)
return { authored: summary }
