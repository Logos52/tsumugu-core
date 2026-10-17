from __future__ import annotations

import csv
import re
from collections import defaultdict

P_CURRENT = 0.40
DECAY = 0.5
MAX_REGRESSION_DEPTH = 5
ENCOUNTER_FLOOR = 8
RECYCLE_SIZE_CUTOFF = 30
RECYCLE_SMALL = 2
RECYCLE_LARGE = 3
MULTIPLICITY_MIN = 2

STOPWORDS = set("你 我 他 她 它 我們 你們 他們 的 了 嗎 呢 吧 啊 喔 不 很 都 也 常 在 是 這 那".split())

PUNCT = set("，。！？、；：「」『』（）()《》〈〉…—～~ 　\t\n\r:!?,.")
SENT_END = "。！？!?"
NAME_TAG_SUBSTR = "Name"


def atomic_unit(vid: str):
    """B1L01-II-15 -> 'b1l01-2'. Returns None if the id doesn't parse."""
    m = re.match(r"^B(\d+)L(\d+)-([IVX]+)?", vid)
    if not m:
        return None
    book, lesson = int(m.group(1)), int(m.group(2))
    part = {"I": 1, "II": 2, "III": 3}.get(m.group(3) or "I", 1)
    return f"b{book}l{lesson:02d}-{part}"


def unit_key(u: str):
    matched = re.match(r"^b(\d+)l(\d+)-(\d+)$", u)
    if matched is None:
        return (0, 0, 0)
    return (int(matched.group(1)), int(matched.group(2)), int(matched.group(3)))


def normalize_trad(raw: str):
    """'臺灣（＝台灣）' -> ('臺灣', ['台灣']); strips other parentheticals."""
    raw = raw.strip()
    m = re.match(r"^(.*?)（＝(.*?)）$", raw)
    if m:
        return m.group(1).strip(), [m.group(2).strip()]
    return re.sub(r"（.*?）", "", raw).strip(), []


def load_model(csv_path: str):
    word_intro: dict[str, str] = {}
    word_is_name: dict[str, bool] = {}
    unit_new: dict[str, list] = defaultdict(list)
    name_chars: set[str] = set()

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)
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


def strip_label(line: str):
    """Drop a leading speaker label ('王開文：' / 'A:' / '李、陳：') if a colon sits near
    the start of the line. Speaker labels are structural metadata, not prose."""
    for sep in ("：", ":"):
        idx = line.find(sep)
        if 0 <= idx <= 8:
            return line[idx + 1:]
    return line

