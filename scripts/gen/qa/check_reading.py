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
import json
import os
import sys

from check_reading_model import load_model
from check_reading_report import print_report
from check_reading_set import check_set


def say(*parts, sep=" ", end="\n", file=None):
    stream = sys.stdout if file is None or file is sys.stdout else sys.stderr
    stream.write(sep.join(str(part) for part in parts) + end)


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
    with open(args.set, encoding="utf-8") as handle:
        data = json.load(handle)
    history_texts = []
    for path in args.history:
        with open(path, encoding="utf-8") as handle:
            history_texts.extend(row["text"] for row in json.load(handle).get("readings", []))

    rep = check_set(model, data["unit"], {
        "readings": data["readings"],
        "history": history_texts,
        "grammar": data.get("grammar", []),
    })

    if args.json:
        say(json.dumps(rep, ensure_ascii=False, indent=2))
    else:
        print_report(rep)
    sys.exit(1 if rep["hard_fail"] else 0)


if __name__ == "__main__":
    main()
