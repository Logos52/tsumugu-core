#!/usr/bin/env python3
"""
check_reading.py — QA checker for Tsumugu Core graded readings.

Self-contained: standard library only. It segments each reading by greedy
longest-match against the lesson's own known vocabulary (cumulative through the
target atomic unit), so there is NO jieba dependency and in-band checking is
exact — a token either is a word the learner has met, a licensed proper-noun
character, or an out-of-band leak.

What it checks
--------------
HARD (non-zero exit on failure):
  * In-band coverage   — every content token is in (cumulative vocab ∪ current new).
  * Current-new union  — every new item of the unit appears in ≥1 reading of the set.

ADVISORY (reported, never fails the run — naturalness wins):
  * Recycle            — each touched current-new CONTENT word recurs ≥ recycle_min
                         (recycle_min scales with unit size: 2 if <30 new items else 3).
  * Multiplicity       — each current-new content word appears in ≥2 readings of the set.
  * Regression buckets — content-token proportion by age: current ≥40%, L-1 ≥20%,
                         L-2 ≥10%, L-3 ≥5%, ... (geometric, decay 0.5).
  * Encounter ledger   — lifetime touches per content word across --history + this set,
                         flagged below the floor (default 8). Proper nouns exempt.
                         Rare words allowed to sit below the floor (naturalness override).
  * Light naturalness  — sentence count, distinct openers, single-word repetition.
  * Grammar markers     — presence counts for the unit's grammar points (optional).

Usage
-----
  python3 check_reading.py --set set.json
  python3 check_reading.py --set b1l02-1.json --history b1l01-1.json b1l01-2.json
  python3 check_reading.py --set set.json --json     # machine-readable, for agents

set.json
--------
{
  "unit": "b1l02-1",
  "grammar": ["的", "有", "都", "張", "A-not-A"],   # optional
  "readings": [
    {"id": "R1", "format": "對話", "text": "..."},
    ...
  ]
}

The vocab source defaults to ../../../private/dangdai-vocab/dangdai.csv relative
to this file; override with --csv.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict

# ── Tunable policy (documented; edit to taste) ───────────────────────────────
P_CURRENT = 0.40            # required content-token proportion from the current unit
DECAY = 0.5                 # geometric decay for review buckets
MAX_REGRESSION_DEPTH = 5    # don't enforce review proportions beyond this age
ENCOUNTER_FLOOR = 8         # advisory lifetime-touch target per content word
RECYCLE_SIZE_CUTOFF = 30    # unit new-item count below which recycle relaxes
RECYCLE_SMALL = 2
RECYCLE_LARGE = 3
MULTIPLICITY_MIN = 2        # readings each current content word should appear in

# Function-word substrate excluded from the "content token" denominator used for
# the regression proportions. Conservative + inspectable — these are the morphemes
# that fill any Chinese sentence regardless of lesson, so counting them would drown
# the recency signal. Everything else (是有要喝茶房子…) is content.
STOPWORDS = set("你 我 他 她 它 我們 你們 他們 的 了 嗎 呢 吧 啊 喔 不 很 都 也 常 在 是 這 那".split())

PUNCT = set("，。！？、；：「」『』（）()《》〈〉…—～~ 　\t\n\r:!?,.")
SENT_END = "。！？!?"
NAME_TAG_SUBSTR = "Name"    # Tags column substring marking proper nouns


# ── Vocabulary model ─────────────────────────────────────────────────────────
def atomic_unit(vid: str):
    """B1L01-II-15 -> 'b1l01-2'. Returns None if the id doesn't parse."""
    m = re.match(r"^B(\d+)L(\d+)-([IVX]+)?", vid)
    if not m:
        return None
    book, lesson = int(m.group(1)), int(m.group(2))
    part = {"I": 1, "II": 2, "III": 3}.get(m.group(3) or "I", 1)
    return f"b{book}l{lesson:02d}-{part}"


def unit_key(u: str):
    m = re.match(r"^b(\d+)l(\d+)-(\d+)$", u)
    return (int(m.group(1)), int(m.group(2)), int(m.group(3)))


def normalize_trad(raw: str):
    """'臺灣（＝台灣）' -> ('臺灣', ['台灣']); strips other parentheticals."""
    raw = raw.strip()
    m = re.match(r"^(.*?)（＝(.*?)）$", raw)
    if m:
        return m.group(1).strip(), [m.group(2).strip()]
    return re.sub(r"（.*?）", "", raw).strip(), []


