export const meta = {
  name: 'tsumugu-superapp-research',
  description: 'Tsumugu super-app: Duolingo + shadowing-tech + HSKStory/Hidden-Dragon + video/comics feasibility + desktop architecture + Taiwan-learner gap, then a strawman VISION + architecture/build-sequence + critic',
  phases: [
    { title: 'Research', detail: 'Duolingo, shadowing tech, HSKStory/Hidden Dragon, video+comics feasibility, desktop architecture, Taiwan-learner gap (web)' },
    { title: 'Synthesize', detail: 'strawman super-app VISION + architecture & build-sequence' },
    { title: 'Critique', detail: 'adversarial pass: solo-maker buildability, wall-containment, one-brain thesis, lost value' },
  ],
}

const DOCS = '/Users/n1/Projects/tsumugu-core/docs'
const SA = DOCS + '/super-app'
const STATUS = 'Status: super-app research/design — strawman for Wedge to react to, 2026-06-22'

const G = [
  '# Tsumugu super-app — grounding brief (authoritative; 2026-06-22 reframe)',
  '',
  'NORTH STAR: Wedge is building "the Chinese-learning app I wish I had when I was learning Traditional Chinese in Taiwan." Personal-vision, scratch-your-own-itch product — do NOT frame in moats/defensibility/TAM. Judge every feature by: would this have helped a serious learner of Traditional Chinese in Taiwan?',
  '',
  'WHAT IT IS: a desktop-first Chinese-learning SUPER-APP — "Pleco for computers" — unifying the best of many tools into ONE space over ONE shared brain. The brain = a known-word + dictionary core: a LingQ-style per-word status model (the "1 2 3 4 / known / ignore" hotkeys), Tsumugu\'s 2,662-entry character-mechanism dictionary as the depth layer, and FSRS spaced repetition. Every content surface feeds that brain and reads from it. Surfaces, each in read + shadow modes: graded readers (Du Chinese model), AI-generated leveled stories, bring-your-own text, comics/webtoons (hover-to-define overlay), and video immersion (YouTube/Netflix, Migaku / Language Reactor style). Plus the good parts of Duolingo (habit, onboarding, lightweight motivation) judged afresh for a SERIOUS learner.',
  '',
  'LOCKED DECISIONS (2026-06-22):',
  '- TRADITIONAL-FIRST. Traditional Chinese is the base and first-class — the gap is real (Duolingo has no Traditional Mandarin path; most consumer apps are Simplified-only/first). A Simplified toggle is EASY and already built (html data-script axis). Bopomofo/zhuyin is a Taiwan-native reading aid already supported (data-reading axis).',
  '- GLOSS RAILS: English AND Vietnamese, both already built (data-gloss axis; VI localization 100% done). The VI Han-Viet cognate bridge is a deep retained feature, not the headline.',
  '- ONE BRAIN, MANY SURFACES (the Pleco pattern): a shared known-word/dictionary/SRS core; surfaces dock onto it. The reading library and the shadowing tool are the SAME content in different practice modes over the same brain.',
  '- TWO BODIES: a standalone app (owned + AI + BYO + imported-comic content) AND a companion browser extension (the legally-required path for the Netflix/YouTube overlay, since video plays DRM-protected in the browser).',
  '- PLATFORM SEQUENCE: desktop FIRST -> iPadOS/iOS -> browser extension LAST.',
  '',
  'ALREADY BUILT (reuse, ~80%): the @tsumugu/engine (prepared-content schema, LingQ-style word-status model + coloring, FSRS, multi-source importer Anki/Migaku/Pleco, CI scorer), apps/web reader (hover gloss, library, in-browser jieba segmentation, per-reader prefs), the data-* toggle matrix (script 繁/简 · reading pinyin/zhuyin/Han-Viet · gloss EN/VI), hanviet.json (10,540 chars), the 2,662-entry dictionary, the example-sentence QA gate + TOCFL bands. EXISTING RESEARCH lives in /Users/n1/Projects/tsumugu-core/docs/ (scaffolding-inventory, competitive-teardown, content-generation, recaps-synopses-feasibility, ux-and-features, MANAGEMENT-PLAN, CRITIC-FINDINGS) — BUILD ON IT, do not redo it.',
  '',
  'LEGAL CONSTRAINTS (from prior research, binding): owned + AI-generated + BYO + public-domain content = clean. In-copyright RECAPS = NOT in v1 (Warhol v. Goldsmith 2023; takedown-at-scale). Comics + video immersion are legal ONLY as CLIENT-SIDE overlays on content the user already has/renders — never host, store, or redistribute the copyrighted media; never bypass paywall/DRM (DMCA 1201). This is exactly why video = the extension, and comics = BYO-import + local OCR.',
  '',
  'WRITING VOICE: High-Signal Decision Writing — verdict first, measured, steelman, recommend with rationale. Declarative. Avoid the "not X, but Y" tic. We, not I. This is a PRIVATE working repo — KEEP cost/pricing/competitor figures (useful working data); only strip if a doc graduates to a public surface.',
  '',
  'SOURCE FILES: existing docs in /Users/n1/Projects/tsumugu-core/docs/ ; journals /Users/n1/Projects/llm-knowledge-base/journal/2026-06-22-*.md + 2026-06-21-hanviet-bridge-deep-dive.md ; engine /Users/n1/Projects/tsumugu/ ; dictionary /Users/n1/Projects/tsumugu-ed/ .',
].join('\n')

