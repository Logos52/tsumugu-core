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
import os, json, re, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ns = {"__file__": os.path.join(ROOT, "mockups/build_lesson_data.py"), "__name__": "x"}
exec(compile(open(ns["__file__"], encoding="utf-8").read(), "b", "exec"), ns)
LS, _ = ns["load_deck"]()


def ukey(u):
    m = re.match(r"B(\d)L(\d+)", u)
    return (int(m.group(1)), int(m.group(2)))


def main():
    drafts = {}
    for fp in sorted(glob.glob(os.path.join(ROOT, "mockups/drafts", "B*L*.json"))):
        obj = json.load(open(fp, encoding="utf-8"))
        if obj.get("unit") and obj.get("readings"):
            drafts[obj["unit"]] = " ".join(r["text"] for r in obj["readings"])
    units = sorted(drafts, key=ukey)
    pool = {}          # word -> unit where first deferred
    placed_total = deferred_total = own_total = 0
    print(f"Coverage ledger — {len(units)} staged lessons, in order (hybrid: defer rolls forward)\n")
    print(f"{'unit':7}{'own cov':>9}{'pool placed':>13}{'new defer':>11}  notes")
    for u in units:
        union = drafts[u]
        own = [v["w"] for v in LS.get(u, [])]
        placed = [w for w in list(pool) if w in union]
        for w in placed:
            pool.pop(w, None)
        own_miss = [w for w in own if w not in union]
        for w in own_miss:
            pool.setdefault(w, u)
        own_total += len(own); placed_total += len(placed); deferred_total += len(own_miss)
        note = ""
        if own_miss:
            note = "defer: " + " ".join(own_miss)
        print(f"{u:7}{len(own)-len(own_miss):>4}/{len(own):<4}{len(placed):>13}{len(own_miss):>11}  {note}")
    print(f"\nTotals: own-vocab covered in-lesson {own_total-deferred_total}/{own_total} "
          f"({100*(own_total-deferred_total)/own_total:.1f}%) · "
          f"pool words later placed {placed_total} · still owed {len(pool)}")
    if pool:
        print("\nStill owed (place in an upcoming lesson where it fits):")
        for w, frm in sorted(pool.items(), key=lambda x: ukey(x[1])):
            print(f"  {w}   (deferred from {frm})")
    json.dump({"pool": list(pool), "detail": pool,
               "as_of": units[-1] if units else None},
              open(os.path.join(ROOT, "mockups/drafts/_deferred.json"), "w"),
              ensure_ascii=False, indent=1)
    print(f"\nwrote mockups/drafts/_deferred.json  (pool: {len(pool)} words)")


if __name__ == "__main__":
    main()
