#!/usr/bin/env python3
"""Stage companion reading titles for parallel Composer shards.

Usage:
  python3 scripts/titles_stage.py stage [--shard-size 20]
  python3 scripts/titles_stage.py merge
  python3 scripts/titles_stage.py validate
"""
from __future__ import annotations

import argparse
import json
import os
import re
import unicodedata
from collections import OrderedDict
from datetime import date
from glob import glob
from typing import Any

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARDS = os.path.join(ROOT, "content", "title-shards")
SRC_DIR = os.path.join(SHARDS, "sources")
OUT_DIR = os.path.join(SHARDS, "out")
TITLES_OUT = os.path.join(ROOT, "content", "titles.json")
REPORT_OUT = os.path.join(ROOT, "content", "titles-report.json")

BANNED_CAST = ("王開文", "陳月美", "李明華")
_VN = set("ăâđêôơưĂÂĐÊÔƠƯ")
_COMBINING = set("̛̣̀́̃̉̂̆")


def lesson_label(binding: dict | None, unit: str | None) -> str:
    if binding:
        return f"B{binding['book']}L{binding['lesson']:02d}"
    if unit:
        m = re.match(r"B(\d+)L(\d+)", unit, re.I)
        if m:
            return f"B{m.group(1)}L{int(m.group(2)):02d}"
    return unit or ""


def zh_from_prepared(path: str) -> str:
    data = json.load(open(path, encoding="utf-8"))
    parts: list[str] = []
    for tok in data.get("tokens", []):
        if isinstance(tok, dict):
            parts.append(tok.get("zh") or tok.get("text") or "")
    return "".join(parts).strip()


def existing_zh_title(title_field: str | None) -> str | None:
    if not title_field:
        return None
    # "My Family · 自述二" -> take Chinese segment after · if present
    if "·" in title_field:
        zh = title_field.split("·", 1)[1].strip()
        return zh or None
    # if looks mostly Han, reuse
    han = re.findall(r"[\u4e00-\u9fff]", title_field)
    if len(han) >= 2:
        return title_field.strip()
    return None


def iter_corpus() -> list[dict[str, Any]]:
    idx = json.load(open(os.path.join(ROOT, "app/public/vault/__readings.json"), encoding="utf-8"))
    published: dict[str, dict] = {}
    for e in idx:
        rid = os.path.basename(e["path"]).replace(".prepared.json", "")
        prepared = os.path.join(ROOT, "app/public/vault", e["path"])
        binding = e.get("binding") or {}
        published[rid] = {
            "id": rid,
            "lesson": lesson_label(binding, None),
            "format": e.get("kind", ""),
            "topic": e.get("topic", ""),
            "band": e.get("band", ""),
            "existing_title": e.get("title", ""),
            "existing_zh": existing_zh_title(e.get("title")),
            "text": zh_from_prepared(prepared) if os.path.exists(prepared) else "",
            "source": "published",
        }

    items: dict[str, dict] = dict(published)
    for fp in sorted(glob(os.path.join(ROOT, "mockups/drafts/B*.json"))):
        d = json.load(open(fp, encoding="utf-8"))
        unit = d.get("unit", "")
        m = re.match(r"B(\d+)L(\d+)", unit, re.I)
        if not m:
            continue
        lesson = f"B{m.group(1)}L{int(m.group(2)):02d}"
        for r in d.get("readings", []):
            num = r["id"].replace("R", "")
            rid = f"b{int(m.group(1))}l{int(m.group(2)):02d}-r{num}".lower()
            if rid in items and items[rid].get("text"):
                continue
            items[rid] = {
                "id": rid,
                "lesson": lesson,
                "format": r.get("format", ""),
                "topic": "",
                "band": "",
                "existing_title": "",
                "existing_zh": None,
                "text": (r.get("text") or "").strip(),
                "source": "draft",
            }

    return [items[k] for k in sorted(items.keys())]


