export const meta = {
  name: 'tsumugu-core-research',
  description: 'Tsumugu Core research phase: scaffolding inventory, competitive teardown, content-gen strategy, recaps/synopses legal feasibility, UX/features catalog, management plan — pre-PRD checkpoint',
  phases: [
    { title: 'Ground', detail: 'scaffolding inventory (reads repos) + 8 competitive-research clusters incl. Miraa (web)' },
    { title: 'Analyze', detail: 'teardown, content-gen, recaps feasibility (3-lens adversarial verify), UX/features' },
    { title: 'Synthesize', detail: 'management plan & roadmap + PRD outline / open-decisions register' },
    { title: 'Critique', detail: 'adversarial completeness critic over the full set' },
  ],
}

const DOCS = '/Users/n1/Projects/tsumugu-core/docs'

const GROUNDING = [
  '# Tsumugu Core — grounding brief (authoritative; do not contradict; flag, do not resolve, open questions)',
  '',
  'PRODUCT (decided 2026-06-22): Tsumugu Core is a public website of AI-generated, level-graded Chinese reading (Simplified or Traditional), for English-L1 and Vietnamese-L1 learners, on two INDEPENDENT scaffolding rails over SHARED Chinese content:',
  '- Vietnamese rail (Viet->Han): Han-Viet reading + Vietnamese gloss + the Sino-Vietnamese COGNATE BRIDGE ("you already know this morpheme"). THE MOAT — no competitor has it.',
  '- English rail (Eng->Han): pinyin + English gloss + character depth. A strong graded reader in a crowded field; competes on content quality + dictionary depth. The VOLUME and ARPU that FUNDS the Vietnamese mission.',
  '',
  'NAMING: Tsumugu = open-source engine. Tsumugu-ed = encoded character dictionary (reference layer, 2,662 deep entries). Tsumugu Core = the reading product (graded AI content + reader + importer), linked down into the dictionary.',
  '',
  'WHY THIS DIRECTION: generating and OWNING the content dissolves the two walls that sank earlier versions — (1) COPYRIGHT (no raws, no licensed catalog) and (2) OCR (no images/camera/local model). Earlier ideas (web-novel convert reader; manhua/webtoon comic reader) DEMOTE to a single client-side BRING-YOUR-OWN-TEXT import feature; comics deferred behind an in-browser OCR eval.',
  '',
  'THE SHAPE: AI-generated leveled readings as the spine (original Chinese written to a target HSK/TOCFL band); reader + importer (read the library, or paste/import your own text client-side, never store imported prose server-side); content variety (news summaries, ShortForm-style book synopses, movie recaps — transformative summary only, never reproduction); a known-word layer (log in, save what you know, see only what you do not; seed HSK 1-3 on signup; import from Anki/Migaku/Pleco); the dictionary underneath (tap a word for a gloss, full-entry link into the encoded character page).',
  '',
  'ALREADY SCAFFOLDED (reuse, do not rebuild): the graded-reader engine + the data-* toggle matrix (script simplified/traditional, reading pinyin/zhuyin, gloss EN/VI as independent axes); hanviet.json (10,540 chars, 94.2% single-reading); EN/VI localization (100% complete); the 2,662-entry dictionary; the example-sentence QA gate (scripts/example_checks.py) + TOCFL band machinery; the migaku-style-overlay PRD + known-words importer; a reader mockup at tsumugu/personal/migaku-style-overlay/reader-mockup-concept.html. ~982 authored Simplified stories carry EN + simplified-Chinese with 0 Vietnamese (a known content-asymmetry gap).',
  '',
  'REFERENCE APPS (what each contributes): Yomitan = instant hover/tap gloss (the lookup); Migaku ~10/mo = immersion overlay + one-click SRS mining + known-word tracking (the loop); Mokuro free = offline comic OCR to selectable text overlay (the comic pattern); Pleco free+add-ons = depth-on-tap + document/clipboard reader (reference depth); LingQ ~13/mo = import-your-own-text + status coloring + known-word state (the importer); Du Chinese / The Chairman Bao / Maayot ~5-9/mo = polished leveled graded content (the QUALITY BAR Tsumugu Core targets); Hanzii = the Vietnamese incumbent dictionary (price anchor — Pro must sit below it). All are English-first and Han-Viet-blind — the gap Tsumugu Core fills.',
  '',
  'COPYRIGHT POSTURE (high confidence): a purely client-side overlay of YOUR OWN dictionary onto text the user supplies/renders, with no server-side hosting/storage/redistribution, is cleanest (WhenU; Perfect 10 server test; Adblock-Plus/Axel-Springer; MDY v. Blizzard = client-side mod is contract not copyright; a decade of unlitigated peers: Yomitan, Zhongwen, Pleco, ttu, Migaku, Language Reactor). Risk lives in controllable places: never bypass paywall/DRM (DMCA 1201; Bypass Paywalls Clean killed Aug 2024); no server-side storage of prose; no shared/community library of imports; passive in-page only (no scraper); no prose machine translation; isolate copyleft data (CC-CEDICT BY-SA, char_vi share-alike). Live caveat: Germany BGH (July 2025) reopened the in-memory-DOM-modification theory, so the EU position is open.',
  '',
  'CONTENT COPYRIGHT LADDER: AI-original readings + original news summaries = CLEAN. Book synopses + movie recaps = need TRANSFORMATIVE summary, never reproduction. Hosting raws / licensed catalog = OUT.',
  '',
  'OPEN QUESTIONS (flag, do NOT silently resolve): quality at volume (solo maker + QA gate vs Du Chinese polish); smallest shippable v1; does EN rail fund or dilute VI positioning; free-vs-ads vs freemium per rail; generation pipeline (which model, how QA gate plugs in); comics unlock (in-browser OCR eval); convert-to-learner conversion (the core UNVALIDATED demand assumption — never treat as proven).',
  '',
  'MONETIZATION RULE: KEEP MONEY SPECIFICS OUT of these public-destined docs (CPMs, exact prices live in a gitignored KB private note). Menu only, high level: free+ads (thin), Pro PPP-split (sells convenience never content), donations, dataset licensing, Anki/SRS deck, Pleco funnel, B2B/university. Reference "see private monetization note" rather than embedding figures.',
  '',
  'WRITING VOICE for prose: High-Signal Decision Writing — verdict first, measured claims, steelman the opposing view, recommend with rationale. Declarative. AVOID the "not X, but Y" / "isn it A — it is B" tic. No filler, no exposition restating the obvious. We, not I.',
  '',
  'SOURCE FILES (read for depth):',
  '- Journals: /Users/n1/Projects/llm-knowledge-base/journal/2026-06-22-tsumugu-core-graded-reader-meets-ai-content.md ; .../2026-06-22-monetization-reach-and-web-novel-reader.md ; .../2026-06-22-ulysses-design-philosophy-for-tsumugu-ed.md ; .../2026-06-21-hanviet-bridge-deep-dive.md',
  '- Engine PRDs: /Users/n1/Projects/tsumugu/PRD-*.md (esp. PRD.md, PRD-Tsumugu-Dictionary-App.md, PRD-Wiki-Reader-UX.md, PRD-Library-and-Toolbar.md, PRD-Dictionary.md, PRD-Simplified-Edition.md, PRD-HanViet-Bridge.md)',
  '- Reader overlay PRD + mockup: /Users/n1/Projects/tsumugu/personal/migaku-style-overlay/',
  '- Dictionary repo: /Users/n1/Projects/tsumugu-ed/ (FEASIBILITY-inband-definitions.md, PRD-HanViet-Bridge-Render.md, schema/, scripts/example_checks.py)',
].join("\n")

