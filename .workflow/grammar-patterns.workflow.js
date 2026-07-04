export const meta = {
  name: 'tsumugu-grammar-patterns',
  description: 'Grammar-pattern sourcing + targeting for the ACCC textbook companion: sourcing landscape (AllSet/TOCFL/ACCC), how grammar-targeting plugs into generation + verification, and the Dangdai-PDF extraction plan. Options/feasibility to react to, not a plan.',
  phases: [
    { title: 'Grammar', detail: 'sourcing options + targeting/verification model + PDF-extraction plan (web + repo)' },
  ],
}

const ROOT = '/Users/n1/Projects/tsumugu-core/docs'
const TC = ROOT + '/super-app/textbook-companion'

const G = [
  '# Tsumugu super-app — grammar-pattern sourcing + targeting (2026-06-22)',
  '',
  'WHY: the ivankra/dangdai dataset gives ACCC vocab per lesson but NOT grammar patterns. True level-matching needs BOTH — a generated reading should use only grammar the learner has met (through their lesson) plus a few deliberately-featured NEW target patterns, not just stay in-vocab. Wedge will provide the ACCC (當代中文課程) PDFs as the grammar source (dropped at private/dangdai-pdfs/, local + gitignored). This run grounds the sourcing options, models how grammar-targeting plugs into generation + verification, and plans the PDF extraction.',
  '',
  'FRAMING: everything here is OPTIONS / feasibility for Wedge to react to — NOT a plan, NOT adopted, no MUSTs.',
  '',
  'CONTEXT: "the Chinese-learning app Wedge wished he had learning Traditional Chinese in Taiwan." Traditional + zhuyin native. The textbook companion generates readings constrained to a controlled VOCAB set (verified in-band by packages/engine/src/ci/scorer.ts) + N new words; this run adds the GRAMMAR axis. ACCC = 當代中文課程 (6 books, Taiwan / MTC-NTNU, Traditional + zhuyin); each lesson has 生詞 (vocab) + 語法 (grammar points). The existing Book 1/2/3 demos already implicitly used per-book grammar (Book 3: 把 / 比 / 雖然…可是 / 越來越 / V得-complement) — this run makes that axis controllable.',
  '',
  'COPYRIGHT STANCE: which grammar patterns are taught when = a functional level-target (facts/data); grammar patterns themselves (把, 被, 是…的) are language facts, not copyrightable. Extract a per-lesson grammar-point INDEX only. NEVER reproduce ACCC grammar explanations or example sentences as product, NEVER republish the index as a browsable feature, NEVER publish the PDFs (local + gitignored). Same idea/fact-vs-expression line as the vocab lists and the recaps work.',
  '',
  'VERIFICATION REALITY (be honest, do not overclaim): vocab in-band is mechanically checkable (ci/scorer.ts). Grammar conformance is HARDER — some patterns are detectable via heuristics, most need an LLM critic. Do not pretend a clean mechanical grammar scorer exists.',
  '',
  'VOICE: declarative, measured, no "not X but Y" tic. Private repo — keep figures. Web-ground facts (especially the AllSet Grammar Wiki license + structure, and TOCFL grammar references); cite; mark uncertain.',
  '',
  'SOURCE: existing docs /Users/n1/Projects/tsumugu-core/docs/ (content-generation.md ; super-app/textbook-companion/feasibility.md + accc-research.md) ; engine /Users/n1/Projects/tsumugu/ .',
].join('\n')

phase('Grammar')

const sourcingPrompt = G + '\n\nTASK: survey the sources for LEVELED Chinese grammar points and recommend the best combination for a private level-target index + generation guidance (NOT republishing). Web-ground and cite. Cover, each with what-it-gives / leveling scheme / entry structure / LICENSE + what that license actually permits (reference & mapping vs republishing vs derived datasets): (1) ACCC 語法 sections (per-lesson, the authoritative ACCC sequence); (2) the AllSet Learning Chinese Grammar Wiki (coverage, A1-C1 leveling, per-entry structure, and its exact license — confirm whether CC BY-NC-SA or other, and whether a private ID-mapping is permitted vs a published derived list); (3) TOCFL grammar references / official Taiwan grammar-point lists; (4) HSK grammar-point compilations; (5) any other graded grammar inventories worth knowing. Recommend a combination (likely: ACCC PDF sequence as the spine + AllSet/TOCFL as the canonical structured taxonomy to map onto). WRITE to ' + TC + '/grammar-sourcing-options.md (H1 + "Status: sourcing options to react to — not a plan, 2026-06-22"). Return a 5-bullet summary incl. the AllSet license finding and the recommended combination. Do not return the full document.'

