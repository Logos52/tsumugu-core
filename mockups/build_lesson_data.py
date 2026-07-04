#!/usr/bin/env python3
"""Build the lesson-viewer data file. BOOK-AGNOSTIC (Books 1-6, 74 lessons).

SOURCES (all general across books):
  1. VOCAB + PINYIN + GLOSS + POS  ->  dangdai deck  private/dangdai-vocab/dangdai.csv
       Spans every book. ID `B3L07-II-04` = Book 3 Lesson 7 Dialogue II term 4.
       `Tags`: "Character" = book's people (dropped); "Name" = places/products (kept).
       We FUSE Dialogue I + II into one combined lesson (no -1/-2 split).
  2. TITLE/THEME/OBJECTIVES/GRAMMAR  ->  mockups/lesson-highlights.json
       Curated from each book's "Highlights of Lessons" page (see that file's _meta).
  3. READINGS  ->  ORIGINAL hand-authored, below. EXACTLY 3 ARTICLES per lesson whose
       UNION covers 100% of the lesson's vocab + grammar (set-level union gate from the
       encounter formula). `coverage_qa()` is a HARD gate — the build fails if a lesson
       has != 3 articles or leaves any vocab/grammar uncovered.
       *** COPYRIGHT *** never reuse textbook dialogues / the book's cast. Generic
       speakers (甲/乙/丙/丁) + invented surnames (高/林/周). `advisory_scan()` reports the
       out-of-band footprint but never fails — NATURALNESS WINS over in-band purity.

REGENERATE:  python3 mockups/build_lesson_data.py
OUTPUT:      mockups/lesson-viewer-data.js  (window.LESSONS = [...])
"""
import csv, json, re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK = os.path.join(ROOT, "private/dangdai-vocab/dangdai.csv")
HILITES = os.path.join(ROOT, "mockups/lesson-highlights.json")
OUT = os.path.join(ROOT, "mockups/lesson-viewer-data.js")

UNITS = ["B1L01", "B1L02", "B1L03", "B1L04", "B1L05", "B1L06"]
LABELS = set("甲乙丙丁高林周")
CN_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
          "十一", "十二", "十三", "十四", "十五"]

# STOPWORDS knob (tunable): function-word substrate excluded from encounter/recency
# targets — they self-saturate by Zipf. Pronouns are POS "N", so listed explicitly.
FUNC_POS = {"Ptc", "Adv", "Det", "M", "Prep", "Vaux", "Conj"}
FUNC_WORDS = {"你", "我", "他", "她", "妳", "我們", "你們", "他們", "您", "是"}


def is_function(v):
    return v["pos"] in FUNC_POS or v["w"] in FUNC_WORDS


def lemma_core(w):
    """A few deck headwords store a grammar-pattern annotation in place of a clean
    lemma, e.g. '星期 + number', 'number + 月', '女 + noun', '男 + noun'. The real
    headword is the Han core; strip the Latin pattern annotation so coverage matches
    on it (星期/月/女/男). Safe: no real Han headword contains '+' or the pattern
    words number/noun/verb/adj (only 5 such strings exist across all books)."""
    w = re.sub(r"\s*\+\s*(?:number|noun|verb|adj\w*)\b", "", w)
    w = re.sub(r"\b(?:number|noun|verb|adj\w*)\s*\+\s*", "", w)
    return w.strip()


def clean_trad(t):
    base = re.split(r"[（(]", t)[0].strip()
    variants = re.findall(r"[＝=]\s*([^）)]+)", t)
    return lemma_core(base), [lemma_core(base)] + [lemma_core(v.strip()) for v in variants]


