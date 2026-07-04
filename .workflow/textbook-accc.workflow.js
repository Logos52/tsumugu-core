export const meta = {
  name: 'tsumugu-textbook-accc',
  description: 'Answer "can we generate readings matched to a learner\'s level in A Course in Contemporary Chinese?": ground the ACCC facts + sourcing + copyright, then demo readings matched to ACCC Book 1/2/3 levels. Options + demos to react to, not a plan.',
  phases: [
    { title: 'Ground', detail: 'ACCC series structure, vocab-list sourcing, TOCFL alignment, copyright stance (web)' },
    { title: 'Demo', detail: '3 level-matched demo readings (Book 1/2/3) + a how-it-works feasibility note' },
  ],
}

const ROOT = '/Users/n1/Projects/tsumugu-core/docs'
const SA = ROOT + '/super-app'
const TC = SA + '/textbook-companion'

const G = [
  '# Tsumugu super-app — "textbook companion" feasibility (ACCC), 2026-06-22',
  '',
  'WHY THIS RUN: Wedge studied at a Taiwan school using the textbook "A Course in Contemporary Chinese" (當代中文課程, MTC / NTNU / Linking Publishing). He asked: can we use its vocab lists to generate readings matched to where a learner is in that course? This run answers that with grounded facts + actual demo readings. Everything here is OPTIONS / illustrative DEMOS for Wedge to react to — NOT a plan, NOT adopted, no MUSTs.',
  '',
  'THE PRODUCT: "the Chinese-learning app Wedge wished he had learning Traditional Chinese in Taiwan." Traditional (繁體, Taiwan usage) is the default; zhuyin + pinyin + EN/VN gloss already exist. ACCC is itself a Traditional + zhuyin Taiwan textbook, so it fits the defaults exactly.',
  '',
  'THE MECHANISM (already-built machinery, repointed): a per-lesson CUMULATIVE vocab list becomes a CONTROLLED VOCABULARY. The generator writes using only words taught up to the learner\'s lesson + a few new target words; the CI scorer (packages/engine/src/ci/scorer.ts) verifies the reading stays in-band against that list; the example-sentence QA gate discipline (tsumugu-ed/scripts/example_checks.py) catches unnatural/level-violating output. This is the same flow that levels content to TOCFL bands, pointed at ACCC\'s progression.',
  '',
  'COPYRIGHT STANCE (state it, do not overclaim): individual words are facts; "the vocabulary taught through Lesson X" is a functional level-target, not ACCC\'s copyrightable expression. We constrain generation to the word SET; we never reproduce ACCC\'s own 課文 texts/exercises and never republish their list as a product (thin compilation-copyright caution). Same idea/fact-vs-expression line as the recaps work (recaps-synopses-feasibility.md).',
  '',
  'VOICE: declarative, measured, no "not X but Y" tic. Private working repo — keep figures. Mark approximations and uncertain facts honestly; never fabricate ACCC specifics.',
  '',
  'SOURCE: existing docs in /Users/n1/Projects/tsumugu-core/docs/ (esp. content-generation.md, super-app/traditional-taiwan-learner-gap.md, super-app/content-samples/) ; engine /Users/n1/Projects/tsumugu/ ; dictionary /Users/n1/Projects/tsumugu-ed/ .',
].join('\n')

// ---------- PHASE 1: GROUND ----------
phase('Ground')
const accResearchPrompt = G + '\n\nTASK: Ground the facts about "A Course in Contemporary Chinese" (當代中文課程). Use WebSearch/WebFetch; mark anything uncertain. Cover: the series structure (how many books/volumes, lessons per book, roughly how many vocab items per lesson and cumulatively per book); the publisher/origin (NTNU Mandarin Training Center / 聯經 Linking Publishing) and that it is a TAIWAN textbook using TRADITIONAL characters + zhuyin (注音) and pinyin; the level alignment of each book to TOCFL and CEFR (e.g. Book 1 ~ Novice/A1-A2, up through Books 5-6 ~ B2-C1); how the vocabulary is presented in each lesson (生詞 lists, 課文 texts); and the SOURCING options for the vocab lists with their tradeoffs and legality — the books themselves, the official publisher/MTC materials, community decks (Anki / Quizlet / Pleco flashcard sets for 當代中文課程), any open datasets, and OCR of the vocab pages. Restate the COPYRIGHT stance for using the lists as a controlled-vocabulary level-target (facts vs expression; never reproduce their texts; thin compilation caution). WRITE to ' + TC + '/accc-research.md (H1 + "Status: grounding — facts to react to, 2026-06-22"). Return a 5-bullet summary incl. book count, the per-book TOCFL mapping, and the best sourcing option. Do not return the full document.'
await agent(accResearchPrompt, { phase: 'Ground', label: 'accc-research', agentType: 'claude' })

