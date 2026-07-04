# Build contract — Tsumugu Core reader mockup (one per design direction)

You are building ONE clickable HTML mockup of the **Tsumugu Core** reader for a specific design direction. It will be viewed as a card in **Claude Design** and used by Wedge to pick a LAYOUT and a default COLOR TEMPLATE. Color templates must be user-switchable. Make it real, polished, and unmistakably its own thing — paid-grade, "a thing worth reading for hours," not a templated default.

## Output
- A SINGLE self-contained `.html` file at the path you are told (inline `<style>` + `<script>`, no build step, opens by double-click).
- **The VERY FIRST LINE must be exactly:** `<!-- @dsCard group="Tsumugu Core · Reader" -->` (Claude Design indexes cards from this marker).
- May `<link>` Google Fonts for the display/serif face named in your spec. For the Chinese reading face, link **LXGW WenKai TC** from a CDN, e.g. `https://cdn.jsdelivr.net/npm/lxgw-wenkai-tc-webfont@latest/style.css` (family `LXGW WenKai TC`), and ALWAYS provide a graceful CJK fallback stack: `"LXGW WenKai TC", "Songti TC", "Noto Serif TC", "PingFang TC", serif`. Must look right even if a webfont fails.

## Product context
- Two scaffolding **rails** over one shared Chinese stream: **VI rail** (ruby = Hán-Việt, gloss in Vietnamese, + the cognate **bridge** = the moat) and **EN rail** (ruby = pinyin, gloss in English, NO bridge). A **rail switcher** = "English learner ⇄ Vietnamese learner".
- Independent toggles (the dual-rail substrate, proven in production): **script** 繁/简, **reading** Hán-Việt / Pinyin / Zhuyin, **gloss** EN / VI. Implement them as live toggles that re-render ruby + gloss.
- Tap-down: a word's card links OUT to the separate `tsumugu-ed` dictionary (just show the affordance `字 →` / "open full entry →"; no real URL needed in the mockup).
- Brand: a violet stitched-knot ("tsumugu" 紡ぐ = spin/weave thread). Treat violet per your spec (most directions: reserve violet for brand + the bridge + the "known" confirm — never a status color, never a fill behind prose).

## Form factor — DESKTOP-FIRST (decided)
- Design for a wide viewport (~1280–1440). A centered reading column (~640–760px measure) inside calmer chrome; a top bar, and optionally a slim left or right rail per your direction. Must still collapse gracefully under ~720px (responsive), but optimize the wide layout.

## Required surface (use the REAL content in `specs/_content.json` — no lorem)
1. **Header / chrome:** brand mark; rail switcher (EN learner ⇄ VI learner; default = VI so the moat shows); the three axis toggles (script/reading/gloss); a **light/dark** toggle; and a **palette switcher** offering 3–4 named color templates for THIS layout (your native palette first as default). All functional.
2. **Reading header:** `title_zh` + romanized title + a band chip (`B1 · TOCFL 3`), an ACCC-binding chip (`當代中文課程 · B4 L3`), `nguyên tác / AI-original`, and `N từ mới / N new`.
3. **The passage:** render `sentences` token-by-token. Ruby ABOVE each word = Hán-Việt on VI rail, pinyin on EN rail (zhuyin if reading=zhuyin). Status shown as **underline only** (`new`, `learning`); `known` = no mark; `nw:true` = a subtle "new target" highlight. Generous CJK line-height (~2.2–2.5) so ruby has air. Punctuation tokens (`st:"punct"`) render plain, no ruby/underline, not tappable.
4. **The bridge card (the moat) — clicking 望 opens it.** Headword glyph + Hán-Việt reading (hero) + pinyin + POS + gloss, then the bridge block: eyebrow `◆ Bạn đã biết âm này rồi · you already know this morpheme`, the cognate chips from `bridge.cognates` (希望 hy vọng · 失望 thất vọng · 願望 nguyện vọng) with the **shared 望/vọng emphasized (bold) and the other syllable faint** in each, then the closing line, then actions `[+ Thêm thẻ] [✓ Đã biết] [字 →]`. Card style = bottom-sheet or anchored side-popover per your spec. Apply your direction's signature motion (e.g. Silk-Seam grafts the violet "stitch-pull" draw-on under the shared morpheme over ~240ms).
   - **On the EN rail**, replace the bridge block with a component / phonetic-series note (see `bridge.en_rail_note`) — never the "you already know this" claim. The bridge's absence on EN is intentional.
5. **Other words:** clicking any non-punct word opens a lighter version of the card (reading + gloss + the same actions + `字 →`), no bridge block.

## Color templates (the user-switchable axis Wedge asked for)
- Implement palettes as CSS custom properties swapped via attributes on `<html>` (e.g. `data-palette="..."` and `data-theme="light|dark"`), the proven two-layer pattern: a RAW palette layer feeding SEMANTIC tokens, so a swap is one attribute change. Light/dark is orthogonal to palette.
- Ship your spec's native palette as the default plus **2–3 alternates that suit this layout** (give them evocative names). Read exact hex (light AND dark) from your spec JSON.

## Fidelity
- Read your assigned spec JSON for exact palette hex, type pairing, mood, the bridge-card treatment, calm-reading-surface behavior, status coloring, motion, and how it diverges from the current dark-navy reader + Paper & Ink dictionary. Honor it precisely; the four mockups must look like four genuinely different products.
- Keep accessibility sane (contrast, focus states, keyboard: Esc closes the card).

Return ONLY a one-line summary of what you built (the file is the deliverable).