const CLUSTERS = [
  { key: "graded-content", label: "Graded-content readers (the quality bar)", apps: "Du Chinese, The Chairman Bao, Maayot, Mandarin Bean", focus: "leveling UX, daily content cadence, audio narration, in-line gloss, lesson/quiz structure, what makes content feel polished and what the QA bar actually is" },
  { key: "import-knownword", label: "Import + known-word state (the LingQ model)", apps: "LingQ, Lute (open-source), Readlang, Learning With Texts (LWT)", focus: "import flows, the known/learning/unknown word-status state machine + coloring, SRS integration, statistics, what makes import sticky" },
  { key: "immersion-overlay", label: "Immersion overlay + SRS mining", apps: "Migaku, Yomitan, Language Reactor, asbplayer", focus: "hover/tap gloss interaction, one-click card mining, audio/subtitle sync, browser-extension vs app vs mobile, known-word sync across surfaces" },
  { key: "reference-dict", label: "Reference dictionaries + the VI incumbent", apps: "Pleco, Hanzii (the Vietnamese incumbent — COVER DEEPLY: features, VN/Han-Viet coverage, pricing, what VI learners pay for), Zhongwen, Outlier Dictionary", focus: "document/clipboard reader, add-on/publisher model, Han-Viet coverage, pricing anchors Tsumugu Core Pro must sit under" },
  { key: "vi-convert", label: "VI convert ecosystem (the audience current tools)", apps: "vietphrase.app, QuickTranslator, sangtacviet, truyenfull, wikidich", focus: "what convert readers love/tolerate/hate, the Han-Viet phonetic-layer UX, name/phrase dictionaries, why they stay monolingual, what would pull them toward LEARNING Mandarin" },
  { key: "comics-ocr", label: "Comics/manga overlay + OCR (deferred second surface)", apps: "Mokuro, ttu-reader, Lexirise (CN manhua overlay w/ pinyin), Manga-OCR, PaddleOCR-VL", focus: "overlay-on-art vs split-screen, offline batch OCR quality on clean digital panels, the in-browser OCR feasibility bar, copyright surface for manhua" },
  { key: "jp-ko-learner", label: "Japanese/Korean learner readers (parked rails)", apps: "Satori Reader, JPDB, ttu+Yomitan stack, Korean Hanja learner tools", focus: "graded+SRS reader patterns, furigana/cognate cueing, what a Han-Viet mnemonic on furigana adds, the Sino-Korean Hanja-literacy opportunity" },
  { key: "miraa", label: "Miraa (and adjacent AI-native learning apps)", apps: "Miraa — IDENTIFY EXACTLY what it is via web search (it may be an AI-native language/Chinese reader, an AI tutor, or an immersion/SRS tool); plus any close AI-native reader/immersion peers it surfaces", focus: "what Miraa does, its content + AI model, killer features, pricing, platform. CRITICAL: if Miraa already does AI-GENERATED graded reading content, it is the closest competitor to the Tsumugu Core central bet — say so loudly, map exactly where it overlaps and where Tsumugu Core (Han-Viet bridge, owned dictionary depth, dual rails) differentiates" },
]