const targetingPrompt = G + '\n\nFirst READ ' + ROOT + '/content-generation.md and ' + TC + '/feasibility.md. TASK: model how GRAMMAR-targeting plugs into the textbook-companion generation + QA pipeline. Cover: (1) a grammar-pattern TAXONOMY schema (pattern_id, name, canonical structure template, level/band, textbook-lesson tags e.g. ACCC Book/Lesson, an optional detector hint) and how ACCC lessons map onto it (lesson -> set of pattern_ids), generalizing to "any textbook / any level" exactly like the vocab front-doors; (2) how GENERATION consumes it — allowed patterns through Lesson X + N new target patterns, expressed as constraints/guidance in the generate->critique->repair loop alongside the controlled vocab; (3) VERIFICATION, honestly: vocab is CI-scorable but grammar is not trivially so — enumerate which common patterns ARE mechanically detectable (把 NP V / 被 / 雖然…可是 / V得-complement / 是…的 / comparative 比 / 一邊…一邊, via token or simple dependency heuristics) vs which need an LLM critic; specify the critic checks ("uses only allowed patterns", "actually features the target pattern", "no above-band grammar leaked"); and how this extends the example_checks.py / QA-gate discipline. State the honest limits (grammar verification is probabilistic, the critic is the cost). WRITE to ' + TC + '/grammar-targeting-and-verification.md (H1 + "Status: model + options to react to — not a plan, 2026-06-22"). Return a 5-bullet summary. Do not return the full document.'

const pdfPlanPrompt = G + '\n\nTASK: plan turning the ACCC (當代中文課程) PDFs Wedge will drop at private/dangdai-pdfs/ into a per-lesson GRAMMAR-POINT index (and optionally validate/reconcile vocab against the ivankra/dangdai dataset). Cover: (1) where ACCC PDFs place the 語法 (grammar) section per lesson and what it contains (pattern name, structure/formula, function, example sentences); (2) the EXTRACTION approach — PDF text extraction vs OCR for the grammar sections, then LLM structuring into records {book, lesson, pattern_id, name, structure_template, source_ref}; extract the INDEX of which patterns are taught when, do NOT copy explanations/example sentences into any product artifact; (3) a proposed OUTPUT SCHEMA (JSON) that feeds the taxonomy from the targeting doc; (4) the COPYRIGHT handling restated (PDFs stay LOCAL + gitignored at private/dangdai-pdfs/; extracted index = functional facts; never reproduce explanations/examples as product; never republish the index or the PDFs); (5) a concrete step-by-step of exactly what to run once the PDFs are in the folder (tools, the extraction script shape, where the output JSON lands — likely a gitignored data file). WRITE to ' + TC + '/grammar-pdf-extraction-plan.md (H1 + "Status: extraction plan to react to — not a plan-of-record, 2026-06-22"). Return a 4-bullet summary incl. the recommended extraction approach. Do not return the full document.'

const out = await parallel([
  function () { return agent(sourcingPrompt, { phase: 'Grammar', label: 'grammar-sourcing', agentType: 'claude' }) },
  function () { return agent(targetingPrompt, { phase: 'Grammar', label: 'grammar-targeting', agentType: 'claude' }) },
  function () { return agent(pdfPlanPrompt, { phase: 'Grammar', label: 'grammar-pdf-plan', agentType: 'claude' }) },
])
log('Grammar run done: ' + out.filter(Boolean).length + '/3 artifacts')

return {
  sourcingSummary: out[0],
  targetingSummary: out[1],
  pdfPlanSummary: out[2],
}
