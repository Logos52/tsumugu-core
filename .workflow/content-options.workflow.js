export const meta = {
  name: 'tsumugu-content-options',
  description: 'Generate illustrative sample readings (registers x levels, Traditional/Taiwan) + content/import/audio OPTIONS for Wedge to react to. Nothing here is a plan.',
  phases: [
    { title: 'Options', detail: '5 sample readings + content menu + BYO/audio options (reusing existing audio code)' },
  ],
}

const ROOT = '/Users/n1/Projects/tsumugu-core/docs'
const SA = ROOT + '/super-app'
const SAMP = SA + '/content-samples'

const G = [
  '# Tsumugu super-app — focused "content options + samples" run (2026-06-22)',
  '',
  'FRAMING: everything produced here is OPTIONS / IDEAS / illustrative SAMPLES for Wedge to react to — NOT decisions, NOT a plan, nothing adopted. Wedge does not yet know what content would work and asked for ideas + samples to react to. Do not write MUSTs, "the killer feature", or design mandates.',
  '',
  'LOCKED FOCUS (Wedge set this, the only thing settled): build first toward (1) generate-and-read content at the learner\'s level, (2) read the learner\'s own imported text (BYO), (3) sentence-segmented audio narration with Audacity-style looping. Video/comics study = LATER.',
  '',
  'PRODUCT CONTEXT: "the Chinese-learning app Wedge wished he had learning Traditional Chinese in Taiwan." TRADITIONAL (繁體, Taiwan usage) is the default; Simplified is an easy toggle; EN + VN gloss + pinyin/zhuyin reading aids already exist. The 2,662-entry character dictionary sits underneath. ADAPTIVE VOCAB TARGETING = one mechanism, three front doors (a textbook + chapter, any word list / known-words, or just the learner\'s TOCFL/HSK level) — all resolve to "a target vocabulary set + a few controlled new words."',
  '',
  'AUDIO: every reading gets sentence-segmented narration; tap a sentence (or set A-B points) to loop it (Audacity-style) + speed control. Wedge already built something like this in the Tsumugu site — REUSE / extend it, do not redo.',
  '',
  'TAIWAN REGISTER for samples: Traditional characters only; Taiwan-Mandarin lexis (捷運, 悠遊卡, 計程車, 超商/小七, 早餐店, 自助餐, 手搖, 夜市); authentic register per type (forum = colloquial internet voice with particles 啦/喔/欸/超/有夠/也太; dialogue = natural turn-taking). Common vocabulary at the target level; avoid rare/literary words.',
  '',
  'VOICE: declarative, measured, no "not X but Y" tic. Private working repo — keep figures.',
  '',
  'SOURCE: existing docs in /Users/n1/Projects/tsumugu-core/docs/ (esp. content-generation.md and super-app/traditional-taiwan-learner-gap.md) ; engine /Users/n1/Projects/tsumugu/ ; dictionary /Users/n1/Projects/tsumugu-ed/ .',
].join('\n')

function sampleFmt(extra) {
  return ' Write the file as: an H1 title + the line "Status: ILLUSTRATIVE SAMPLE — an option to react to, not final/QA-passed content, 2026-06-22". Then: (1) the reading in TRADITIONAL characters as a NUMBERED list of sentences; (2) under each sentence, a pinyin line AND a zhuyin (注音) line + a one-line English gloss; (3) a "Target level" note and a short "key / newer words" glossary (word — reading — gloss); (4) one line on the register and why a Taiwan learner would want it. Keep roughly 120-180 Chinese characters total, natural and authentic. ' + (extra || '') + ' Return a 2-line summary (what register/level you wrote). Do not return the full document.'
}

const samples = [
  { label: 'sample:forum', file: SAMP + '/01-dcard-forum.md',
    body: 'Generate an original Dcard/forum-style post (the "Dcard feeling"): a lighthearted, slightly dramatic gripe — e.g. a dorm roommate who never washes the dishes, or a confusing text from a crush. Colloquial Taiwan internet register (啦/喔/欸/超/有夠/zzz). Target TOCFL 3 (~B1).' + sampleFmt('Make it feel like a real Dcard post, including a title line and a relatable hook.') },
  { label: 'sample:story', file: SAMP + '/02-slice-of-life-story.md',
    body: 'Generate an original graded slice-of-life short story: a student\'s first evening at a Taiwan night market (夜市) — the smells, picking food, a small moment. Warm, simple narrative. Target TOCFL 2 (~A2-B1).' + sampleFmt('End on a small satisfying beat so it reads like a real (short) story, not a vocabulary drill.') },
  { label: 'sample:howto', file: SAMP + '/03-everyday-howto.md',
    body: 'Generate an original everyday-Taiwan how-to / nonfiction reading: how to take the Taipei MRT (捷運) — buying/topping up an 悠遊卡, finding the right line, basic etiquette. Practical, friendly. Target TOCFL 2 (~A2).' + sampleFmt('It should teach something a real newcomer to Taipei needs.') },
  { label: 'sample:dialogue', file: SAMP + '/04-everyday-dialogue.md',
    body: 'Generate an original everyday dialogue: two friends at a 早餐店 deciding what to order (蛋餅, 鐵板麵, 大冰奶, etc.) and chatting. Natural turn-taking, speaker labels. Target TOCFL 2 (~A2). This pairs with the per-sentence audio loop and later shadowing.' + sampleFmt('Keep it natural and a little funny.') },
  { label: 'sample:laddered', file: SAMP + '/05-laddered-same-topic.md',
    body: 'Demonstrate DIFFICULTY LADDERING: write the SAME short topic — customizing a 手搖 (bubble-tea) order (sugar/ice level, toppings) — TWICE: version A at TOCFL 2 (~A2, simpler), version B at TOCFL 3 (~B1, richer vocab + longer sentences). Show how the same content stretches a learner.' + sampleFmt('Clearly label "Version A (TOCFL 2)" and "Version B (TOCFL 3)"; give the per-sentence pinyin/zhuyin/gloss for BOTH.') },
]