function clusterPrompt(c) {
  return GROUNDING + "\n\nTASK: Research the competitive cluster \"" + c.label + "\" to inform Tsumugu Core feature design. Apps: " + c.apps + ". Focus: " + c.focus + ".\n\nUse WebSearch/WebFetch to ground CURRENT (point-in-time) facts: features, pricing, UX patterns, recent changes, platform (web/mobile/extension). Build on the reference-apps notes in the grounding brief and go DEEPER at the feature/interaction level — the brief is strategy-level; we now need concrete features worth stealing or rejecting.\n\nFor each app: what it does, killer features, concrete UX patterns worth stealing (and which rail each serves — EN, VI, or both), pricing (approx, point-in-time), the gap Tsumugu Core can exploit, and anti-patterns to avoid. Then give the top steals for Tsumugu Core from this cluster, each tagged rail + priority (must/should/maybe) + a one-line rationale. Mark uncertain or estimated facts explicitly; never fabricate numbers or features."
}

const CLUSTER_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    cluster: { type: "string" },
    apps: {
      type: "array", items: {
        type: "object", additionalProperties: false,
        properties: {
          name: { type: "string" },
          oneLiner: { type: "string" },
          pricing: { type: "string" },
          platform: { type: "string" },
          killerFeatures: { type: "array", items: { type: "string" } },
          uxPatternsToSteal: {
            type: "array", items: {
              type: "object", additionalProperties: false,
              properties: { pattern: { type: "string" }, why: { type: "string" }, rail: { type: "string" } },
              required: ["pattern", "why", "rail"]
            }
          },
          gapsTsumuguCoreExploits: { type: "array", items: { type: "string" } },
          antiPatterns: { type: "array", items: { type: "string" } }
        },
        required: ["name", "oneLiner", "pricing", "platform", "killerFeatures", "uxPatternsToSteal", "gapsTsumuguCoreExploits", "antiPatterns"]
      }
    },
    topSteals: {
      type: "array", items: {
        type: "object", additionalProperties: false,
        properties: { feature: { type: "string" }, rail: { type: "string" }, priority: { type: "string" }, rationale: { type: "string" } },
        required: ["feature", "rail", "priority", "rationale"]
      }
    },
    notesOnOverlapWithTsumuguCore: { type: "string" }
  },
  required: ["cluster", "apps", "topSteals", "notesOnOverlapWithTsumuguCore"]
}

