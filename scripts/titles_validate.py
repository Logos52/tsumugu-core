"""Title-shard validation. Imported by titles_stage after that module has loaded."""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from datetime import date

from titles_stage import BANNED_CAST, REPORT_OUT, TITLES_OUT, iter_corpus

_VN = set("ăâđêôơưĂÂĐÊÔƠƯ")
_COMBINING = set("̛̣̀́̃̉̂̆")


def say(*parts, sep=" ", end="\n", file=None):
    stream = sys.stdout if file is None or file is sys.stdout else sys.stderr
    stream.write(sep.join(str(part) for part in parts) + end)


def has_vn_diacritics(text: str) -> bool:
    for char in unicodedata.normalize("NFD", text or ""):
        if char in _COMBINING or char in _VN:
            return True
    return False


def blank_flags(row: dict) -> list[str]:
    flags = []
    for key in ("zh", "en", "vi", "lesson", "format"):
        if not (row.get(key) or "").strip():
            flags.append(f"blank:{key}")
    return flags


def copy_flags(row: dict) -> list[str]:
    flags = []
    blob = row.get("zh", "") + row.get("en", "") + row.get("vi", "")
    if any(name in blob for name in BANNED_CAST):
        flags.append("banned_cast")
    if not has_vn_diacritics(row.get("vi", "")) and len(row.get("vi", "")) > 3:
        flags.append("vi_no_diacritics")
    english = (row.get("en") or "").strip()
    if re.search(r"(?i)^(reading|dialogue|story|article)\s*\d", english):
        flags.append("generic_en")
    return flags


def dup_flags(row: dict, rid: str, seen: dict) -> list[str]:
    flags = []
    english = (row.get("en") or "").strip()
    chinese = (row.get("zh") or "").strip()
    if english in seen["en"]:
        flags.append(f"dup_en:{seen['en'][english]}")
    else:
        seen["en"][english] = rid
    if chinese in seen["zh"]:
        flags.append(f"dup_zh:{seen['zh'][chinese]}")
    else:
        seen["zh"][chinese] = rid
    return flags


def row_flags(row: dict, rid: str, seen: dict) -> list[str]:
    return blank_flags(row) + copy_flags(row) + dup_flags(row, rid, seen)


def validate() -> None:
    corpus = {row["id"]: row for row in iter_corpus()}
    if not os.path.exists(TITLES_OUT):
        raise SystemExit("titles.json missing — merge first")
    titles = json.load(open(TITLES_OUT, encoding="utf-8"))
    report: list[dict] = []
    seen = {"en": {}, "zh": {}}
    for rid in sorted(corpus.keys()):
        if rid not in titles:
            report.append({"id": rid, "flags": ["missing"]})
            continue
        report.append({"id": rid, "flags": row_flags(titles[rid], rid, seen), "titles": titles[rid]})
    write_report(corpus, titles, report)


def write_report(corpus: dict, titles: dict, report: list[dict]) -> None:
    flagged = [row for row in report if row.get("flags")]
    summary = {
        "total": len(corpus),
        "titled": len(titles),
        "missing": sum(1 for row in report if "missing" in row.get("flags", [])),
        "flagged": len(flagged),
        "updated": str(date.today()),
    }
    with open(REPORT_OUT, "w", encoding="utf-8") as handle:
        json.dump({"summary": summary, "items": report}, handle, ensure_ascii=False, indent=2)
    say(json.dumps(summary, indent=2))
