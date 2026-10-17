"""Set-level QA over a unit's readings."""
from __future__ import annotations

import re
from collections import Counter, defaultdict

from check_reading_model import (
    ENCOUNTER_FLOOR,
    MAX_REGRESSION_DEPTH,
    MULTIPLICITY_MIN,
    P_CURRENT,
    DECAY,
    RECYCLE_LARGE,
    RECYCLE_SIZE_CUTOFF,
    RECYCLE_SMALL,
    cumulative_words,
    strip_label,
)
from check_reading_segment import is_content, one_reading, segment


def review_requirements(depth=MAX_REGRESSION_DEPTH):
    req = {0: P_CURRENT}
    for age in range(1, depth + 1):
        req[age] = 0.20 * (DECAY ** (age - 1))
    return req


def check_set(model, unit: str, payload: dict):
    readings = payload["readings"]
    idx = model["unit_index"]
    allowed = cumulative_words(model, unit)
    max_len = max((len(word) for word in allowed), default=1)
    current_new = list(dict.fromkeys(model["unit_new"][unit]))
    appears_in = defaultdict(set)
    set_counts = Counter()
    ctx = {
        "allowed": allowed,
        "name_chars": model["name_chars"],
        "max_len": max_len,
        "current_new": current_new,
        "appears_in": appears_in,
        "set_counts": set_counts,
    }
    per_reading, set_tokens = walk_readings(readings, model, ctx)
    content_new = [word for word in current_new if not model["word_is_name"].get(word, False)]
    recycle_min = RECYCLE_SMALL if len(current_new) < RECYCLE_SIZE_CUTOFF else RECYCLE_LARGE
    coverage = coverage_block(content_new, set_tokens)
    under_recycled, low_multi = recycle_lists(content_new, ctx, recycle_min)
    content = [text for text, kind in set_tokens if kind == "vocab" and is_content(model, text)]
    return {
        "unit": unit,
        "n_current_new": len(current_new),
        "recycle_min": recycle_min,
        "per_reading": per_reading,
        "coverage": coverage,
        "under_recycled": under_recycled,
        "low_multiplicity": low_multi,
        "regression": regression_block(model, content, idx[unit]),
        "encounter_floor": ENCOUNTER_FLOOR,
        "encounter_below": encounter_below(model, ctx, payload),
        "grammar": grammar_block(readings, payload["grammar"]),
        "hard_fail": bool(coverage["missing"]) or any(row["leaks"] for row in per_reading),
    }


def walk_readings(readings, model, ctx):
    per_reading = []
    set_tokens = []
    for reading in readings:
        row, tokens = one_reading(reading, model, ctx)
        per_reading.append(row)
        set_tokens.extend(tokens)
    return per_reading, set_tokens


def covered_via(word, touched):
    if word in touched:
        return "direct"
    for other in touched:
        if word != other and word in other:
            return f"in {other}"
    return None


def coverage_block(content_new, set_tokens):
    touched = {text for text, kind in set_tokens if kind == "vocab"}
    via = {word: covered_via(word, touched) for word in content_new}
    covered = [word for word in content_new if via[word]]
    missing = [word for word in content_new if not via[word]]
    return {
        "covered": len(covered),
        "total": len(content_new),
        "missing": missing,
        "via_compound": {word: via[word] for word in covered if via[word] != "direct"},
    }


def recycle_lists(content_new, ctx, recycle_min):
    counts = ctx["set_counts"]
    appears = ctx["appears_in"]
    under = [(word, counts.get(word, 0)) for word in content_new if counts.get(word, 0) < recycle_min]
    low = [
        (word, len(appears.get(word, ())))
        for word in content_new
        if len(appears.get(word, ())) < MULTIPLICITY_MIN
    ]
    return under, low


def regression_block(model, content, cur_idx):
    idx = model["unit_index"]
    denom = len(content)
    bucket = Counter()
    for word in content:
        bucket[cur_idx - idx[model["word_intro"][word]]] += 1
    req = review_requirements()
    rows = []
    for age in sorted(req):
        actual = bucket.get(age, 0) / denom if denom else 0.0
        rows.append({
            "age": age,
            "required": round(req[age], 3),
            "actual": round(actual, 3),
            "ok": actual + 1e-9 >= req[age],
            "tokens": bucket.get(age, 0),
        })
    return rows


def encounter_below(model, ctx, payload):
    readings = payload["readings"]
    texts = list(payload["history"]) + [reading["text"] for reading in readings]
    ledger = Counter()
    limits = (ctx["name_chars"], ctx["max_len"])
    for text in texts:
        tokens, _sentences = segment(text, ctx["allowed"], limits)
        for token, kind in tokens:
            if kind == "vocab" and is_content(model, token):
                ledger[token] += 1
    return sorted(
        ((word, count, model["word_intro"][word]) for word, count in ledger.items() if count < ENCOUNTER_FLOOR),
        key=lambda item: item[1],
    )


def grammar_block(readings, grammar):
    if not grammar:
        return []
    full = "".join(strip_label(line) for reading in readings for line in reading["text"].splitlines())
    report = []
    for point in grammar:
        if point.upper() in ("A-NOT-A", "ANOTA"):
            report.append(("A-not-A (V不V)", len(re.findall(r"(.)不\1", full))))
        else:
            report.append((point, full.count(point)))
    return report