def load_model(csv_path: str):
    word_intro: dict[str, str] = {}     # trad -> earliest atomic unit
    word_is_name: dict[str, bool] = {}
    unit_new: dict[str, list] = defaultdict(list)
    name_chars: set[str] = set()

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)  # header
        for row in reader:
            if len(row) < 9:
                row = row + [""] * (9 - len(row))
            vid, trad_raw, _simp, _py, _pos, _mean, _audio, _var, tags = row[:9]
            unit = atomic_unit(vid)
            if not unit:
                continue
            primary, alts = normalize_trad(trad_raw)
            is_name = NAME_TAG_SUBSTR in (tags or "")
            for w in [primary, *alts]:
                if not w:
                    continue
                if w not in word_intro or unit_key(unit) < unit_key(word_intro[w]):
                    word_intro[w] = unit
                    word_is_name[w] = is_name
            unit_new[unit].append(primary)
            if is_name:
                name_chars.update(ch for ch in primary if ch not in PUNCT)

    units_ordered = sorted(unit_new.keys(), key=unit_key)
    unit_index = {u: i for i, u in enumerate(units_ordered)}
    return {
        "word_intro": word_intro,
        "word_is_name": word_is_name,
        "unit_new": unit_new,
        "units_ordered": units_ordered,
        "unit_index": unit_index,
        "name_chars": name_chars,
    }


def cumulative_words(model, unit: str):
    k = unit_key(unit)
    return {w for w, u in model["word_intro"].items() if unit_key(u) <= k}


# ── Segmentation ─────────────────────────────────────────────────────────────
def strip_label(line: str):
    """Drop a leading speaker label ('王開文：' / 'A:' / '李、陳：') if a colon sits near
    the start of the line. Speaker labels are structural metadata, not prose."""
    for sep in ("：", ":"):
        idx = line.find(sep)
        if 0 <= idx <= 8:
            return line[idx + 1:]
    return line


def segment(text: str, allowed: set, name_chars: set, max_len: int):
    """Return (tokens, sentences). tokens = [(text, kind)] with kind in
    {vocab, name, oov}. sentences = list of token-lists split on 。！？."""
    tokens, sentences, cur = [], [], []
    for raw_line in text.splitlines():
        line = strip_label(raw_line)
        i, n = 0, len(line)
        while i < n:
            ch = line[i]
            if ch in SENT_END:
                if cur:
                    sentences.append(cur)
                    cur = []
                i += 1
                continue
            if ch in PUNCT or ch.isspace():
                i += 1
                continue
            matched = None
            for L in range(min(max_len, n - i), 0, -1):
                cand = line[i:i + L]
                if cand in allowed:
                    matched = cand
                    break
            if matched:
                tok = (matched, "vocab")
                i += len(matched)
            elif ch in name_chars:
                tok = (ch, "name")
                i += 1
            else:
                tok = (ch, "oov")
                i += 1
            tokens.append(tok)
            cur.append(tok)
        # newline does not end a sentence on its own
    if cur:
        sentences.append(cur)
    return tokens, sentences


def is_content(model, word: str):
    """Content word = vocab, not a function-substrate word, not a proper noun."""
    return word not in STOPWORDS and not model["word_is_name"].get(word, False)


# ── Checks ───────────────────────────────────────────────────────────────────
def review_requirements(depth=MAX_REGRESSION_DEPTH):
    req = {0: P_CURRENT}
    for d in range(1, depth + 1):
        req[d] = 0.20 * (DECAY ** (d - 1))
    return req