const VERDICT_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    lens: { type: "string" },
    optimismHolds: { type: "boolean" },
    confidence: { type: "string" },
    claimsThatFail: { type: "array", items: { type: "string" } },
    mustHoldConditions: { type: "array", items: { type: "string" } },
    sources: { type: "array", items: { type: "string" } }
  },
  required: ["lens", "optimismHolds", "confidence", "claimsThatFail", "mustHoldConditions"]
}

const CRITIC_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    contradictionsWithJournals: { type: "array", items: { type: "string" } },
    scopeCreep: { type: "array", items: { type: "string" } },
    missingCompetitorsOrFeatures: { type: "array", items: { type: "string" } },
    legalOverreach: { type: "array", items: { type: "string" } },
    silentlyResolvedOpenQuestions: { type: "array", items: { type: "string" } },
    moneyLeaks: { type: "array", items: { type: "string" } },
    topFixesBeforePRD: {
      type: "array", items: {
        type: "object", additionalProperties: false,
        properties: { issue: { type: "string" }, doc: { type: "string" }, fix: { type: "string" }, severity: { type: "string" } },
        required: ["issue", "doc", "fix", "severity"]
      }
    }
  },
  required: ["contradictionsWithJournals", "scopeCreep", "missingCompetitorsOrFeatures", "legalOverreach", "silentlyResolvedOpenQuestions", "moneyLeaks", "topFixesBeforePRD"]
}

const STATUS = "Status: research-phase draft — pre-PRD checkpoint, 2026-06-22"

const inventoryPrompt = GROUNDING + "\n\nTASK: Produce the SCAFFOLDING INVENTORY for Tsumugu Core — a precise map of what ALREADY EXISTS across the repos that Tsumugu Core can reuse, what is partial, and what is missing. READ the actual repos (do not guess): /Users/n1/Projects/tsumugu , /Users/n1/Projects/tsumugu-ed , /Users/n1/Projects/tsumugu-wiki , and the overlay PRD + mockup at /Users/n1/Projects/tsumugu/personal/migaku-style-overlay/. Inspect: the engine + renderer, the data-* toggle matrix, the dictionary data + schema, hanviet.json, the EN/VI localization, the example-sentence QA gate (scripts/example_checks.py) + TOCFL band machinery, the known-words importer, the reader mockup, the Simplified edition, and tsumugu-ed/FEASIBILITY-inband-definitions.md.\n\nWrite a markdown document: for each asset — name, path, current state, and SPECIFIC reuse value for Tsumugu Core (which of: content generation, reader UI, known-word layer, importer, dictionary linkage, QA/leveling, dual-rail scaffolding). Then a GAP ANALYSIS: what Tsumugu Core needs that does NOT yet exist (accounts/login, content-generation pipeline, the reader-as-product shell, news/synopsis content types, hosting/sync, payments). End with a one-paragraph smallest-reuse-path-to-a-v1.\n\nWRITE the complete document to " + DOCS + "/scaffolding-inventory.md (start with '# Scaffolding Inventory — Tsumugu Core' and the status line '" + STATUS + "'). Then return a 4-bullet summary of the biggest reusable assets and the biggest gaps. Do not return the full document."