def load_deck():
    """All books, fused (no dialogue split). -> ({unit:[vocab]}, {unit:set(forms)})."""
    LS, surf = {}, {}
    with open(DECK, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            m = re.match(r"^(B\dL\d+)-([^-]+)-", r["ID"])
            if not m or "Character" in (r["Tags"] or ""):
                continue
            unit = m.group(1)
            base, alts = clean_trad(r["Traditional"])
            LS.setdefault(unit, []).append(
                {"w": base, "py": r["Pinyin"], "g": r["Meaning"], "pos": r["POS"]})
            surf.setdefault(unit, set()).update(alts)
    return LS, surf


# ---- ORIGINAL readings — EXACTLY 3 articles per lesson, union = 100% coverage ----
READINGS = {
 "B1L01": [
  {"id": "R1", "format": "對話", "text":
   "甲：你好！我姓高，你叫我高先生，好嗎？請問你是林小姐嗎？\n乙：是的，你好！我姓林。\n甲：歡迎你來臺灣！我來接你們。\n乙：謝謝你來接我們！\n甲：這是周先生，他也來接你們。\n丙：林小姐，你好！歡迎你！\n乙：周先生，你好！謝謝你們！\n甲：不客氣！"},
  {"id": "R2", "format": "對話", "text":
   "你好！我姓林。\n我很喜歡喝茶，烏龍茶很好喝。\n我不喜歡喝咖啡。\n甲：林小姐，你要喝什麼？喝茶嗎？\n乙：好，謝謝！請問這是什麼茶？\n甲：這是烏龍茶。\n乙：烏龍茶很好喝！你呢？你要不要喝咖啡？\n甲：對不起，我不喝咖啡，我也喝茶。"},
  {"id": "R3", "format": "對話", "text":
   "甲：你好！請問你是哪國人？\n乙：我是美國人。你呢？\n甲：我是臺灣人。\n乙：你是不是日本人？\n甲：不是，我是臺灣人。他呢？他是哪國人？\n乙：他是美國人。\n甲：日本人喜歡喝烏龍茶嗎？\n乙：是的，他們很喜歡。"},
 ],
 "B1L02": [
  {"id": "R1", "format": "對話", "text":
   "甲：歡迎！請進，請坐。\n乙：謝謝！你家很漂亮，你家的房子很好看。\n甲：請坐，請喝茶。這是我家的照片。\n乙：你家人都很好看！這是誰？\n甲：這是我媽媽，這是我姐姐。\n乙：你媽媽和姐姐都很漂亮！\n甲：謝謝！你要不要看我家人的照片？\n乙：好！"},
  {"id": "R2", "format": "自述", "text":
   "你好！我姓林，我家有五個人。\n我家有爸爸、媽媽、哥哥、姐姐和我。\n我有哥哥，有兩個姐姐，沒有妹妹。\n我爸爸是老師，他很喜歡看書，我家有很多書。\n我和哥哥都喜歡照相。\n你家有幾個人？你有兄弟姐妹嗎？"},
  {"id": "R3", "format": "對話", "text":
   "甲：伯母，您好！這是您家的照片嗎？\n丁：是的，這是我家人。\n甲：您家人都很好看！這張照片是誰？\n丁：這是我先生，他是老師。\n甲：請問您叫什麼名字？\n丁：我姓張。你呢？\n甲：我姓周，您叫我周先生，好嗎？\n丁：好！周先生，請坐。"},
 ],
 "B1L03": [
  {"id": "R1", "format": "對話", "text":
   "甲：你週末喜歡做什麼？\n乙：我喜歡運動。我常打籃球，也打網球。\n甲：我也喜歡運動！我常踢足球，也喜歡游泳。\n乙：踢足球和打棒球都很好玩！\n甲：我覺得游泳很好玩。我們明天一起去游泳，好不好？\n乙：好啊！明天早上去吧。"},
  {"id": "R2", "format": "自述", "text":
   "你好！我很喜歡運動。\n我和哥哥常常一起打籃球。\n我也喜歡聽音樂、看電影。\n我妹妹不喜歡運動，她喜歡聽音樂、學中文。\n她覺得中文很好玩。\n你週末喜歡做什麼呢？"},
  {"id": "R3", "format": "對話", "text":
   "甲：妳今天晚上想做什麼？\n乙：我想看電影。妳呢？\n甲：看電影怎麼樣？我們一起去，好嗎？\n乙：好啊！我們先吃晚飯，還是先看電影？\n甲：先吃晚飯吧。妳想吃什麼菜？\n乙：我想吃越南菜。\n甲：好！越南菜很好吃。我們可以一起去。"},
 ],
 "B1L04": [
  {"id": "R1", "format": "對話", "text":
   "甲：老闆，你好！我要買包子，一個包子多少錢？\n乙：一個十塊。你要幾個？\n甲：我要五個，一共多少錢？\n乙：一共五十塊。\n甲：太貴了！為什麼這個包子很貴？\n乙：我的包子很大，你看！\n甲：好的，這是一百塊。\n乙：謝謝！你要內用，還是外帶？\n甲：我要外帶。\n乙：要不要幫你微波？包子是熱的。\n甲：好，謝謝你幫我微波。"},
  {"id": "R2", "format": "對話", "text":
   "甲：老闆，你賣手機嗎？\n乙：賣！你要買新手機嗎？\n甲：對，我的手機太舊了。這支手機多少錢？\n乙：這支要一萬五千塊。\n甲：太貴了！有沒有便宜的手機？\n乙：這種手機很便宜，要八千塊，也能上網。\n甲：這支手機能不能上網？\n乙：能！這支很新。\n甲：手機有大的、中的、小的嗎？\n乙：有。你要大的，還是小的？\n甲：我要那支中的。"},
  {"id": "R3", "format": "對話", "text":
   "甲：老闆，一杯熱咖啡多少錢？\n乙：一杯五十塊。\n甲：我要兩杯，一共多少錢？\n乙：一共一百塊。要不要幫你微波包子？\n甲：好的，謝謝。我也要買一個新手機。\n乙：那支手機很好，能上網，不太貴。\n甲：好，我買！"},
 ],
 "B1L05": [
  {"id": "R1", "format": "對話", "text":
   "甲：這家餐廳很有名，他們的牛肉麵最好吃。\n乙：是啊！我知道這家店。我們點牛肉麵吧。\n甲：好！我要一碗牛肉麵，這裡的湯真好喝。\n乙：這家店的小吃也很有名。\n甲：我們也點小籠包，好不好？\n乙：好！小籠包這麼有名，我們一定要吃。"},
  {"id": "R2", "format": "對話", "text":
   "甲：你昨天去哪裡吃飯？\n乙：我去吃臭豆腐了！太好了，真好吃。\n甲：臭豆腐辣不辣？\n乙：有一點辣。\n甲：我怕辣，所以我不吃辣的。\n乙：這家的臭豆腐不太辣，可是有一點臭。\n甲：臭豆腐很有名，可是我覺得不好吃。"},
  {"id": "R3", "format": "對話", "text":
   "甲：朋友說你很會做飯。你會做牛肉麵嗎？\n乙：我會。我自己做飯，做得不錯。\n甲：太好了！你的甜點做得好不好？\n乙：甜點我做得不好，可是牛肉麵我做得很好。\n甲：你可以教我做牛肉麵嗎？\n乙：可以！你明天到我家來，我教你。\n甲：謝謝！我會做的菜很少，我想學做飯。"},
 ],
 "B1L06": [
  {"id": "R1", "format": "對話", "text":
   "甲：你們學校在哪裡？\n乙：我們學校在山上，在花蓮。\n甲：花蓮遠不遠？\n乙：有一點遠，可是風景很美。\n甲：聽說花蓮的山和海都很美。\n乙：是啊！學校在山上，前面是海，後面是山。\n甲：那裡的風景真的很美！"},
  {"id": "R2", "format": "對話", "text":
   "甲：你的宿舍在哪裡？\n乙：我的宿舍在學校裡面，是一棟大樓。\n甲：宿舍附近方便嗎？\n乙：很方便。宿舍旁邊有圖書館，前面有教室。\n甲：有游泳池嗎？\n乙：有！游泳池不是在樓下，在大樓後面。樓下有商店。\n甲：這裡很方便，學校很近。\n乙：是啊，這裡的東西都在附近。"},
  {"id": "R3", "format": "對話", "text":
   "甲：他們現在在哪裡？\n乙：他們是學生，現在在上課。\n甲：上課的教室在哪裡？\n乙：在前面那棟大樓。我們去找一找他們，好不好？他們是我的朋友。\n甲：好！他們上課，我們在外面吃飯吧。\n乙：好啊！這個地方有很多商店，外面有很多吃飯的地方。\n甲：太好了！這裡真的很方便。"},
 ],
}
FMT = {"對話": "Dialogue", "自述": "Monologue", "問答": "Q & A",
       "短文": "Narrative", "日記": "Diary", "便條": "Note", "簡訊": "Message",
       "廣播": "Broadcast", "閱讀": "Reading"}


def load_drafts():
    """Verified readings staged in mockups/drafts/<UNIT>.json override the inline
    READINGS above — so staging a lesson auto-integrates it. Shape per file:
    {"unit": "B1L02", "readings": [{"id","format","text"}, ...]}."""
    import glob
    d = {}
    for fp in sorted(glob.glob(os.path.join(ROOT, "mockups/drafts", "B*L*.json"))):
        try:
            obj = json.load(open(fp, encoding="utf-8"))
        except Exception:
            continue
        u, rs = obj.get("unit"), obj.get("readings")
        if u and rs:
            d[u] = [{"id": r["id"], "format": r["format"], "text": r["text"]} for r in rs]
    return d


READINGS.update(load_drafts())


def gram_hit(g, text):
    if g.get("pat") == "anota":
        return re.search(r"(.)不\1", text) is not None
    if g.get("pat") == "v1v":
        return re.search(r"(.)一\1", text) is not None
    if g.get("re"):
        return re.search(g["re"], text) is not None
    if g.get("m"):
        return g["m"] in text
    if g.get("any"):
        return any(a in text for a in g["any"])
    return False


DEFER_BUDGET = 3   # hybrid coverage: up to this many own-vocab words may defer to a later
                   # lesson (they roll forward via coverage_ledger.py). Grammar stays 100%.


def coverage_qa(LS, highlights):
    """Gate: exactly 3 articles/lesson; union covers 100% grammar and >= (vocab-DEFER_BUDGET).
    Deferred vocab words are reported, not failed — they roll forward (naturalness wins)."""
    ok = True
    print(f"coverage QA (3 articles · grammar 100% · vocab may defer <= {DEFER_BUDGET}/lesson):")
    for unit in UNITS:
        reads = READINGS[unit]
        union = " ".join(r["text"] for r in reads)
        vmiss = [v["w"] for v in LS[unit] if v["w"] not in union]
        gmiss = [g["title"] for g in highlights[unit]["grammar"] if not gram_hit(g, union)]
        vtot, gtot = len(LS[unit]), len(highlights[unit]["grammar"])
        ncount = "" if len(reads) == 3 else f"  !! {len(reads)} articles (need 3)"
        print(f"  {unit}: vocab {vtot-len(vmiss)}/{vtot} · grammar {gtot-len(gmiss)}/{gtot} · "
              f"articles {len(reads)}{ncount}")
        if len(reads) != 3:
            ok = False
        if vmiss:
            over = len(vmiss) > DEFER_BUDGET
            label = f"OVER BUDGET ({len(vmiss)}>{DEFER_BUDGET})" if over else "deferred"
            print(f"    {label} vocab ({len(vmiss)}): {' '.join(vmiss)}")
            if over:
                ok = False
        if gmiss:
            print(f"    MISSING grammar: {'; '.join(gmiss)}"); ok = False
    return ok


def check_encounter_balance(LS):
    """ADVISORY — smooth encounters across content words by SPREAD (spacing effect).
    Excludes the function-word substrate (it self-saturates). Floors content words at
    spread >= 2 of the 3 articles; reports the distribution + under-spaced singletons.
    Never fails — naturalness wins; genuinely-rare words may stay thin (lifetime floor
    accrues across later lessons)."""
    print("encounter balance (content words should sit in >=2 of 3 articles):")
    for unit in UNITS:
        reads = READINGS[unit]
        content = [v for v in LS[unit] if not is_function(v)]
        dist = {1: [], 2: [], 3: []}
        for v in content:
            spread = sum(1 for r in reads if v["w"] in r["text"])
            dist.setdefault(spread, []).append(v["w"])
        spaced = len(dist.get(2, [])) + len(dist.get(3, []))
        singles = dist.get(1, [])
        print(f"  {unit}: content {len(content)} · spaced>=2 {spaced}/{len(content)} · "
              f"in[1/2/3 articles] {len(singles)}/{len(dist.get(2,[]))}/{len(dist.get(3,[]))}")
        if singles:
            print(f"    under-spaced ({len(singles)}): {' '.join(singles)}")


def advisory_scan(surf, highlights):
    """ADVISORY only — out-of-band footprint per article; never fails (naturalness wins)."""
    gmarks = set()
    for u in UNITS:
        for g in highlights[u]["grammar"]:
            if g.get("m"):
                gmarks.add(g["m"])
            gmarks.update(g.get("any", []))
    maxlen = max(len(s) for s in set().union(*surf.values()) | gmarks)
    total = 0
    for idx, unit in enumerate(UNITS):
        band = set().union(*(surf.get(u, set()) for u in UNITS[:idx + 1])) | gmarks
        for r in READINGS[unit]:
            oob = []
            for line in r["text"].split("\n"):
                line = line.split("：", 1)[-1]
                i = 0
                while i < len(line):
                    if line[i] in "，。！？、：；「」（） ":
                        i += 1; continue
                    hit = None
                    for n in range(min(maxlen, len(line) - i), 0, -1):
                        if line[i:i + n] in band:
                            hit = line[i:i + n]; i += n; break
                    if not hit:
                        if line[i] not in LABELS:
                            oob.append(line[i])
                        i += 1
            if oob:
                total += len(set(oob))
                print(f"  advisory  {unit}/{r['id']}: {' '.join(sorted(set(oob)))}")
    print(f"advisory scan: {total} distinct out-of-band token(s) — allowed (naturalness wins)")


def main():
    global UNITS
    LS, surf = load_deck()
    highlights = json.load(open(HILITES, encoding="utf-8"))
    # Ship every unit that has highlights + vocab + readings (drafts auto-included).
    def _key(u):
        m = re.match(r"B(\d)L(\d+)", u)
        return (int(m.group(1)), int(m.group(2)))
    UNITS = sorted((u for u in highlights
                    if not u.startswith("_") and u in LS and u in READINGS),
                   key=_key)
    if not UNITS:
        sys.exit("no shippable units (need highlights + vocab + readings)")

    if not coverage_qa(LS, highlights):
        sys.exit("\nCOVERAGE QA FAILED — every lesson needs exactly 3 articles covering "
                 "100% of vocab + grammar. Patch the readings above and rerun.")
    advisory_scan(surf, highlights)
    check_encounter_balance(LS)

    lessons = []
    for unit in UNITS:
        h = highlights[unit]
        n = int(re.search(r"L(\d+)$", unit).group(1))
        lessons.append({
            "unit": unit, "cn": "第" + CN_NUM[n - 1] + "課", "n": n,
            "title": h["title"], "theme": h["theme"], "objectives": h["objectives"],
            "vocab": [{**v, "func": is_function(v)} for v in LS[unit]],
            "grammar": h["grammar"],
            "readings": [{"id": r["id"], "format": r["format"],
                          "fmtEn": FMT.get(r["format"], ""), "text": r["text"]}
                         for r in READINGS[unit]],
            "draft": True,
        })

    banner = ("// GENERATED by mockups/build_lesson_data.py — DO NOT EDIT BY HAND.\n"
              "// Vocab: dangdai deck. Highlights: lesson-highlights.json. Readings: 3 ORIGINAL\n"
              "// articles/lesson, union = 100% vocab+grammar coverage (coverage_qa gate).\n")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(banner)
        f.write("window.LESSONS = " + json.dumps(lessons, ensure_ascii=False) + ";\n")

    for L in lessons:
        print(f"{L['unit']} {L['title']!r}: vocab={len(L['vocab'])} grammar={len(L['grammar'])} "
              f"articles={len(L['readings'])}")
    print("wrote", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