def check_set(model, unit: str, readings: list, history_texts: list, grammar: list):
    idx = model["unit_index"]
    allowed = cumulative_words(model, unit)
    max_len = max((len(w) for w in allowed), default=1)
    cur_idx = idx[unit]
    current_new = list(dict.fromkeys(model["unit_new"][unit]))  # dedupe, keep order

    per_reading = []
    set_tokens = []
    appears_in = defaultdict(set)          # word -> {reading ids} (vocab tokens)
    set_counts = Counter()                 # word -> total occurrences across the set
    recycle_min = RECYCLE_SMALL if len(current_new) < RECYCLE_SIZE_CUTOFF else RECYCLE_LARGE

    for r in readings:
        toks, sents = segment(r["text"], allowed, model["name_chars"], max_len)
        set_tokens.extend(toks)
        leaks = [t for t, k in toks if k == "oov"]
        vocab = [t for t, k in toks if k == "vocab"]
        counts = Counter(vocab)
        set_counts.update(counts)
        for w in set(vocab):
            appears_in[w].add(r["id"])

        # light naturalness
        openers = [s[0][0] for s in sents if s]
        opener_ratio = (len(set(openers)) / len(openers)) if openers else 1.0
        content_toks = [t for t, k in toks if k == "vocab" and is_content(model, t)]
        top = Counter(content_toks).most_common(1)
        rep_ratio = (top[0][1] / len(content_toks)) if content_toks else 0.0

        per_reading.append({
            "id": r["id"],
            "format": r.get("format", ""),
            "n_tokens": len(toks),
            "leaks": leaks,
            "touched_current": [w for w in current_new if counts.get(w, 0) >= 1],
            "sentences": len(sents),
            "opener_ratio": round(opener_ratio, 2),
            "rep_word": (top[0][0] if top else None),
            "rep_ratio": round(rep_ratio, 2),
        })

    # current-new union coverage (HARD). Proper nouns are exempt (met via speaker labels,
    # not "acquired" vocabulary). A bound morpheme is credited when it is met inside a
    # known longer compound (哪 via 哪國) — decomposition credit, as in the CI scorer.
    touched_vocab = {t for t, k in set_tokens if k == "vocab"}
    content_new = [w for w in current_new if not model["word_is_name"].get(w, False)]

    def covered_via(w):
        if w in touched_vocab:
            return "direct"
        for tv in touched_vocab:
            if w != tv and w in tv:
                return f"in {tv}"
        return None

    coverage_via = {w: covered_via(w) for w in content_new}
    covered = [w for w in content_new if coverage_via[w]]
    missing = [w for w in content_new if not coverage_via[w]]

    # set-level recycle (advisory) — the doc's "set-level recycling": each current content
    # word should be met >= recycle_min times across the whole set, not within one reading.
    under_recycled = [(w, set_counts.get(w, 0)) for w in content_new
                      if set_counts.get(w, 0) < recycle_min]

    # multiplicity (advisory) — content words in fewer than MULTIPLICITY_MIN readings
    low_multi = [
        (w, len(appears_in.get(w, ())))
        for w in content_new
        if len(appears_in.get(w, ())) < MULTIPLICITY_MIN
    ]

    # regression buckets over the whole set (content tokens)
    content = [t for t, k in set_tokens if k == "vocab" and is_content(model, t)]
    denom = len(content)
    bucket = Counter()
    for w in content:
        d = cur_idx - idx[model["word_intro"][w]]
        bucket[d] += 1
    req = review_requirements()
    regression = []
    for d in sorted(req):
        actual = bucket.get(d, 0) / denom if denom else 0.0
        regression.append({
            "age": d,
            "required": round(req[d], 3),
            "actual": round(actual, 3),
            "ok": actual + 1e-9 >= req[d],
            "tokens": bucket.get(d, 0),
        })

    # encounter ledger across history + current set (content words, proper nouns exempt)
    ledger = Counter()
    for txt in history_texts + [r["text"] for r in readings]:
        toks, _ = segment(txt, allowed, model["name_chars"], max_len)
        for t, k in toks:
            if k == "vocab" and is_content(model, t):
                ledger[t] += 1
    below = sorted(
        ((w, c, model["word_intro"][w]) for w, c in ledger.items() if c < ENCOUNTER_FLOOR),
        key=lambda x: x[1],
    )

    # grammar markers (optional, advisory)
    grammar_report = []
    if grammar:
        joined = "".join(t for t, k in set_tokens)  # vocab+name+oov text (sans punct)
        full = "".join(strip_label(l) for r in readings for l in r["text"].splitlines())
        for g in grammar:
            if g.upper() in ("A-NOT-A", "ANOTA"):
                n = len(re.findall(r"(.)不\1", full))
                grammar_report.append(("A-not-A (V不V)", n))
            else:
                grammar_report.append((g, full.count(g)))

    hard_fail = bool(missing) or any(pr["leaks"] for pr in per_reading)
    return {
        "unit": unit,
        "n_current_new": len(current_new),
        "recycle_min": recycle_min,
        "per_reading": per_reading,
        "coverage": {
            "covered": len(covered),
            "total": len(content_new),
            "missing": missing,
            "via_compound": {w: coverage_via[w] for w in covered if coverage_via[w] != "direct"},
        },
        "under_recycled": under_recycled,
        "low_multiplicity": low_multi,
        "regression": regression,
        "encounter_floor": ENCOUNTER_FLOOR,
        "encounter_below": below,
        "grammar": grammar_report,
        "hard_fail": hard_fail,
    }


# ── Reporting ────────────────────────────────────────────────────────────────
def mark(ok):
    return "\033[32m✓\033[0m" if ok else "\033[33m⚠\033[0m"


