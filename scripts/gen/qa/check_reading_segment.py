"""Greedy in-band segmentation for one reading."""
from __future__ import annotations

from collections import Counter

from check_reading_model import (
    PUNCT,
    SENT_END,
    STOPWORDS,
    strip_label,
)


def match_token(line: str, index: int, pack: tuple):
    allowed, name_chars, max_len = pack
    length = len(line)
    char = line[index]
    matched = None
    for size in range(min(max_len, length - index), 0, -1):
        cand = line[index : index + size]
        if cand in allowed:
            matched = cand
            break
    if matched:
        return (matched, "vocab"), index + len(matched)
    if char in name_chars:
        return (char, "name"), index + 1
    return (char, "oov"), index + 1


def segment(text: str, allowed: set, limits: tuple):
    """Return (tokens, sentences). tokens are (text, kind)."""
    tokens, sentences, current = [], [], []
    for raw_line in text.splitlines():
        line = strip_label(raw_line)
        index = 0
        while index < len(line):
            char = line[index]
            if char in SENT_END:
                if current:
                    sentences.append(current)
                    current = []
                index += 1
                continue
            if char in PUNCT or char.isspace():
                index += 1
                continue
            tok, index = match_token(line, index, (allowed, limits[0], limits[1]))
            tokens.append(tok)
            current.append(tok)
    if current:
        sentences.append(current)
    return tokens, sentences


def is_content(model, word: str):
    return word not in STOPWORDS and not model["word_is_name"].get(word, False)


def one_reading(reading, model, ctx):
    limits = (ctx["name_chars"], ctx["max_len"])
    tokens, sentences = segment(reading["text"], ctx["allowed"], limits)
    leaks = [text for text, kind in tokens if kind == "oov"]
    vocab = [text for text, kind in tokens if kind == "vocab"]
    counts = Counter(vocab)
    ctx["set_counts"].update(counts)
    for word in set(vocab):
        ctx["appears_in"][word].add(reading["id"])
    openers = [sentence[0][0] for sentence in sentences if sentence]
    opener_ratio = (len(set(openers)) / len(openers)) if openers else 1.0
    content_toks = [text for text, kind in tokens if kind == "vocab" and is_content(model, text)]
    top = Counter(content_toks).most_common(1)
    rep_ratio = (top[0][1] / len(content_toks)) if content_toks else 0.0
    row = {
        "id": reading["id"],
        "format": reading.get("format", ""),
        "n_tokens": len(tokens),
        "leaks": leaks,
        "touched_current": [word for word in ctx["current_new"] if counts.get(word, 0) >= 1],
        "sentences": len(sentences),
        "opener_ratio": round(opener_ratio, 2),
        "rep_word": (top[0][0] if top else None),
        "rep_ratio": round(rep_ratio, 2),
    }
    return row, tokens