// ---------- PHASE 2: DEMO + FEASIBILITY ----------
phase('Demo')

function demoFmt() {
  return ' First READ ' + TC + '/accc-research.md to use accurate ACCC level/vocab facts. Write an ORIGINAL short reading whose vocabulary stays within roughly that ACCC book\'s cumulative word base, plus only a few (2-4) new target words flagged explicitly. TRADITIONAL characters only, Taiwan register/lexis. Format the file: H1 title + the line "Status: ILLUSTRATIVE, LEVEL-APPROXIMATED DEMO — react to it; the real version ingests the actual ACCC list and verifies with the CI scorer, 2026-06-22". Then: (1) the reading as a NUMBERED list of sentences; (2) under each, a pinyin line, a zhuyin (注音) line, and a one-line EN gloss; (3) an "Assumed vocabulary band" note naming the approximated ACCC book + its TOCFL/CEFR level; (4) a "New target words (above the assumed band)" short list; (5) one line on what the reading is. Keep it genuinely at level — short, controlled sentences for low books. Return a 2-line summary. Do not return the full document.'
}

const demos = [
  { label: 'demo:book1', file: TC + '/demo-book1.md',
    body: 'Generate a demo reading at the level of ACCC BOOK 1 (early/beginner, ~TOCFL Novice / A1). Use only very basic, high-frequency vocabulary a Book-1 learner would have (greetings, 我/你/他, 是/有/在, family, numbers, 喝/吃, 老師/學生, 咖啡/茶, 很/也/都, 嗎/呢/的). Topic: a simple self-introduction or a tiny daily-routine paragraph. Very short sentences, one idea each.' + demoFmt() },
  { label: 'demo:book2', file: TC + '/demo-book2.md',
    body: 'Generate a demo reading at the level of ACCC BOOK 2 (~TOCFL 2 / A2). A short slice-of-life paragraph or a 4-6 line dialogue (e.g. making weekend plans, or ordering food), using Book-1-through-2 vocabulary plus a few new target words.' + demoFmt() },
  { label: 'demo:book3', file: TC + '/demo-book3.md',
    body: 'Generate a demo reading at the level of ACCC BOOK 3 (~TOCFL 3 / B1). A short everyday narrative or light opinion piece in a natural Taiwan register (it can lean slightly toward the Dcard/everyday voice Wedge liked), using cumulative Book-1-through-3 vocabulary plus a few new target words.' + demoFmt() },
]

const feasibilityPrompt = G + '\n\nFirst READ ' + TC + '/accc-research.md and ' + ROOT + '/content-generation.md. TASK: write the HOW-IT-WORKS / feasibility note answering Wedge\'s question "can we generate readings matched to a learner\'s level in ACCC?" — verdict-first YES, then the mechanism and the options.\n\nCover: (1) the end-to-end mechanism (ingest the cumulative per-lesson vocab list -> controlled-vocabulary generation constrained to "words through Lesson X" + N new target words -> CI-scorer verification against the list -> QA gate), and which EXISTING pieces it reuses (the TOCFL band machinery, packages/engine/src/ci/scorer.ts, the example_checks.py discipline, the data-* reading toggle for zhuyin which ACCC uses). (2) The SOURCING options for the actual ACCC lists, easiest-and-safest first, each with its catch (community decks vs official vs OCR). (3) The COPYRIGHT stance restated plainly (controlled-vocab level-target = facts; never reproduce ACCC texts; never republish the list). (4) The learner UX (pick "ACCC, Book 2, up to Lesson 8" -> get readings at exactly that band; or generalize to "any textbook / any word list / just a TOCFL level" — the one adaptive mechanism, three front doors). (5) Honest limits (we need the real list ingested for true fidelity; polyphone/Traditional edge cases; the QA gate is the cost). Frame as feasibility + options, NOT a plan or a commitment. WRITE to ' + TC + '/feasibility.md (H1 + "Status: feasibility + options to react to — not a plan, 2026-06-22"). Return a 5-bullet summary incl. the verdict and the recommended first sourcing option. Do not return the full document.'

const demoThunks = demos.map(function (d) {
  return function () { return agent(G + '\n\nTASK (' + d.label + '): ' + d.body + ' WRITE the file to ' + d.file + '.', { phase: 'Demo', label: d.label, agentType: 'claude' }) }
})
demoThunks.push(function () { return agent(feasibilityPrompt, { phase: 'Demo', label: 'feasibility', agentType: 'claude' }) })

const out = await parallel(demoThunks)
log('Demo phase done: ' + out.filter(Boolean).length + '/' + demoThunks.length + ' artifacts')

return {
  demoSummaries: out.slice(0, demos.length),
  feasibilitySummary: out[demos.length],
}