const teardownPrompt = GROUNDING + "\n\nYou are synthesizing the COMPETITIVE TEARDOWN for Tsumugu Core from per-cluster research findings (JSON below). Also Read " + DOCS + "/scaffolding-inventory.md for the reuse hooks.\n\nCLUSTER FINDINGS (JSON):\n__CLUSTERS__\n\nWrite a markdown document:\n1. A FEATURE MATRIX: rows = salient features across all apps (gloss-on-tap, known-word state, SRS mining, BYO import, graded library, audio narration, document/clipboard reader, overlay-on-art, AI-generated content, Han-Viet bridge, dual-language scaffolding, offline, mobile); columns = key apps + Tsumugu Core (planned); cells = yes / partial / no / planned. Keep it readable as a markdown table.\n2. WHAT TO STEAL — a prioritized list (must / should / maybe), each feature tagged EN rail / VI rail / both, with source app, rationale, and the reuse hook from the inventory where one exists.\n3. WHAT TO REJECT AND WHY — features that look attractive but fight Tsumugu Core free-philosophy, solo-maker reality, or legal posture (e.g. streaks, hosted raws, server-side import storage).\n4. THE WEDGE at feature level: which exact features make the VI rail non-replicable. If any researched app (esp. Miraa) already does AI-generated graded content, address the overlap head-on and state Tsumugu Core differentiation.\nMark estimates as estimates. WRITE to " + DOCS + "/competitive-teardown.md (start with '# Competitive Teardown — Tsumugu Core' + the status line). Return a 4-bullet summary incl. the single most important steal and the most dangerous competitor. Do not return the full document."

const contentGenPrompt = GROUNDING + "\n\nRead " + DOCS + "/scaffolding-inventory.md first. TASK: produce the CONTENT-GENERATION STRATEGY for Tsumugu Core — how AI-generated graded reading content gets made at quality AND volume, reusing the band machinery + example-sentence QA discipline.\n\nCover:\n- Content TYPES and copyright-safety tier: AI-original graded stories (clean), original news summaries (clean), ShortForm-style book synopses + movie recaps (transformative-summary tier — cross-reference recaps-synopses-feasibility.md), graded non-fiction/explainers, dialogues. Recommend the LAUNCH MIX.\n- The GENERATION PIPELINE end to end: spec/prompt -> generation model(s) [recommend specific CURRENT Claude models and why; favor a generate->critique->repair loop] -> leveling against HSK/TOCFL controlled vocabulary (reuse band machinery) -> the QA GATE [reuse/extend the example_checks.py discipline for generated PROSE: unnatural collocations, level violations, factual/teaching errors, register, repetition] -> human/loom review -> publish. Name where the real cost is (the gate, not the generation).\n- DUAL-RAIL production: shared Chinese content, forked scaffolding (VI = Han-Viet + cognate bridge + VI gloss; EN = pinyin + EN gloss). How the cognate bridge gets generated/verified per reading (lean on hanviet.json determinism + Mandarin polyphone disambiguation, g2pW ~99%).\n- Leveling + controlled-vocabulary mechanics; how known-word state can personalize content selection.\n- THROUGHPUT: how to drive this with the near-unlimited Composer/Grok agent fleet + the loom parallel-wave authoring method (the same method that authored the dictionary corpus); rough cost/throughput shape; how to avoid teaching mistakes at volume.\n- A concrete v1 content slice recommendation (how many readings, which bands, which types, which rail first).\nWRITE to " + DOCS + "/content-generation.md (start with '# Content Generation Strategy — Tsumugu Core' + the status line). Return a 4-bullet summary. Do not return the full document."

const uxPrompt = GROUNDING + "\n\nRead " + DOCS + "/scaffolding-inventory.md first. Competitive cluster findings (JSON) below.\n\nCLUSTER FINDINGS (JSON):\n__CLUSTERS__\n\nTASK: produce the UX + FEATURES CATALOG for Tsumugu Core — a comprehensive, DISCUSSED feature universe and user experience, grounded in the existing toggle matrix + reader mockup + dictionary and in the competitive patterns. Discuss tradeoffs, do not just list.\n\nCover:\n- Core READER experience: leveled library browse, the reading surface, tap/hover gloss into the dictionary full entry, audio narration, the Reader Calm theme question (warm-paper vs plain-white, from the Ulysses journal), promoting the data-* toggles (script, reading, gloss) to first sight.\n- DUAL-RAIL UX: how EN vs VI readers experience the same content; the Han-Viet COGNATE BRIDGE presentation (the moat — you-already-know-this-morpheme inline without clutter); the realm/rail switcher.\n- KNOWN-WORD layer: login, save-known, see-only-unknown, cold-start seeding (HSK 1-3), import from Anki/Migaku/Pleco; SINGLE SOURCE OF TRUTH (the reader owns known-state; the dictionary does NOT — from the Ulysses journal).\n- IMPORTER (BYO-text, client-side only): paste/file/EPUB, the legal guardrails surfaced in-UX (no server storage, no sharing).\n- ONBOARDING, accounts, sync, offline (Pro), settings.\n- Discovery, levels, progress WITHOUT anti-fit streaks/targets (see the Ulysses rejections).\n- Mobile-first reality (no extensions on mobile; the overlay/extension is a desktop add-on; the web app is the front door).\nGroup features MUST / SHOULD / LATER and tag each EN / VI / both. FLAG open UX decisions (do not silently resolve).\nWRITE to " + DOCS + "/ux-and-features.md (start with '# UX & Features Catalog — Tsumugu Core' + the status line). Return a 4-bullet summary. Do not return the full document."

