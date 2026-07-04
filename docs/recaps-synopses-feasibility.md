# Recaps & Synopses — Legal + Practical Feasibility

> **Status:** Decision document, 2026-06-22. Synthesis of the legal research brief and three adversarial verdicts (fair-use four-factors; derivative-work line; market-substitution + platform-takedown). High-Signal Decision Writing: verdict first, honest about residual risk. **This is research, not legal advice.** Before any in-copyright recap rail ships at volume, get a one-time opinion letter from a US copyright attorney. Treat every confidence label as a probability, not a guarantee.

---

## VERDICT

**Ship recaps — but only over content with no living rightsholder. In-copyright recaps do not ship in v1, in any tier, fiction or nonfiction.**

The research brief proposed a three-tier model with a shippable YELLOW middle (brief, abstract recaps of in-copyright films/TV/novels as "defensible fair use"). All three adversarial lenses reject that middle as a shipping posture, and they are right. The honest split is **binary**:

- **GREEN — ships.** AI-original graded readings; original news-fact summaries; recaps of public-domain works, Ming–Qing classics, and openly/CC-licensed sources. No living rightsholder, no colorable notice-sender, no market to substitute for.
- **GREY/RED — does not ship in v1.** Any recap of an in-copyright work. The "defensible fair use" label is overstated: it is *untested commercial grey leaning risky*, and the realistic failure mode is not losing a lawsuit — it is **removal-without-trial at automated, per-title scale** via platform takedowns that never evaluate fair use.

Three corrections drove this downgrade from the brief's optimism:

1. **Warhol v. Goldsmith (2023) — the case the brief never cited — guts the transformative-purpose beam.** *Google Books* won as a *non-substitutive search index*, not as a readable narrative of the same story. A graded recap is a readable narrative you consume end-to-end — closer to substitution than to a search snippet. After *Warhol*, a transformative *purpose* does not save a commercial use that shares the source's consumptive character. The "graded L2-learning purpose adds a transformative layer" argument is weaker than the brief claimed.

2. **Castle Rock's unexploited-derivative-market rule reaches fiction too — the brief misallocated it to nonfiction only.** A rightsholder owns the Chinese-language graded study-summary market it "would generally develop or license" even if it never enters it. getAbstract licensing 600+ publishers proves that market exists. This loses factor four for *fiction* synopses, not just Blinkist-style nonfiction.

3. **The operative event is a takedown notice, not a lawsuit — so "fight on US fair-use ground" answers the wrong question.** GitHub, Cloudflare, App Store, Google Play, Visa/PayPal, and Google Ads all remove on notice and never evaluate fair use. A solo maker's only restoration path is a counter-notice that starts a 14-business-day clock to a federal suit — which a solo maker rationally never files. Choosing a US host to *win a trial* is irrelevant when the content gets pulled before any trial. (Offshore "DMCA-ignored" hosting is worse: it forfeits mainstream payment rails and brands the product piracy-adjacent.)

**Net:** the GREEN corpus is genuinely safe and is the entire v1 recap rail. In-copyright recaps are deferred behind a licensing track or a lawyer's opinion letter, not shipped as YELLOW.

---

## BRIGHT LINES (never cross — any one converts GREEN to infringing)

1. **Never reproduce expression.** No quoted dialogue, no translated signature lines, no close paraphrase of distinctive passages — **in any language**. Cross-language does not launder a quote. (*Twin Peaks*, *RDR Books*.)

2. **Never track the plot beat-for-beat.** Preserving the source's *selection and sequence of specific incidents* in condensed form is a §101 abridgment/condensation — an enumerated §106(2) derivative right that needs **zero verbatim text** to infringe. (*Castle Rock* "comprehensive non-literal similarity"; *Litchfield*.) An AI summarizer's *default output* is exactly this. The bright line is abstraction altitude, not wording.

3. **Never substitute for the market — the original's or its summary market.** If a reader can use the recap *instead of* the work, or instead of an official study/summary edition, factor four is lost. A graded reader is read end-to-end as a standalone text — structurally closer to substitution than a reference guide is. (*Twin Peaks* "substitute for viewing"; *Castle Rock* unexploited-market.)

4. **Never borrow the original's distinctive language or use its titles/marks as branding.** Nominative use only — name the work solely to identify what is summarized. No logos, stylized marks, poster art, or any implication of authorization. Detailed depiction of *sufficiently delineated* characters (Holmes/Bond type) is a copyright risk, not merely trademark. (*Twin Peaks* trade-dress; character-delineation doctrine.)

