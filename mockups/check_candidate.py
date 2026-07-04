#!/usr/bin/env python3
"""Check a candidate lesson's readings against the coverage equation + size floor.
HYBRID coverage: 100% is the target, but up to --defer awkward vocab words may slip
to a later lesson (they roll forward via coverage_ledger.py). Grammar stays 100%.

Usage: python3 mockups/check_candidate.py B1L02 mockups/drafts/B1L02.json --min 450 --defer 3
readings json: {"unit":..,"readings":[{"id","format","text"}...]} or a bare list.
Exit 0 iff exactly 3 articles, grammar 100%, each >= --min Han, and missing vocab <= --defer."""
import os, json, re, sys, argparse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ns = {"__file__": os.path.join(ROOT, "mockups/build_lesson_data.py"), "__name__": "x"}
exec(compile(open(ns["__file__"], encoding="utf-8").read(), "b", "exec"), ns)
LS, surf = ns["load_deck"](); gram_hit = ns["gram_hit"]
H = json.load(open(os.path.join(ROOT, "mockups/lesson-highlights.json"), encoding="utf-8"))
HAN = re.compile(r"[一-鿿]")
def hc(t):
    tot = 0
    for l in t.split("\n"):
        idx = l.find("：")
        body = l[idx + 1:] if 0 <= idx <= 8 else l   # strip only a leading speaker label
        tot += len(HAN.findall(body))
    return tot
ap = argparse.ArgumentParser(); ap.add_argument("unit"); ap.add_argument("readings")
ap.add_argument("--min", type=int, default=250, help="per-article Han floor")
ap.add_argument("--defer", type=int, default=3, help="max own-vocab words allowed to defer to a later lesson")
ap.add_argument("--carry", default="", help="comma-separated carryover words (deferred from earlier) to also try to cover")
a = ap.parse_args()
d = json.load(open(a.readings, encoding="utf-8"))
reads = d["readings"] if isinstance(d, dict) and "readings" in d else d
u = a.unit
own = [v["w"] for v in LS[u]]
carry = [w for w in (a.carry.split(",") if a.carry else []) if w.strip()]
gram = H[u]["grammar"]
union = " ".join(r["text"] for r in reads)
sizes = [hc(r["text"]) for r in reads]
own_miss = [w for w in own if w not in union]
carry_miss = [w for w in carry if w not in union]
gmiss = [g["title"] for g in gram if not gram_hit(g, union)]
size_ok = all(s >= a.min for s in sizes)
ok = (len(reads) == 3) and not gmiss and size_ok and len(own_miss) <= a.defer
print(f"{u}: articles={len(reads)} sizes={sizes} (floor {a.min}) "
      f"vocab={len(own) - len(own_miss)}/{len(own)} grammar={len(gram) - len(gmiss)}/{len(gram)} "
      f"defer_budget={a.defer}")
if own_miss:
    tag = "deferred → later lesson (within budget)" if len(own_miss) <= a.defer else f"OVER BUDGET by {len(own_miss) - a.defer}"
    print(f"  MISSING vocab ({len(own_miss)}): {' '.join(own_miss)}   [{tag}]")
if carry:
    line = f"  carryover placed: {len(carry) - len(carry_miss)}/{len(carry)}"
    if carry_miss:
        line += f"   still owed: {' '.join(carry_miss)}"
    print(line)
if gmiss:
    print(f"  MISSING grammar: {'; '.join(gmiss)}   [grammar must be 100%]")
under = [reads[i]["id"] for i, s in enumerate(sizes) if s < a.min]
if under:
    print(f"  UNDER floor: {under}")
print("RESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