const managementPrompt = GROUNDING + "\n\nRead these docs first: " + DOCS + "/scaffolding-inventory.md , " + DOCS + "/competitive-teardown.md , " + DOCS + "/content-generation.md , " + DOCS + "/recaps-synopses-feasibility.md , " + DOCS + "/ux-and-features.md .\n\nTASK: write the PROJECT MANAGEMENT + DECOMPOSITION + ROADMAP plan for Tsumugu Core — how Wedge (a SOLO maker with near-unlimited Composer/Grok agent tokens, a Claude orchestration loop, and the loom parallel-wave authoring method) actually BUILDS this without sprawl.\n\n- VERDICT: recommended build strategy in 3-4 sentences.\n- SMALLEST SHIPPABLE v1: name it concretely (likely VI rail + a handful of AI readings + known-word login over the existing engine) and why; the riskiest assumption it tests (convert-to-learner conversion).\n- PHASING: v1 -> v2 -> later. Each phase = goal, scope, the open-question it validates, exit criteria. Map demoted/parked ideas (comics, JP/KO rails, dataset licensing, Pleco funnel) to phases.\n- WORK DECOMPOSITION: workstreams (content pipeline, reader shell, known-word/accounts, importer, dictionary linkage, infra/hosting/payments, QA gate), each broken into work-orders sized for an agent fleet. For each workstream say which TOOL drives it (Composer for codegen, Grok for X, the loom for content authoring, Claude for orchestration/QA) and the human-in-the-loop checkpoints.\n- HOW TO RUN THE FLEET: the parallel-wave / work-order discipline, the QA gate as the throughput bottleneck, avoiding the duplicate/stale problem.\n- RISKS + KILL-CRITERIA per phase.\n- IMMEDIATE NEXT 5 ACTIONS after this research checkpoint.\nDecisive — this is the plan Wedge runs against. WRITE to " + DOCS + "/MANAGEMENT-PLAN.md (start with '# Management Plan & Roadmap — Tsumugu Core' + the status line). Return a 5-bullet summary incl. the named v1 and the next 5 actions. Do not return the full document."

const prdOutlinePrompt = GROUNDING + "\n\nRead all docs in " + DOCS + "/ first. We are at a RESEARCH CHECKPOINT — the comprehensive PRD is written in the NEXT pass, AFTER Wedge resolves the open decisions.\n\nProduce TWO things in one markdown doc:\n1. PRD SKELETON — a complete, ordered section outline for the eventual PRD-Tsumugu-Core.md, one line per section on what it will contain and which research doc feeds it.\n2. OPEN-DECISIONS REGISTER — EVERY decision Wedge must make before the PRD can be written, each with: options, the tradeoff, a RECOMMENDED default, and which research doc bears on it. Pull the journal open questions (quality at volume; smallest v1; EN funds-or-dilutes VI; free-vs-ads-vs-freemium per rail; generation pipeline; comics unlock; convert-to-learner conversion) plus any surfaced by the research. Group: PRODUCT SCOPE / CONTENT / UX / LEGAL / MONETIZATION (point money specifics to the private note) / BUILD-SEQUENCING.\nWRITE to " + DOCS + "/PRD-OUTLINE-and-open-decisions.md (start with '# PRD Outline & Open-Decisions Register — Tsumugu Core' + the status line). Return the list of decision HEADLINES (just the questions) so Wedge can scan them. Do not return the full document."

const criticPrompt = GROUNDING + "\n\nYou are the COMPLETENESS + ADVERSARIAL CRITIC over the full Tsumugu Core research set. Read every doc in " + DOCS + "/ critically against the grounding brief, the journals, and the solo-maker + free-philosophy reality. Find what is wrong, missing, or overreaching BEFORE it hardens into a PRD.\n\nCheck for: contradictions with the journals/decisions; scope creep beyond a solo maker; missing competitors or features (did Miraa get handled?); LEGAL OVERREACH in the recaps/copyright doc (too optimistic?); places that SILENTLY RESOLVED an open question; MONEY specifics that leaked into public-destined docs; the convert-to-learner demand assumption being treated as proven. Be specific and cite the doc + section. Prioritize the top fixes to make before writing the PRD."