def stage(shard_size: int) -> None:
    corpus = iter_corpus()
    os.makedirs(SRC_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest_items = []
    for i in range(0, len(corpus), shard_size):
        shard = corpus[i : i + shard_size]
        n = i // shard_size + 1
        name = f"shard-{n:02d}"
        extract = OrderedDict((r["id"], r) for r in shard)
        src_path = os.path.join(SRC_DIR, f"{name}.json")
        with open(src_path, "w", encoding="utf-8") as f:
            json.dump(extract, f, ensure_ascii=False, indent=2)
        manifest_items.append(
            {
                "name": name,
                "count": len(shard),
                "ids": [r["id"] for r in shard],
                "source": src_path,
                "output": os.path.join(OUT_DIR, f"{name}.json"),
            }
        )
    manifest = {
        "total": len(corpus),
        "shard_size": shard_size,
        "shards": len(manifest_items),
        "updated": str(date.today()),
        "items": manifest_items,
    }
    with open(os.path.join(SHARDS, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(json.dumps({"staged": len(corpus), "shards": len(manifest_items)}, indent=2))


def merge() -> None:
    manifest = json.load(open(os.path.join(SHARDS, "manifest.json"), encoding="utf-8"))
    merged: dict[str, Any] = {}
    missing_shards: list[str] = []
    for item in manifest["items"]:
        out_path = item["output"]
        if not os.path.exists(out_path):
            missing_shards.append(item["name"])
            continue
        shard = json.load(open(out_path, encoding="utf-8"))
        merged.update(shard)

    status = {
        "done": sorted(merged.keys()),
        "remaining": manifest["total"] - len(merged),
        "updated": str(date.today()),
        "missing_shards": missing_shards,
    }
    with open(TITLES_OUT, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    with open(os.path.join(SHARDS, "STATUS.json"), "w", encoding="utf-8") as f:
        json.dump(status, f, ensure_ascii=False, indent=2)
    print(json.dumps(status, indent=2))


def has_vn_diacritics(s: str) -> bool:
    for ch in unicodedata.normalize("NFD", s or ""):
        if ch in _COMBINING or ch in _VN:
            return True
    return False


def validate() -> None:
    corpus = {r["id"]: r for r in iter_corpus()}
    if not os.path.exists(TITLES_OUT):
        raise SystemExit("titles.json missing — merge first")
    titles = json.load(open(TITLES_OUT, encoding="utf-8"))
    report: list[dict] = []
    en_seen: dict[str, str] = {}
    zh_seen: dict[str, str] = {}

    for rid in sorted(corpus.keys()):
        flags: list[str] = []
        if rid not in titles:
            report.append({"id": rid, "flags": ["missing"]})
            continue
        t = titles[rid]
        for key in ("zh", "en", "vi", "lesson", "format"):
            if not (t.get(key) or "").strip():
                flags.append(f"blank:{key}")
        if any(b in (t.get("zh", "") + t.get("en", "") + t.get("vi", "")) for b in BANNED_CAST):
            flags.append("banned_cast")
        if not has_vn_diacritics(t.get("vi", "")) and len(t.get("vi", "")) > 3:
            flags.append("vi_no_diacritics")
        en = (t.get("en") or "").strip()
        zh = (t.get("zh") or "").strip()
        if re.search(r"(?i)^(reading|dialogue|story|article)\s*\d", en):
            flags.append("generic_en")
        if en in en_seen:
            flags.append(f"dup_en:{en_seen[en]}")
        else:
            en_seen[en] = rid
        if zh in zh_seen:
            flags.append(f"dup_zh:{zh_seen[zh]}")
        else:
            zh_seen[zh] = rid
        report.append({"id": rid, "flags": flags, "titles": t})

    flagged = [r for r in report if r.get("flags")]
    summary = {
        "total": len(corpus),
        "titled": len(titles),
        "missing": sum(1 for r in report if "missing" in r.get("flags", [])),
        "flagged": len(flagged),
        "updated": str(date.today()),
    }
    with open(REPORT_OUT, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "items": report}, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, indent=2))


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("stage")
    s.add_argument("--shard-size", type=int, default=20)
    sub.add_parser("merge")
    sub.add_parser("validate")
    args = ap.parse_args()
    if args.cmd == "stage":
        stage(args.shard_size)
    elif args.cmd == "merge":
        merge()
    elif args.cmd == "validate":
        validate()


if __name__ == "__main__":
    main()