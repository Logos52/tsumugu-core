export const meta = {
  name: 'author-companion-b2b3',
  description: 'Author/repair ACCC companion readings for Book 2 (7 lessons) + Book 3 (12 lessons) at textbook-scaled sizes, self-checked against the coverage+floor gate, critic-verified.',
  phases: [
    { title: 'Author', detail: 'one Sonnet agent per lesson: write 3 articles, self-check the gate, stage draft' },
    { title: 'Critic', detail: 'fresh Sonnet agent: copyright / bare-vocab / distinct-scenes / naturalness / gate re-check' },
    { title: 'Repair', detail: 'fix only lessons the critic flagged, re-check the gate' },
    { title: 'SweepCritic', detail: 'critic-verify the 5 already-passing B2 drafts from the prior session' },
  ],
}

export const REPO = '/Users/n1/Projects/tsumugu-core'

export const LESSONS = [
  { unit: 'B2L08', floor: 450, mode: 'repair' },
  { unit: 'B2L10', floor: 450, mode: 'repair' },
  { unit: 'B2L04', floor: 450, mode: 'new' },
  { unit: 'B2L06', floor: 450, mode: 'new' },
  { unit: 'B2L13', floor: 450, mode: 'new' },
  { unit: 'B2L14', floor: 450, mode: 'new' },
  { unit: 'B2L15', floor: 450, mode: 'new' },
  ...Array.from({ length: 12 }, (_, i) => ({
    unit: `B3L${String(i + 1).padStart(2, '0')}`, floor: 750, mode: 'new',
  })),
]

export const RULES = `
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