5. **Never recap a title whose rightsholder sells (or plausibly would license) an official Chinese-language study/summary edition.** That title is off the list permanently — it is the live *Castle Rock* / *RDR-Books-vs-Rowling's-own-guides* trigger.

---

## THE SAFE RECIPE — authoring a graded Chinese recap that stays transformative

Applies to the GREEN corpus (public-domain / classics / openly-licensed / news facts). The same discipline is the *harm-reduction floor* if an in-copyright title is ever cleared later — it is necessary, never sufficient.

**1. Idea-level summary only (abstraction ceiling).** Premise, broad arc, themes — the top of the *Nichols* abstractions ladder. No scene inventory, no episode-by-episode recounting, no preserved sequence of specific incidents. Operational test: *Wikipedia's plot-section standard* — "an overview to give readers general understanding rather than a point-by-point plot description."

**2. Original Chinese expression, generated fresh.** Write our own Chinese sentences about the *idea*. Never translate or paraphrase the source's prose. There is nothing protectable being transported only when the altitude stays high — descend, and original wording still infringes via non-literal similarity.

**3. Educational framing + attribution, made visible on the page.** Graded comprehensible input, vocabulary scaffolding, the Han-Viet cognate bridge — the language-learning function shown explicitly. Plus a prominent **"unofficial — not affiliated with or endorsed by [rightsholder]"** disclaimer and nominative-use title handling. (This is the transformative hook; after *Warhol* it is necessary but no longer self-sufficient — pair it with non-substitution.)

**4. Hard length and coverage limits.** A few hundred Chinese characters, capped relative to source length. No chapter-by-chapter, no per-episode coverage. The cap is the single most important *Twin Peaks* / §101-abridgment safeguard.

**5. The could-this-replace-the-original test (the gate question).** Before publishing, ask: *Could a reader use this instead of experiencing the work — or instead of buying an official study summary?* If yes on either, it fails. A novel teaser that makes you want to read the book passes; a graded retelling that delivers the story (fiction) or the book's actual takeaways (nonfiction) fails.

**6. Enforce all of the above in an automated QA gate, not by trusting the model.** LLMs optimize for *thorough* summaries — the exact *Twin Peaks* / §101-abridgment failure mode. The legal safety lives in the pipeline. **Reuse the `scripts/example_checks.py` gating discipline from tsumugu-ed** (`/Users/n1/Projects/tsumugu-ed/scripts/example_checks.py`): add a recap gate enforcing (a) length cap vs source, (b) an abstraction-altitude / scene-inventory check, (c) expression-overlap detection against any available source text, and (d) a no-preserved-incident-sequence check. Fail-closed.

---

## CONTENT-SAFETY RANKING (safest → riskiest), with per-tier constraints

