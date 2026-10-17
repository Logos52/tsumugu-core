#!/usr/bin/env python3
"""Print the authoring spec for a Book-1 lesson: title/theme/objectives/vocab/grammar.
Usage: python3 mockups/print_lesson_spec.py B1L02"""
import importlib.util
import os, json, sys
def say(*parts, sep=" ", end="\n", file=None):
    stream = sys.stdout if file is None or file is sys.stdout else sys.stderr
    stream.write(sep.join(str(part) for part in parts) + end)

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location(
    "build_lesson_data", os.path.join(ROOT, "mockups/build_lesson_data.py")
)
if _spec is None or _spec.loader is None:
    raise SystemExit("lesson builder did not load")
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
LS, surf = _module.load_deck()
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
say(f"UNIT {u}  —  {h.get('title','?')}  (theme: {h.get('theme','?')})")
say("OBJECTIVES:")
for o in h.get("objectives",[]): say("  -",o)
say(f"\nVOCAB ({len(v)}) — EVERY word must appear at least once across the 3-article union:")
for x in v: say(f"  {x['w']:5} {x['py']:13} {x['pos']:5} {x['g']}")
say(f"\nGRAMMAR ({len(h.get('grammar',[]))}) — the union must satisfy each point (grammar is 100%, no deferral):")
for g in h.get("grammar",[]): say(f"  • {g['title']}: {greq(g)}")

dpath=os.path.join(ROOT,"mockups/drafts/_deferred.json")
pool=[]
if os.path.exists(dpath):
    try: pool=json.load(open(dpath,encoding="utf-8")).get("pool",[])
    except (OSError, json.JSONDecodeError, UnicodeError, AttributeError): pool=[]
if pool:
    say(f"\nCARRYOVER ({len(pool)}) — deferred from earlier lessons; include any that fit naturally:")
    say("  " + " ".join(pool))
say("\nCOVERAGE RULE: cover the lesson's own vocab; you MAY defer up to 3 genuinely "
      "awkward words to a later lesson rather than force them — naturalness wins. Grammar must be 100%.")
