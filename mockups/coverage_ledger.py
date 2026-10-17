#!/usr/bin/env python3
"""Coverage ledger across the staged lessons, IN ORDER (hybrid coverage).

A lesson may defer a few awkward vocab words (check_candidate --defer); they roll
forward in a pool until a later lesson covers them naturally — so coverage is ~100%
across a span even when a single lesson skips a hard-to-place word. This walks every
staged draft in book/lesson order, tracks the pool, reports per-lesson coverage
(including inherited pool words placed), and writes the current owed pool to
mockups/drafts/_deferred.json (consumed by print_lesson_spec.py as carryover).

Usage: python3 mockups/coverage_ledger.py
"""
import importlib.util
import os, json, re, glob
import sys
def say(*parts, sep=" ", end="\n", file=None):
    stream = sys.stdout if file is None or file is sys.stdout else sys.stderr
    stream.write(sep.join(str(part) for part in parts) + end)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location(
    "build_lesson_data", os.path.join(ROOT, "mockups/build_lesson_data.py")
)
if _spec is None or _spec.loader is None:
    raise SystemExit("lesson builder did not load")
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
LS, _surf = _module.load_deck()


def ukey(unit):
    matched = re.match(r"B(\d)L(\d+)", unit)
    if matched is None:
        return (0, 0)
    return (int(matched.group(1)), int(matched.group(2)))


def apply_lesson(unit, union, pool):
    own = [row["w"] for row in LS.get(unit, [])]
    placed = [word for word in list(pool) if word in union]
    for word in placed:
        pool.pop(word, None)
    own_miss = [word for word in own if word not in union]
    for word in own_miss:
        pool.setdefault(word, unit)
    note = ("defer: " + " ".join(own_miss)) if own_miss else ""
    return own, placed, own_miss, note


def main():
    drafts = {}
    for fp in sorted(glob.glob(os.path.join(ROOT, "mockups/drafts", "B*L*.json"))):
        obj = json.load(open(fp, encoding="utf-8"))
        if obj.get("unit") and obj.get("readings"):
            drafts[obj["unit"]] = " ".join(r["text"] for r in obj["readings"])
    units = sorted(drafts, key=ukey)
    pool = {}
    placed_total = deferred_total = own_total = 0
    say(f"Coverage ledger — {len(units)} staged lessons, in order (hybrid: defer rolls forward)\n")
    say(f"{'unit':7}{'own cov':>9}{'pool placed':>13}{'new defer':>11}  notes")
    for unit in units:
        own, placed, own_miss, note = apply_lesson(unit, drafts[unit], pool)
        own_total += len(own)
        placed_total += len(placed)
        deferred_total += len(own_miss)
        say(f"{unit:7}{len(own)-len(own_miss):>4}/{len(own):<4}{len(placed):>13}{len(own_miss):>11}  {note}")
    say(f"\nTotals: own-vocab covered in-lesson {own_total-deferred_total}/{own_total} "
          f"({100*(own_total-deferred_total)/own_total:.1f}%) · "
          f"pool words later placed {placed_total} · still owed {len(pool)}")
    if pool:
        say("\nStill owed (place in an upcoming lesson where it fits):")
        for w, frm in sorted(pool.items(), key=lambda x: ukey(x[1])):
            say(f"  {w}   (deferred from {frm})")
    json.dump({"pool": list(pool), "detail": pool,
               "as_of": units[-1] if units else None},
              open(os.path.join(ROOT, "mockups/drafts/_deferred.json"), "w"),
              ensure_ascii=False, indent=1)
    say(f"\nwrote mockups/drafts/_deferred.json  (pool: {len(pool)} words)")


if __name__ == "__main__":
    main()