const contentMenuPrompt = G + '\n\nRead ' + ROOT + '/content-generation.md and ' + SA + '/traditional-taiwan-learner-gap.md first. Produce a CONTENT OPTIONS MENU for Wedge to choose from — expand the idea space for "read a lot, at my level, in Traditional, with audio." Cover, as clearly-labeled OPTIONS (each with what it is, why a Taiwan learner would want it, and any catch): content TYPES/registers (Dcard/forum voice, slice-of-life + serialized fiction, everyday-Taiwan how-to/nonfiction, dialogues, news-style, topic-on-demand dial); DELIVERY shapes (a library to browse, an interest-based endless feed, a daily drop, serials with hooks, difficulty-laddered re-reads); the ADAPTIVE VOCAB front doors (textbook+chapter / any word list or known-words / just level) and how each feels to use; and the TWO CLEAN ways to get the "study from Dcard" experience (BYO paste of a real thread = the user\'s own use; vs the engine generating original content in that voice — never scraping/hosting). Keep it a menu of options, not a recommendation or a plan. WRITE to ' + SA + '/content-options.md (H1 + "Status: options to react to — not a plan, 2026-06-22"). Return a 5-bullet summary of the option categories. Do not return the full document.'

const byoAudioPrompt = G + '\n\nTASK: produce a BYO-IMPORT + AUDIO options-and-reuse map, building on what Wedge ALREADY BUILT. FIRST READ his existing reader + audio code: explore /Users/n1/Projects/tsumugu/apps/web and /Users/n1/Projects/tsumugu/personal/migaku-style-overlay , and grep the engine for existing audio / sentence-segmentation / loop / playback code (try ripgrep for: audio, loop, sentence, segment, narration, tts, playbackRate, currentTime). Report what already exists to reuse/extend (files + what they do).\n\nThen lay out OPTIONS (not a plan): (A) BYO IMPORT — how reading the user\'s own text works client-side: input formats (paste, .txt, EPUB, a pasted URL\'s text), in-browser sentence segmentation (the existing jieba-wasm), gloss + known-word coloring over it, and the copyright-clean stance (the user supplies the text; nothing stored/redistributed server-side). (B) AUDIO — sentence-segmented narration on every reading; the Audacity-style A-B LOOP UX (tap a sentence to loop, or drag A-B points, repeat-count, speed control) — mapped onto what Wedge already wrote; how generated readings get pre-rendered audio vs imported text getting on-the-fly TTS; and TAIWAN-ACCENT Mandarin TTS options (which engines/voices sound Taiwanese, on-device vs cloud) — cross-ref /Users/n1/Projects/tsumugu/personal/research/zh-tts-options.md if present. Present as options + a reuse map. WRITE to ' + SA + '/byo-and-audio-options.md (H1 + "Status: options + reuse map — not a plan, 2026-06-22"). Return a 5-bullet summary incl. what existing code we can reuse. Do not return the full document.'

phase('Options')
const thunks = samples.map(function (s) {
  return function () { return agent(G + '\n\nTASK (' + s.label + '): ' + s.body + ' WRITE the file to ' + s.file + '.', { phase: 'Options', label: s.label, agentType: 'claude' }) }
})
thunks.push(function () { return agent(contentMenuPrompt, { phase: 'Options', label: 'content-menu', agentType: 'claude' }) })
thunks.push(function () { return agent(byoAudioPrompt, { phase: 'Options', label: 'byo-audio', agentType: 'claude' }) })

const out = await parallel(thunks)
log('Options run done: ' + out.filter(Boolean).length + '/' + thunks.length + ' artifacts')

return {
  sampleSummaries: out.slice(0, samples.length),
  contentMenuSummary: out[samples.length],
  byoAudioSummary: out[samples.length + 1],
}
