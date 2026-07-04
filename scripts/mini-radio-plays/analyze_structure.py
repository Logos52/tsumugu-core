#!/usr/bin/env python3
"""Build STRUCTURE-NOTES.md from mrp transcripts (and deck TSV if present)."""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TRANSCRIPT_DIR = REPO / "private/mrp-transcripts"
DECK_TSV = REPO / "private/mrp-deck/parsed-notes.tsv"
OUT = REPO / "private/STRUCTURE-NOTES.md"

HAN = re.compile(r"[一-鿿]")
SPEAKER = re.compile(r"^([^\s：:]{1,6})[：:]")


def han_count(text: str) -> int:
    return len(HAN.findall(text))


def parse_cast(raw: str) -> list[str]:
    lines = [ln.strip() for ln in raw.splitlines()]
    names: list[str] = []
    in_cast = False
    for s in lines:
        if s == "劇中人":
            in_cast = True
            continue
        if in_cast:
            if not s or re.match(r"^第[一二三四五六七八九十\d]+課$", s) or len(s) > 12:
                break
            if re.match(r"^[\u4e00-\u9fff]{2,4}$", s) and "歲" not in s:
                names.append(s)
    return names


def strip_cast_header(text: str) -> str:
    """Drop opening title + 劇中人 cast list."""
    lines = text.splitlines()
    out: list[str] = []
    past_cast = False
    for line in lines:
        s = line.strip()
        if not past_cast:
            if s in ("劇中人", "") or re.match(r"^第[一二三四五六七八九十\d]+課$", s):
                continue
            if re.match(r"^[\u4e00-\u9fff]{2,8}$", s) and len(s) <= 6 and "歲" not in s:
                continue
            if s and len(s) > 6:
                past_cast = True
        if past_cast:
            out.append(line)
    return "\n".join(out)


_LESSON = r"第[一二三四五六七八九十\d]+課"


def drama_key(name: str) -> str | None:
    base = name.replace(".json", "").replace(".txt", "")
    m = re.match(rf"^(\d{{2}})-([12])\s+{_LESSON}\s+(.+)\.mp3$", name)
    if not m:
        m = re.match(rf"^(\d{{2}})-([12])-{_LESSON}-(.+)$", base)
    if not m:
        return None
    lesson, part, title = m.group(1), m.group(2), m.group(3).strip()
    return f"L{lesson}-P{part}-{title}"


def load_transcripts() -> dict[str, dict]:
    by_key: dict[str, dict] = {}
    for path in sorted(TRANSCRIPT_DIR.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        key = drama_key(doc.get("source", path.stem))
        if not key:
            continue
        raw = doc.get("text", "")
        text = strip_cast_header(raw)
        cast = parse_cast(raw)
        speakers = set(cast)
        for line in text.splitlines():
            m = SPEAKER.match(line.strip())
            if m:
                speakers.add(m.group(1))
        duration = doc["segments"][-1]["end"] if doc.get("segments") else 0
        by_key[key] = {
            "source": doc.get("source", path.name),
            "lesson": key.split("-", 1)[0],
            "chars_han": han_count(text),
            "chars_all": len(text),
            "lines": len([ln for ln in text.splitlines() if ln.strip()]),
            "segments": len(doc.get("segments", [])),
            "duration_s": round(duration, 1),
            "cast": cast,
            "speakers": sorted(speakers),
            "text": text,
        }
    return by_key


def lesson_groups(by_key: dict[str, dict]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {}
    for key, row in sorted(by_key.items()):
        lesson = key.split("-", 1)[0]
        groups.setdefault(lesson, []).append(row)
    return groups


def write_notes(by_key: dict[str, dict]) -> None:
    lines = [
        "# MTC Mini Radio Plays — structure notes (study-only)",
        "",
        "Derived from mlx-whisper transcripts + segment timing. **Not for publication.**",
        "",
    ]

    if DECK_TSV.exists():
        with DECK_TSV.open(encoding="utf-8") as f:
            n = sum(1 for _ in csv.reader(f, delimiter="\t")) - 1
        lines.append(f"Anki deck parsed: {n} notes in `parsed-notes.tsv`.")
    else:
        lines.append("Anki deck: **not acquired** (see `mrp-deck/ACQUIRE-NOTE.md`). Transcripts only.")

    lines.extend(["", "## Drama tracks (sample)", ""])

    groups = lesson_groups(by_key)
    for lesson, parts in groups.items():
        total_han = sum(r["chars_han"] for r in parts)
        total_min = sum(r["duration_s"] for r in parts) / 60
        cast = parts[0]["cast"] if parts else []
        cast_s = "、".join(cast) if cast else "(cast not parsed)"
        lines.append(f"### {lesson} — combined ~{total_han} Han chars, ~{total_min:.1f} min")
        lines.append(f"- Cast ({len(cast)}): {cast_s}")
        for row in parts:
            mins = row["duration_s"] / 60
            lines.append(
                f"- **{row['source']}** — {row['chars_han']} Han chars, "
                f"{row['lines']} lines, {row['segments']} ASR segments, ~{mins:.1f} min."
            )
        lines.append("")

    if by_key:
        all_han = [r["chars_han"] for r in by_key.values()]
        all_dur = [r["duration_s"] for r in by_key.values()]
        lines.extend(
            [
                "## Aggregate (parsed sample)",
                "",
                f"- Drama parts in sample: {len(by_key)}",
                f"- Han chars per part: min {min(all_han)}, max {max(all_han)}, mean {sum(all_han)/len(all_han):.0f}",
                f"- Duration per part: min {min(all_dur)/60:.1f} min, max {max(all_dur)/60:.1f} min",
                "",
                "## Register / level (provisional)",
                "",
                "- **Register:** colloquial Taiwan Mandarin dialogue; idiomatic lesson titles (成語/俗語).",
                "- **Level band:** MTC Book 1–2 companion (lessons 1–3 sample); drama is upper-elementary conversational.",
                "- **Turn structure:** short back-and-forth lines; scene open → conflict → resolution within ~7 min/part.",
                "- **Cast block:** each part opens with 劇中人 + 2–4 named roles (no `名字：` in dialogue).",
                "- **Parts -1/-2:** parallel ~7 min recordings of the same lesson script (near-identical dialogue; -2 often has the fuller ending).",
                "- **ASR caveat:** mlx-whisper + s2twp; expect proper-name drift and tail hallucination on silence.",
                "",
                "## Companion tracks (from filename convention)",
                "",
                "Per lesson × 4 mp3s:",
                "",
                "| Part | File suffix | Role |",
                "|------|-------------|------|",
                "| Drama A | `-1` | Scripted skit, first half |",
                "| Drama B | `-2` | Scripted skit, second half |",
                "| Vocab | `-3` | 詞語和例句 — headwords + example sentences |",
                "| Listening | `-4` | 聽力題目 — comprehension questions |",
                "",
                "12 lessons × 4 = 48 tracks total.",
                "",
                "## Scene sketch (from transcripts)",
                "",
            ]
        )
        for key, row in sorted(by_key.items()):
            preview = row["text"][:200].replace("\n", " / ")
            lines.append(f"### {row['source']}")
            lines.append(f"> {preview}…")
            lines.append("")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")


def main() -> int:
    by_key = load_transcripts()
    if not by_key:
        print("No transcripts found — run transcribe_mrp.py first", file=__import__("sys").stderr)
        return 1
    write_notes(by_key)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())