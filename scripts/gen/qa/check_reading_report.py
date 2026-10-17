"""Human-readable QA report."""
from __future__ import annotations

import sys

from check_reading_model import MULTIPLICITY_MIN


def say(*parts, sep=" ", end="\n", file=None):
    stream = sys.stdout if file is None or file is sys.stdout else sys.stderr
    stream.write(sep.join(str(part) for part in parts) + end)


def mark(ok):
    return "\033[32m✓\033[0m" if ok else "\033[33m⚠\033[0m"


def fail_mark():
    return "\033[31m✗\033[0m"


def print_report(rep):
    say_header(rep)
    say_readings(rep)
    say_coverage(rep)
    say_recycle(rep)
    say_multiplicity(rep)
    say_regression(rep)
    say_grammar(rep)
    say_ledger(rep)
    say_verdict(rep)


def say_header(rep):
    unit = rep["unit"]
    say(f"\n══ QA · {unit} · {rep['n_current_new']} new items · recycle≥{rep['recycle_min']} ══\n")


def say_readings(rep):
    say("Per reading")
    for row in rep["per_reading"]:
        leak = f"  {fail_mark()} IN-BAND LEAK: {' '.join(row['leaks'])}" if row["leaks"] else ""
        say(
            f"  {row['id']:<4} {row['format']:<6} {row['n_tokens']:>3} tok · "
            f"{row['sentences']} sent · openers {row['opener_ratio']} · "
            f"touches {len(row['touched_current'])} new{leak}"
        )
        if row["rep_ratio"] > 0.30 and row["rep_word"]:
            say(f"       {mark(False)} repetition: {row['rep_word']} = {int(row['rep_ratio']*100)}% of content")


def say_coverage(rep):
    cov = rep["coverage"]
    ok = not cov["missing"]
    line = f"\nCurrent-new union  {mark(ok) if ok else fail_mark()} {cov['covered']}/{cov['total']} content items"
    if cov["missing"]:
        line += f"  MISSING: {' '.join(cov['missing'])}"
    say(line)
    if cov["via_compound"]:
        notes = ", ".join(f"{word} ({via})" for word, via in cov["via_compound"].items())
        say(f"   (credited via compound: {notes})")


def say_recycle(rep):
    if rep["under_recycled"]:
        words = ", ".join(f"{word}×{count}" for word, count in rep["under_recycled"])
        say(f"Set recycle<{rep['recycle_min']}     {mark(False)} {words}")
        return
    say(f"Set recycle≥{rep['recycle_min']}     {mark(True)} every current content word")


def say_multiplicity(rep):
    if rep["low_multiplicity"]:
        words = ", ".join(f"{word}×{count}" for word, count in rep["low_multiplicity"])
        say(f"Multiplicity<{MULTIPLICITY_MIN}     {mark(False)} {words}")
        return
    say(f"Multiplicity≥{MULTIPLICITY_MIN}     {mark(True)} all current content words")


def say_regression(rep):
    say("\nRegression (content-token proportion by age)")
    for bucket in rep["regression"]:
        label = "current" if bucket["age"] == 0 else f"L-{bucket['age']}"
        say(
            f"  {label:<8} need ≥{bucket['required']*100:>4.1f}%   got {bucket['actual']*100:>4.1f}%"
            f"  ({bucket['tokens']} tok)  {mark(bucket['ok'])}"
        )


def say_grammar(rep):
    if not rep["grammar"]:
        return
    say("\nGrammar markers")
    for point, count in rep["grammar"]:
        say(f"  {point:<16} {count}×  {mark(count > 0)}")


def say_ledger(rep):
    say(f"\nEncounter ledger (lifetime touches, floor {rep['encounter_floor']}, proper nouns exempt)")
    if rep["encounter_below"]:
        say("  below floor (advisory — rare words OK if forcing hurts naturalness):")
        for word, count, intro in rep["encounter_below"]:
            say(f"    {word:<6} {count}×   (introduced {intro})")
        return
    say(f"  {mark(True)} every content word ≥ {rep['encounter_floor']} touches")


def say_verdict(rep):
    if rep["hard_fail"]:
        say(f"\n{fail_mark()} HARD FAIL — fix in-band leaks / coverage before shipping\n")
        return
    say("\n\033[32m✓ PASS\033[0m — objective gates clean; advisories above are for taste\n")
