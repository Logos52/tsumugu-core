"""Coverage and advisory scans for the lesson-viewer build."""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFER_BUDGET = 3


def say(*parts, sep=" ", end="\n", file=None):
    stream = sys.stdout if file is None or file is sys.stdout else sys.stderr
    stream.write(sep.join(str(part) for part in parts) + end)


def load_drafts():
    """Verified readings staged in mockups/drafts/<UNIT>.json override inline READINGS."""
    found = {}
    for fp in sorted(glob.glob(os.path.join(ROOT, "mockups/drafts", "B*L*.json"))):
        try:
            obj = json.load(open(fp, encoding="utf-8"))
        except (OSError, json.JSONDecodeError, UnicodeError, AttributeError):
            continue
        unit, readings = obj.get("unit"), obj.get("readings")
        if unit and readings:
            found[unit] = [{"id": row["id"], "format": row["format"], "text": row["text"]} for row in readings]
    return found


def gram_hit(point, text):
    if point.get("pat") == "anota":
        return re.search(r"(.)不\1", text) is not None
    if point.get("pat") == "v1v":
        return re.search(r"(.)一\1", text) is not None
    if point.get("re"):
        return re.search(point["re"], text) is not None
    if point.get("m"):
        return point["m"] in text
    if point.get("any"):
        return any(item in text for item in point["any"])
    return False


def coverage_qa(deck, highlights, state):
    """Gate: exactly 3 articles; union covers grammar and vocab within the defer budget."""
    packed = {**state, "deck": deck, "highlights": highlights}
    ok = True
    say(f"coverage QA (3 articles · grammar 100% · vocab may defer <= {DEFER_BUDGET}/lesson):")
    for unit in state["units"]:
        unit_ok, lines = coverage_unit(unit, packed)
        for line in lines:
            say(line)
        if not unit_ok:
            ok = False
    return ok


def coverage_unit(unit, state):
    deck = state["deck"]
    highlights = state["highlights"]
    reads = state["readings"][unit]
    union = " ".join(row["text"] for row in reads)
    missing_vocab = [row["w"] for row in deck[unit] if row["w"] not in union]
    missing_grammar = [row["title"] for row in highlights[unit]["grammar"] if not gram_hit(row, union)]
    vocab_total = len(deck[unit])
    grammar_total = len(highlights[unit]["grammar"])
    article_note = "" if len(reads) == 3 else f"  !! {len(reads)} articles (need 3)"
    lines = [
        f"  {unit}: vocab {vocab_total - len(missing_vocab)}/{vocab_total} · "
        f"grammar {grammar_total - len(missing_grammar)}/{grammar_total} · "
        f"articles {len(reads)}{article_note}"
    ]
    ok = len(reads) == 3
    if missing_vocab:
        over = len(missing_vocab) > DEFER_BUDGET
        label = f"OVER BUDGET ({len(missing_vocab)}>{DEFER_BUDGET})" if over else "deferred"
        lines.append(f"    {label} vocab ({len(missing_vocab)}): {' '.join(missing_vocab)}")
        if over:
            ok = False
    if missing_grammar:
        lines.append(f"    MISSING grammar: {'; '.join(missing_grammar)}")
        ok = False
    return ok, lines


def check_encounter_balance(deck, state):
    """Advisory spread of content words across the three articles."""
    from build_lesson_data import is_function

    readings = state["readings"]
    say("encounter balance (content words should sit in >=2 of 3 articles):")
    for unit in state["units"]:
        content = [row for row in deck[unit] if not is_function(row)]
        say(encounter_line(unit, readings[unit], content))


def encounter_line(unit, reads, content):
    dist = {1: [], 2: [], 3: []}
    for row in content:
        spread = sum(1 for reading in reads if row["w"] in reading["text"])
        dist.setdefault(spread, []).append(row["w"])
    spaced = len(dist.get(2, [])) + len(dist.get(3, []))
    singles = dist.get(1, [])
    line = (
        f"  {unit}: content {len(content)} · spaced>=2 {spaced}/{len(content)} · "
        f"in[1/2/3 articles] {len(singles)}/{len(dist.get(2, []))}/{len(dist.get(3, []))}"
    )
    if singles:
        line += f"\n    under-spaced ({len(singles)}): {' '.join(singles)}"
    return line


def advisory_scan(surf, highlights, state):
    """Advisory out-of-band footprint. Never fails the build."""
    units = state["units"]
    readings = state["readings"]
    labels = state["labels"]
    marks = grammar_marks(highlights, units)
    forms = set().union(*surf.values()) if surf else set()
    maxlen = max(len(item) for item in forms | marks) if (forms or marks) else 1
    total = 0
    for idx, unit in enumerate(units):
        band = set().union(*(surf.get(earlier, set()) for earlier in units[: idx + 1])) | marks
        for reading in readings[unit]:
            chars = article_oob(reading["text"], {"band": band, "maxlen": maxlen, "labels": labels})
            if chars:
                total += len(set(chars))
                say(f"  advisory  {unit}/{reading['id']}: {' '.join(sorted(set(chars)))}")
    say(f"advisory scan: {total} distinct out-of-band token(s) — allowed (naturalness wins)")


def grammar_marks(highlights, units):
    marks = set()
    for unit in units:
        for point in highlights[unit]["grammar"]:
            if point.get("m"):
                marks.add(point["m"])
            marks.update(point.get("any", []))
    return marks


def article_oob(text, scan):
    found = []
    for line in text.split("\n"):
        found.extend(line_oob(line.split("：", 1)[-1], scan))
    return found


def line_oob(line, scan):
    found = []
    index = 0
    labels = scan["labels"]
    while index < len(line):
        if line[index] in "，。！？、：；「」（） ":
            index += 1
            continue
        size = matched_size(line, index, scan)
        if size:
            index += size
            continue
        if line[index] not in labels:
            found.append(line[index])
        index += 1
    return found


def matched_size(line, index, scan):
    limit = min(scan["maxlen"], len(line) - index)
    for size in range(limit, 0, -1):
        if line[index : index + size] in scan["band"]:
            return size
    return 0
