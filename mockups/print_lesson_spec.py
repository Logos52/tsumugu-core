#!/usr/bin/env python3
"""Print the authoring spec for a Book-1 lesson: title/theme/objectives/vocab/grammar.
Usage: python3 mockups/print_lesson_spec.py B1L02"""
import os, json, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ns={"__file__":os.path.join(ROOT,"mockups/build_lesson_data.py"),"__name__":"x"}
exec(compile(open(ns["__file__"],encoding="utf-8").read(),"b","exec"),ns)
LS,surf=ns["load_deck"]()
H=json.load(open(os.path.join(ROOT,"mockups/lesson-highlights.json"),encoding="utf-8"))
u=sys.argv[1]
v=LS[u]; h=H.get(u,{})
def greq(g):
    if g.get("pat")=="anota": return "use an A-not-A question (X不X, e.g. 是不是/要不要)"
    if g.get("pat")=="v1v": return "use a V一V form (看一看/找一找)"
    if g.get("re"): return "realize this construction naturally (the point's name shows the pattern)"
    if g.get("m"): return f"must contain 「{g['m']}」"
    if g.get("any"): return "use at least one of: " + " ".join(g["any"])
    return ""
print(f"UNIT {u}  —  {h.get('title','?')}  (theme: {h.get('theme','?')})")
print("OBJECTIVES:")
for o in h.get("objectives",[]): print("  -",o)
print(f"\nVOCAB ({len(v)}) — EVERY word must appear at least once across the 3-article union:")
for x in v: print(f"  {x['w']:5} {x['py']:13} {x['pos']:5} {x['g']}")
print(f"\nGRAMMAR ({len(h.get('grammar',[]))}) — the union must satisfy each point (grammar is 100%, no deferral):")
for g in h.get("grammar",[]): print(f"  • {g['title']}: {greq(g)}")

# Hybrid coverage: words deferred from earlier lessons (carryover pool) — place them
# here if they fit naturally. Cover the lesson's own vocab; up to 3 awkward words may
# defer to a later lesson (run coverage_ledger.py after staging to roll the pool).
dpath=os.path.join(ROOT,"mockups/drafts/_deferred.json")
pool=[]
if os.path.exists(dpath):
    try: pool=json.load(open(dpath,encoding="utf-8")).get("pool",[])
    except Exception: pool=[]
if pool:
    print(f"\nCARRYOVER ({len(pool)}) — deferred from earlier lessons; include any that fit naturally:")
    print("  " + " ".join(pool))
print("\nCOVERAGE RULE: cover the lesson's own vocab; you MAY defer up to 3 genuinely "
      "awkward words to a later lesson rather than force them — naturalness wins. Grammar must be 100%.")