function recapsResearchPrompt() {
  return GROUNDING + "\n\nTASK: RESEARCH the legal + practical feasibility of Tsumugu Core publishing CHINESE-LANGUAGE, LEVEL-GRADED RECAPS / SYNOPSES of copyrighted works (novels, films, TV, nonfiction) as ORIGINAL graded reading content. Output is a graded learning text in Chinese summarizing the plot/ideas of a copyrighted work — NOT a translation, NOT reproduction.\n\nUse WebSearch/WebFetch to ground the law, with citations:\n- US fair use: the four factors applied to plot summaries/recaps; the idea/expression dichotomy; abridgement-is-a-derivative-work (section 106(2)) vs transformative summary; key cases — Twin Peaks v. Publications Intl; Castle Rock v. Carol Publishing (Seinfeld Aptitude Test); Warner Bros v. RDR Books (Harry Potter Lexicon); Authors Guild v. Google (Books); Authors Guild v. HathiTrust; Fox News v. TVEyes; AP v. Meltwater (news). What separates a lawful recap (CliffsNotes/SparkNotes/Wikipedia plot sections/ShortForm/Blinkist) from an infringing one.\n- Does CROSS-LANGUAGE + SUMMARIZATION + GRADING (e.g. English novel into simplified graded Chinese plot summary) stack toward transformative, or does cross-language make it a derivative TRANSLATION? Address both readings.\n- Trademark / titles / character-name exposure.\n- Vietnam IP law (Law on IP Art.14 covers derivative + translated works) + how server location matters; the EU/Germany BGH (2025) caveat.\n- News summaries (hot-news misappropriation, AP v. Meltwater) vs book/film recaps.\n- MARKET SUBSTITUTION: when does a recap substitute for the original or for the licensed-summary market (Blinkist/ShortForm nonfiction summaries that replace reading the book)?\n\nReturn a thorough research brief (markdown) with a PRELIMINARY verdict and explicit citations. It will be adversarially verified, so be precise about confidence and your riskiest assumptions. Return the brief text only (do not write a file yet)."
}

function recapsVerifyPrompt(lens, research) {
  return GROUNDING + "\n\nA research brief argues Tsumugu Core can publish graded Chinese recaps/synopses of copyrighted works under a transformative/fair-use theory. REFUTE it from the \"" + lens + "\" lens. Default to skepticism — assume the brief is too optimistic and try to break it. Use WebSearch to check the actual case law.\n\nLens guidance:\n- fair-use-four-factors: stress-test each of the four factors against the recap use; where does it lose, especially factor 1 (is graded-reading transformative or just repackaging?) and factor 4 (market harm)?\n- derivative-work-line: is a cross-language plot summary a derivative work (translation/abridgement) under section 106(2) regardless of fair use? Where is the BRIGHTEST infringement line (detailed beat-by-beat retelling, distinctive expression, character-heavy synopsis)?\n- market-substitution-and-platform-takedown: does a graded recap substitute for the original or for the licensed-summary market (Blinkist/ShortForm)? Platform/DMCA/Vietnam-server exposure; what triggers a takedown even where you would win in court.\n\nRESEARCH BRIEF:\n" + research + "\n\nReturn your verdict: does the brief optimism hold under this lens, the specific claims that DO NOT survive, the safe-harbor conditions that MUST hold, and your confidence."
}

