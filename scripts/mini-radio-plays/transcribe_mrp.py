#!/usr/bin/env python3
"""Transcribe MTC Mini Radio Plays audio (mlx-whisper + OpenCC s2twp).

Study-only output under private/mrp-transcripts/ (gitignored).

Usage:
  TSUMUGU_VOICE_PYTHON=.../bakeoff/.venv/bin/python \\
    python3 scripts/mini-radio-plays/transcribe_mrp.py --lessons 1-3 --parts drama

Defaults: lessons 1-3, drama parts (-1/-2 only).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
AUDIO_DIR = Path("/Users/n1/Documents/Language/Chinese/MTC/MTC/Mini Radio Plays")
OUT_DIR = REPO / "private/mrp-transcripts"
# large-v3 HF repo 404/401 here; turbo is the cached local pipeline default.
WHISPER_MODEL = "mlx-community/whisper-large-v3-turbo"
S2TWP = "s2twp"

PART_PATTERNS = {
    "drama": re.compile(r"^\d{2}-[12]\s"),
    "vocab": re.compile(r"^\d{2}-3\s"),
    "listening": re.compile(r"^\d{2}-4\s"),
}


def voice_python() -> Path:
    env = os.environ.get("TSUMUGU_VOICE_PYTHON")
    if env:
        return Path(env)
    bakeoff = Path("/Users/n1/Projects/tsumugu/personal/research/bakeoff/.venv/bin/python")
    if bakeoff.exists():
        return bakeoff
    raise SystemExit("Set TSUMUGU_VOICE_PYTHON to a venv with mlx_whisper + opencc")


def parse_lessons(spec: str) -> set[int]:
    out: set[int] = set()
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if "-" in chunk:
            a, b = chunk.split("-", 1)
            out.update(range(int(a), int(b) + 1))
        else:
            out.add(int(chunk))
    return out


def select_tracks(lessons: set[int], parts: list[str]) -> list[Path]:
    files = sorted(AUDIO_DIR.glob("*.mp3"))
    selected: list[Path] = []
    for path in files:
        lesson = int(path.name[:2])
        if lesson not in lessons:
            continue
        if not any(PART_PATTERNS[p].match(path.name) for p in parts):
            continue
        selected.append(path)
    return selected


def slugify(name: str) -> str:
    return re.sub(r"\s+", "-", name.strip()).strip("-")


def transcribe_one(py: Path, audio: Path, force: bool) -> None:
    stem = slugify(audio.stem)
    txt_path = OUT_DIR / f"{stem}.txt"
    json_path = OUT_DIR / f"{stem}.json"

    if txt_path.exists() and json_path.exists() and not force:
        print(f"skip {audio.name} (exists)")
        return

    script = REPO / "scripts/mini-radio-plays/_transcribe_worker.py"
    cmd = [
        str(py),
        str(script),
        str(audio),
        str(json_path),
        str(txt_path),
        WHISPER_MODEL,
        S2TWP,
    ]
    print(f"transcribe {audio.name} …")
    subprocess.run(cmd, check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lessons", default="1-3", help="e.g. 1-3 or 1,4,7")
    ap.add_argument(
        "--parts",
        default="drama",
        help="comma-separated: drama,vocab,listening",
    )
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    if not AUDIO_DIR.is_dir():
        print(f"Audio dir missing: {AUDIO_DIR}", file=sys.stderr)
        return 1

    lessons = parse_lessons(args.lessons)
    parts = [p.strip() for p in args.parts.split(",") if p.strip()]
    tracks = select_tracks(lessons, parts)
    if not tracks:
        print("No tracks matched filters", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    py = voice_python()

    for track in tracks:
        transcribe_one(py, track, args.force)

    print(f"Done — {len(tracks)} track(s) → {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())