function research(label, path, body) {
  return G + '\n\nTASK (' + label + '): ' + body + '\n\nUse WebSearch/WebFetch to ground current (point-in-time) facts; mark estimates as estimates; never fabricate. Build on the existing docs in ' + DOCS + '/ (read what is relevant, do not redo it). WRITE the complete markdown document to ' + path + ' (start with an H1 title + the status line "' + STATUS + '"). Then return a 4-bullet summary. Do not return the full document.'
}

const duolingoPrompt = research('Duolingo teardown', SA + '/duolingo-teardown.md',
  'Teardown Duolingo as a FEATURE DONOR for a serious Traditional-Chinese learning super-app. Cover the path/lesson structure, onboarding, the habit/streak/gamification loop, lightweight SRS, speaking/listening exercises, and what genuinely drives daily return that serious tools (Du Chinese / LingQ / Pleco) lack. CONFIRM Duolingo Mandarin is Simplified-only with no Traditional path. Then split: which mechanics to STEAL for a serious learner (habit, frictionless onboarding, bite-sized daily practice, gentle progress) vs REJECT (shallow content, streak-shame, no real reading). Note: our Ulysses-journal rejected streaks/daily-targets for the reference DICTIONARY as anti-fit — a learning app is a different context, so judge afresh and say where the line is.')

const shadowingPrompt = research('Shadowing + immersion tech', SA + '/shadowing-immersion-tech.md',
  'Research the SHADOWING + immersion-practice category and its TECH, for the capability "any reading or video converts into a shadowing tool." Apps: Migaku, Language Reactor, Speechling, Glossika, Pillartalk, ELSA, Speak. Cover what shadowing IS as UX (listen -> repeat -> record -> compare to native; sentence-by-sentence loop; speed control). Then the TECH to BUILD it: forced alignment (text<->audio timing), ASR + pronunciation scoring for Mandarin INCLUDING TONES (Azure Speech pronunciation assessment, Whisper-based options, on-device vs cloud), scoring a learner recording against a reference, and the hard parts (tone scoring, Traditional text, latency). Recommend a buildable approach for a solo maker (which API or on-device model), and how it reuses the existing reader + pre-rendered audio.')

const hsksPrompt = research('HSKStory + Hidden Dragon deep', SA + '/hskstory-hiddendragon-deep.md',
  'Deep teardown of HSKStory and Hidden Dragon — the closest AI-content / graded-content rivals to this product central bet. For EACH: full feature/UX, content model (AI-generated? graded how? how much/how fast?), pricing, platform, and CRITICALLY whether they support TRADITIONAL Chinese and zhuyin. Exactly what to learn from each, and where a Traditional-first, one-brain, dictionary-deep super-app beats them. Go deeper than the existing competitive-teardown.md (which already has the basics) specifically on content model + Traditional support.')