function recapsSynthPrompt(research, verdicts) {
  return GROUNDING + "\n\nSynthesize the FINAL recaps/synopses feasibility document from the research brief and the adversarial verdicts (High-Signal Decision Writing — verdict first, honest about residual risk).\n\nRESEARCH BRIEF:\n" + research + "\n\nADVERSARIAL VERDICTS (JSON):\n" + JSON.stringify(verdicts) + "\n\nWrite a markdown decision document:\n- VERDICT: is recaps/synopses content feasible and safe enough to ship, and under exactly what constraints? Decisive but honest.\n- BRIGHT LINES (never: reproduce expression, track plot beat-for-beat, substitute for the market, borrow the original distinctive language/titles-as-branding).\n- THE SAFE RECIPE: how to author a graded Chinese recap that stays transformative (idea-level summary, original expression, educational framing/attribution, length/coverage limits, the could-this-replace-the-original test).\n- CONTENT-SAFETY RANKING: AI-original (safest) -> original news summaries -> film/TV recaps -> nonfiction book summaries (Blinkist substitution risk) -> fiction plot synopses, with constraints per tier.\n- JURISDICTION notes (US / Vietnam / EU-Germany caveat / server location) + platform-takedown reality.\n- RECOMMENDATION for the v1 content mix.\nWRITE to " + DOCS + "/recaps-synopses-feasibility.md (start with '# Recaps & Synopses — Legal + Practical Feasibility' + the status line). Return a 4-bullet summary incl. the verdict and the single biggest legal risk. Do not return the full document."
}

async function recapsFlow() {
  const research = await agent(recapsResearchPrompt(), { phase: "Analyze", label: "recaps:research", agentType: "claude" })
  const lenses = ["fair-use-four-factors", "derivative-work-line", "market-substitution-and-platform-takedown"]
  const verdicts = (await parallel(lenses.map(function (lens) {
    return function () { return agent(recapsVerifyPrompt(lens, research), { phase: "Analyze", label: "recaps:verify:" + lens, schema: VERDICT_SCHEMA, agentType: "claude" }) }
  }))).filter(Boolean)
  const summary = await agent(recapsSynthPrompt(research, verdicts), { phase: "Analyze", label: "recaps:synth", agentType: "claude" })
  return { summary: summary, verdicts: verdicts }
}

// ---------- PHASE 1: GROUND ----------
phase("Ground")
const groundThunks = [function () { return agent(inventoryPrompt, { phase: "Ground", label: "inventory", agentType: "claude" }) }]
CLUSTERS.forEach(function (c) {
  groundThunks.push(function () { return agent(clusterPrompt(c), { phase: "Ground", label: "research:" + c.key, schema: CLUSTER_SCHEMA, agentType: "claude" }) })
})
const ground = await parallel(groundThunks)
const inventorySummary = ground[0] || "(inventory agent returned nothing)"
const clusterFindings = ground.slice(1).filter(Boolean)
const clustersJson = JSON.stringify(clusterFindings)
log("Ground done: inventory + " + clusterFindings.length + "/" + CLUSTERS.length + " competitive clusters")

// ---------- PHASE 2: ANALYZE ----------
phase("Analyze")
const analyze = await parallel([
  function () { return agent(teardownPrompt.replace("__CLUSTERS__", clustersJson), { phase: "Analyze", label: "teardown", agentType: "claude" }) },
  function () { return agent(contentGenPrompt, { phase: "Analyze", label: "content-gen", agentType: "claude" }) },
  function () { return recapsFlow() },
  function () { return agent(uxPrompt.replace("__CLUSTERS__", clustersJson), { phase: "Analyze", label: "ux-features", agentType: "claude" }) },
])
const recapsResult = analyze[2] || {}
log("Analyze done: teardown, content-gen, recaps (3-lens verified), ux")

// ---------- PHASE 3: SYNTHESIZE ----------
phase("Synthesize")
const synth = await parallel([
  function () { return agent(managementPrompt, { phase: "Synthesize", label: "management", agentType: "claude" }) },
  function () { return agent(prdOutlinePrompt, { phase: "Synthesize", label: "prd-outline", agentType: "claude" }) },
])
log("Synthesize done: management plan + PRD outline / open-decisions register")

// ---------- PHASE 4: CRITIQUE ----------
phase("Critique")
const critic = await agent(criticPrompt, { phase: "Critique", label: "critic", schema: CRITIC_SCHEMA, agentType: "claude" })

return {
  inventorySummary: inventorySummary,
  clusterCount: clusterFindings.length,
  clusterFindings: clusterFindings,
  teardownSummary: analyze[0],
  contentGenSummary: analyze[1],
  recapsSummary: recapsResult.summary,
  recapsVerdicts: recapsResult.verdicts,
  uxSummary: analyze[3],
  managementSummary: synth[0],
  prdOpenDecisions: synth[1],
  critic: critic,
}