| Tier | Content | Status | Constraints |
|---|---|---|---|
| **1. AI-original graded readings** | Original Chinese stories written to an HSK/TOCFL band | **GREEN — safest** | None beyond ordinary originality. The spine of the product. |
| **2. Original news-fact summaries** | Graded Chinese summaries of the *facts* in a news article | **GREEN** | Facts only (uncopyrightable). **No verbatim ledes** (*Meltwater*'s "heart of the work" loss). No marketing as a news substitute. Recap hours/days later, not real-time (avoids hot-news / *INS*-*NBA v. Motorola*). |
| **3. Public-domain & Ming–Qing classics recaps** | Recaps of out-of-copyright fiction/works | **GREEN** | No living rightsholder → no notice-sender, no market substitution. Apply the Safe Recipe for hygiene. Safest seed corpus for the recap rail. |
| **4. Film / TV recaps (in-copyright)** | Plot synopses of in-copyright films/shows | **GREY/RED — does NOT ship v1** | *Twin Peaks* (detailed synopsis = abridgment + "substitute for viewing"); *Castle Rock* (rightsholder's licensable study-summary market, even unexploited). Title-keyed content is what automated rights-monitoring scrapers match. Defer; license or opinion-letter first. |
| **5. Nonfiction book summaries** | Blinkist-style takeaway summaries | **RED — does NOT ship** | Highest factor-four risk: delivers the book's actual *value*; substitutes for the buy *and* the licensed-summary market (getAbstract licenses; Blinkist is unlitigated grey, not a safe harbor). Only via licensing (getAbstract model) or public-domain nonfiction. |
| **6. Fiction plot synopses (in-copyright)** | Detailed plot retellings of in-copyright novels | **RED — does NOT ship** | The §101 translation + condensation stack at its strongest; cross-language is *aggravating*, not neutral. Highest combined copyright + takedown exposure. Defer indefinitely absent license. |

**On cross-language:** the brief called it "roughly neutral" in the US. Corrected to **neutral only at genuine idea-level abstraction; mildly aggravating otherwise.** A cross-language *condensed retelling of specific incidents* stacks two separately enumerated derivative rights — translation **and** abridgment/condensation (§101) — neither requiring verbatim copying. With *Warhol* weakening the transformative defense, cross-language does not help a detailed recap.

---

## JURISDICTION & PLATFORM REALITY

**United States — most favorable, but the win is at trial, not at takedown.** Has fair use (§107) and the idea/expression firewall (*Nichols*). But *Warhol* (2023) narrowed the transformative defense for consumptive uses, and **the practical event is a DMCA notice, not a suit.** US host = full takedown exposure across every chokepoint (GitHub, Cloudflare, App Store, Google Play, payment processors, ad networks), all of which remove on notice and never evaluate fair use.

**Vietnam — least favorable for the moat rail.** IP Law Art. 14 (as amended by Law 07/2022/QH15, in force 2023-01-01) **enumerates "translation from one language into another" and adaptation as derivative rights**, and protects a derivative work only if it "do[es] not prejudice the copyright of the work used." **No broad US-style fair-use defense** — only narrow enumerated exceptions. The transformative argument that carries the US analysis is far weaker here. This bites precisely where the Vietnamese-rail moat would tempt us to recap foreign works in Chinese.

**EU / Germany — genuinely unsettled (flag, do not resolve).** The BGH *Axel Springer v. Eyeo* ruling (2025-07-31) revived the theory that in-memory DOM modification can be a "reproduction." This is *primarily* a risk for the **client-side bring-your-own-text overlay**, secondarily a signal that the EU finds reproduction where US law would not. The EU's narrow InfoSoc exceptions + DSM TDM carve-outs are a weaker shield than US fair use. The EU position on both the overlay and the recap argument is open.

**Server / entity location — real protection is content choice, not geography.** A US host + US entity is the right baseline (litigate on fair-use ground if it ever comes to that; avoids importing Vietnam Art. 14 with no fair-use backstop). But it does **not** reduce takedown exposure — that is governed by *what content you publish*, not where the server sits. Offshore "DMCA-ignored" hosting is a trap: it forfeits mainstream payment rails and reputational credibility for no real legal gain. **Conclusion: US host + US entity, and the GREEN-only content choice is what actually keeps the lights on.**

---

## RECOMMENDATION — v1 content mix

Ship the GREEN corpus only. It has no standing notice-sender and survives all three adversarial lenses:

1. **AI-original graded readings** — the spine; unbounded volume; zero copyright exposure.
2. **Original news-fact summaries** — facts only, no verbatim ledes, no substitute-marketing, not real-time.
3. **Public-domain + Ming–Qing classics recaps** — the safest recap seed corpus; aligns with the existing library posture.

Apply the Safe Recipe and the automated QA gate to (2) and (3) as hygiene, not as a license to climb tiers.

**Defer entirely from v1:** all in-copyright film/TV recaps, nonfiction book summaries, and fiction plot synopses. Revisit only via (a) a getAbstract-style **licensing track** for high-value titles (a later B2B/monetization lane — money specifics stay in the private note), or (b) a US copyright **opinion letter optimized for takedown risk, not just litigation-win odds**, that explicitly reckons with *Warhol v. Goldsmith*.

**Never title or market any reading as "summary/recap of [Title]."** Title-keyed content is what automated rights-monitoring scrapers match and what makes the *Castle Rock* substitution argument concrete — even for transformative content over arguably-clear works.

---

## OPEN QUESTIONS (flagged, deliberately not resolved)

- Smallest shippable recap v1 is the GREEN corpus above — confirm against product priorities.
- Whether the recap rail's posture should differ by language rail (EN-rail under US fair use vs VI-rail potentially read under VN law) — interacts with the open "does EN fund or dilute VI" question.
- Whether to stand up a getAbstract-style licensing track for high-value in-copyright titles as a later monetization/B2B lane.
- The in-browser comic / BYO-overlay copyright posture (the BGH DOM theory) is a **separate** analysis — out of scope here; do not conflate with recaps.