const immersionPrompt = research('Video + comics feasibility', SA + '/immersion-video-comics-feasibility.md',
  'Produce the LEGAL + TECHNICAL feasibility of the two immersion surfaces for the two-body shape (standalone app + companion extension, extension LAST). VIDEO (YouTube + Netflix; Migaku / Language Reactor / asbplayer / Trancy pattern): how dual-subtitle hover-define + sentence-mining works; subtitle sourcing; the DRM/ToS/DMCA-1201 reality; CONFIRM the Netflix/YouTube overlay MUST be a browser EXTENSION (DRM video plays in-browser) and specify what the standalone DESKTOP app can legally do for video (local video files + external .srt; YouTube via official captions/API). COMICS/WEBTOONS (Mokuro pattern): hover-to-define overlay on art via offline/LOCAL OCR; the in-browser/local OCR quality bar for TRADITIONAL Chinese manhua/webtoons; BYO-import (client-side only) vs anything hosted; copyright. For both: the bright lines (never host/store/redistribute copyrighted media; never bypass DRM) and how each docks as a LATER pillar. Build on recaps-synopses-feasibility.md + the comics/immersion clusters in competitive-teardown.md.')

const archPrompt = research('Desktop architecture + one-brain', SA + '/desktop-architecture-and-one-brain.md',
  'Produce the DESKTOP ARCHITECTURE + "one-brain super-app" data model. Desktop-first, then iPadOS/iOS, then a browser extension. Cover: Electron vs Tauri (perf, bundle, security, and crucially REUSE of the existing apps/web reader + @tsumugu/engine, which are already web/TypeScript) — recommend one with rationale. The SHARED BRAIN data model: per-word status (1/2/3/4/known/ignore), FSRS scheduling, dictionary linkage, and SYNC. How each surface (reader, shadow, BYO, comics, video-via-extension) docks onto one brain without a rebuild. Offline-first + sync design. The cross-platform path to iPad/iOS (Capacitor wrap of the web layer vs native) and how the companion extension shares the brain (sync protocol / account). How comparable apps architect a dictionary-brain-with-many-surfaces (Pleco, LingQ, Migaku, Readwise Reader, Anki).')

const taiwanPrompt = research('Traditional-learner-in-Taiwan gap map', SA + '/traditional-taiwan-learner-gap.md',
  'Map the Traditional-Chinese-learner-in-Taiwan experience and its tool gaps, to ground "the app Wedge wishes he had in Taiwan." Cover: how Mandarin is learned in Taiwan (zhuyin/bopomofo as the phonetic system; TOCFL not HSK; MTC/ICLP and university programs; textbooks like A Course in Contemporary Chinese and Practical Audio-Visual Chinese/PAVC), what tools Taiwan-based learners actually use, and WHERE THE GAPS ARE (Traditional omitted in mainstream apps; Simplified-centric content; zhuyin underserved; scarce graded Traditional reading; the gulf between the classroom and real Taiwanese media/web/PTT/news). What a Traditional-first super-app must nail for this learner. End with a clearly-marked placeholder section "Wedge\'s lived Taiwan pain-points (to fill)".')

const CRITIC_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    soloMakerBuildability: { type: 'array', items: { type: 'string' } },
    copyrightWallContainment: { type: 'array', items: { type: 'string' } },
    oneBrainThesisRealOrVeneer: { type: 'array', items: { type: 'string' } },
    shipsValueEarly: { type: 'array', items: { type: 'string' } },
    valueLostFromFocusedThesis: { type: 'array', items: { type: 'string' } },
    duolingoStreakShameCreep: { type: 'array', items: { type: 'string' } },
    topFixes: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: { issue: { type: 'string' }, doc: { type: 'string' }, fix: { type: 'string' }, severity: { type: 'string' } },
        required: ['issue', 'doc', 'fix', 'severity']
      }
    }
  },
  required: ['soloMakerBuildability', 'copyrightWallContainment', 'oneBrainThesisRealOrVeneer', 'shipsValueEarly', 'valueLostFromFocusedThesis', 'duolingoStreakShameCreep', 'topFixes']
}

// ---------- PHASE 1: RESEARCH ----------
phase('Research')
const research_results = await parallel([
  function () { return agent(duolingoPrompt, { phase: 'Research', label: 'duolingo', agentType: 'claude' }) },
  function () { return agent(shadowingPrompt, { phase: 'Research', label: 'shadowing-tech', agentType: 'claude' }) },
  function () { return agent(hsksPrompt, { phase: 'Research', label: 'hskstory-hiddendragon', agentType: 'claude' }) },
  function () { return agent(immersionPrompt, { phase: 'Research', label: 'video-comics-feasibility', agentType: 'claude' }) },
  function () { return agent(archPrompt, { phase: 'Research', label: 'desktop-architecture', agentType: 'claude' }) },
  function () { return agent(taiwanPrompt, { phase: 'Research', label: 'taiwan-learner-gap', agentType: 'claude' }) },
])
log('Research done: ' + research_results.filter(Boolean).length + '/6 docs written')