def fail_mark():
    return "\033[31m✗\033[0m"


def print_report(rep):
    u = rep["unit"]
    print(f"\n══ QA · {u} · {rep['n_current_new']} new items · recycle≥{rep['recycle_min']} ══\n")

    print("Per reading")
    for pr in rep["per_reading"]:
        leak = f"  {fail_mark()} IN-BAND LEAK: {' '.join(pr['leaks'])}" if pr["leaks"] else ""
        print(f"  {pr['id']:<4} {pr['format']:<6} {pr['n_tokens']:>3} tok · "
              f"{pr['sentences']} sent · openers {pr['opener_ratio']} · "
              f"touches {len(pr['touched_current'])} new{leak}")
        if pr["rep_ratio"] > 0.30 and pr["rep_word"]:
            print(f"       {mark(False)} repetition: {pr['rep_word']} = {int(pr['rep_ratio']*100)}% of content")

    cov = rep["coverage"]
    ok = not cov["missing"]
    line = f"\nCurrent-new union  {mark(ok) if ok else fail_mark()} {cov['covered']}/{cov['total']} content items"
    if cov["missing"]:
        line += f"  MISSING: {' '.join(cov['missing'])}"
    print(line)
    if cov["via_compound"]:
        notes = ", ".join(f"{w} ({v})" for w, v in cov["via_compound"].items())
        print(f"   (credited via compound: {notes})")

    if rep["under_recycled"]:
        ws = ", ".join(f"{w}×{c}" for w, c in rep["under_recycled"])
        print(f"Set recycle<{rep['recycle_min']}     {mark(False)} {ws}")
    else:
        print(f"Set recycle≥{rep['recycle_min']}     {mark(True)} every current content word")

    if rep["low_multiplicity"]:
        ws = ", ".join(f"{w}×{n}" for w, n in rep["low_multiplicity"])
        print(f"Multiplicity<{MULTIPLICITY_MIN}     {mark(False)} {ws}")
    else:
        print(f"Multiplicity≥{MULTIPLICITY_MIN}     {mark(True)} all current content words")

    print("\nRegression (content-token proportion by age)")
    for b in rep["regression"]:
        label = "current" if b["age"] == 0 else f"L-{b['age']}"
        print(f"  {label:<8} need ≥{b['required']*100:>4.1f}%   got {b['actual']*100:>4.1f}%"
              f"  ({b['tokens']} tok)  {mark(b['ok'])}")

    if rep["grammar"]:
        print("\nGrammar markers")
        for g, n in rep["grammar"]:
            print(f"  {g:<16} {n}×  {mark(n > 0)}")

    print(f"\nEncounter ledger (lifetime touches, floor {rep['encounter_floor']}, proper nouns exempt)")
    if rep["encounter_below"]:
        print("  below floor (advisory — rare words OK if forcing hurts naturalness):")
        for w, c, intro in rep["encounter_below"]:
            print(f"    {w:<6} {c}×   (introduced {intro})")
    else:
        print(f"  {mark(True)} every content word ≥ {rep['encounter_floor']} touches")

    verdict = (f"\n{fail_mark()} HARD FAIL — fix in-band leaks / coverage before shipping"
               if rep["hard_fail"]
               else "\n\033[32m✓ PASS\033[0m — objective gates clean; advisories above are for taste")
    print(verdict + "\n")


# ── CLI ──────────────────────────────────────────────────────────────────────
def main():
    default_csv = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "..", "..", "private", "dangdai-vocab", "dangdai.csv",
    )
    ap = argparse.ArgumentParser(description="QA checker for Tsumugu Core readings.")
    ap.add_argument("--set", required=True, help="set.json for the unit under test")
    ap.add_argument("--csv", default=default_csv, help="dangdai vocab CSV")
    ap.add_argument("--history", nargs="*", default=[], help="prior set.json files (for the encounter ledger)")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    model = load_model(args.csv)
    with open(args.set, encoding="utf-8") as f:
        data = json.load(f)
    history_texts = []
    for h in args.history:
        with open(h, encoding="utf-8") as f:
            history_texts.extend(r["text"] for r in json.load(f).get("readings", []))

    rep = check_set(model, data["unit"], data["readings"], history_texts, data.get("grammar", []))

    if args.json:
        print(json.dumps(rep, ensure_ascii=False, indent=2))
    else:
        print_report(rep)
    sys.exit(1 if rep["hard_fail"] else 0)


if __name__ == "__main__":
    main()