// ---------- PHASE 2: SYNTHESIZE ----------
phase('Synthesize')

const visionPrompt = G + '\n\nRead all docs in ' + SA + '/ and the existing ' + DOCS + '/ux-and-features.md + ' + DOCS + '/scaffolding-inventory.md. Write the SUPER-APP VISION — "the Traditional-first Chinese-learning app Wedge wishes he had in Taiwan." Frame everything through that lens, NOT moats.\n\nCover: the one-line vision; the ONE BRAIN (known-word + dictionary + SRS) and how every surface docks onto it; the full FEATURE SET organized by surface (graded readers, AI stories, BYO text, comics/webtoon overlay, video immersion, shadowing) crossed with modes (read / shadow), plus the dictionary depth, the 1234kx status model, the Duolingo-borrowed habit/onboarding (judged for a serious learner), and Traditional-first + easy Simplified toggle + zhuyin + EN/VN gloss. Tag each feature MUST / SHOULD / LATER and which platform body (app / extension). Include a clearly-marked section "Wedge\'s Taiwan pain-points (to fill)" as a placeholder for his lived input. This is an explicit STRAWMAN for Wedge to react to. WRITE to ' + SA + '/VISION.md (start with "# Super-App Vision — the app I wish I had in Taiwan" + the status line). Return a 5-bullet summary + the list of MUST features. Do not return the full document.'

const seqPrompt = G + '\n\nRead ' + SA + '/desktop-architecture-and-one-brain.md, the other research docs in ' + SA + '/, and the existing ' + DOCS + '/scaffolding-inventory.md + ' + DOCS + '/MANAGEMENT-PLAN.md. Write the ARCHITECTURE + BUILD-SEQUENCE doc.\n\nCover: the recommended stack (desktop Electron/Tauri reusing the existing web engine); the shared-brain data model; the two-body split (app + extension) and how they sync; and the BUILD SEQUENCE mapped to the platform order desktop -> iPadOS/iOS -> browser-extension-LAST. Spine-first: build the one brain + the reading pillar first, then dock shadowing -> BYO + 1234kx dictionary -> comics -> video(extension). Each phase: goal, what docks, exit criteria, which tool drives it (Composer for codegen / Grok / the loom for content / Claude for orchestration+QA), and the human checkpoint. Respect the legal constraints (video = extension; comics = BYO + local OCR; no hosting/DRM-bypass). Keep solo-maker-realistic; name what ships and is usable at the END of the first phase. WRITE to ' + SA + '/ARCHITECTURE-and-SEQUENCE.md (start with "# Architecture & Build Sequence — Tsumugu Super-App" + the status line). Return a 5-bullet summary incl. the recommended stack and what ships first. Do not return the full document.'

const synth = await parallel([
  function () { return agent(visionPrompt, { phase: 'Synthesize', label: 'vision', agentType: 'claude' }) },
  function () { return agent(seqPrompt, { phase: 'Synthesize', label: 'architecture-sequence', agentType: 'claude' }) },
])
log('Synthesize done: VISION + architecture/sequence')

// ---------- PHASE 3: CRITIQUE ----------
phase('Critique')
const criticPrompt = G + '\n\nAdversarial pass over docs/super-app/* (read them all in ' + SA + '/, plus the existing ' + DOCS + '/ for continuity). Check: does the super-app stay buildable by a SOLO maker, or has it sprawled into six products? Are the copyright walls (comics/video) correctly contained to client-side overlay + extension-last, with no hosting / no DRM-bypass creep? Is the one-brain unifying thesis REAL or a veneer over a feature pile? Does the build sequence ship something usable EARLY, or defer all value? Is anything valuable from the focused Tsumugu Core thesis being lost (AI-owned content dissolving the walls; the VI bridge; the recaps GREEN-only verdict; content-QA-throughput as the true bottleneck)? Did Duolingo streak-shame sneak in against the attention-respect value? Be specific, cite docs, and prioritize the top fixes before this becomes the build plan.'
const critic = await agent(criticPrompt, { phase: 'Critique', label: 'critic', schema: CRITIC_SCHEMA, agentType: 'claude' })

return {
  researchSummaries: research_results,
  visionSummary: synth[0],
  architectureSummary: synth[1],
  critic: critic,
}
