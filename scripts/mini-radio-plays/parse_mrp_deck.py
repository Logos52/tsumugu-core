#!/usr/bin/env python3
"""Parse MTC Mini Radio Plays Anki deck (.apkg) into study-only TSV + field schema.

Usage:
  python3 scripts/mini-radio-plays/parse_mrp_deck.py [path/to/deck.apkg]

Default input: private/mrp-deck/deck.apkg
Outputs (gitignored):
  private/mrp-deck/parsed-notes.tsv
  private/mrp-deck/field-schema.md
"""
from __future__ import annotations

import csv
import json
import sqlite3
import sys
import tempfile
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_APKG = REPO / "private/mrp-deck/deck.apkg"
OUT_DIR = REPO / "private/mrp-deck"
FIELD_SEP = "\x1f"


def _collection_db(apkg: Path) -> Path:
    with zipfile.ZipFile(apkg) as zf:
        names = zf.namelist()
        for candidate in ("collection.anki21b", "collection.anki21", "collection.anki2"):
            if candidate in names:
                tmp = Path(tempfile.mkdtemp(prefix="mrp-deck-"))
                zf.extract(candidate, tmp)
                return tmp / candidate
    raise FileNotFoundError(f"No collection DB in {apkg}")


def _load_schema(conn: sqlite3.Connection) -> tuple[dict[int, str], dict[int, list[str]]]:
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    notetype_names: dict[int, str] = {}
    field_names: dict[int, list[str]] = {}

    if "notetypes" in tables:
        for nid, name in conn.execute("SELECT id, name FROM notetypes"):
            notetype_names[nid] = name
        for fid, ord_, name, ntid in conn.execute(
            "SELECT id, ord, name, ntid FROM fields ORDER BY ntid, ord"
        ):
            field_names.setdefault(ntid, []).append(name)
        return notetype_names, field_names

    row = conn.execute("SELECT models FROM col").fetchone()
    if not row or not row[0]:
        raise RuntimeError("Could not read note types from Anki collection")
    models = json.loads(row[0])
    for mid, model in models.items():
        nid = int(mid)
        notetype_names[nid] = model.get("name", f"model-{nid}")
        field_names[nid] = [f.get("name", f"field{i}") for i, f in enumerate(model.get("flds", []))]
    return notetype_names, field_names


def parse_apkg(apkg: Path) -> tuple[list[dict], dict[int, str], dict[int, list[str]]]:
    db_path = _collection_db(apkg)
    conn = sqlite3.connect(db_path)
    notetype_names, field_names = _load_schema(conn)

    rows: list[dict] = []
    for note_id, guid, mid, mod, usn, tags, flds, *_ in conn.execute(
        "SELECT id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data FROM notes ORDER BY id"
    ):
        fields = flds.split(FIELD_SEP) if flds else []
        rows.append(
            {
                "note_id": note_id,
                "guid": guid,
                "notetype_id": mid,
                "notetype": notetype_names.get(mid, str(mid)),
                "tags": tags.strip(),
                "fields": fields,
            }
        )
    conn.close()
    return rows, notetype_names, field_names


def write_outputs(
    rows: list[dict],
    notetype_names: dict[int, str],
    field_names: dict[int, list[str]],
) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    max_fields = max((len(r["fields"]) for r in rows), default=0)
    header = ["note_id", "notetype", "tags"] + [f"field_{i}" for i in range(max_fields)]

    tsv_path = OUT_DIR / "parsed-notes.tsv"
    with tsv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n")
        w.writerow(header)
        for row in rows:
            padded = row["fields"] + [""] * (max_fields - len(row["fields"]))
            w.writerow([row["note_id"], row["notetype"], row["tags"], *padded])

    schema_lines = [
        "# Mini Radio Plays — Anki field schema (study-only)",
        "",
        f"Parsed {len(rows)} notes from deck.",
        "",
        "## Note types",
        "",
    ]
    for nid, name in sorted(notetype_names.items(), key=lambda x: x[1]):
        labels = field_names.get(nid, [])
        schema_lines.append(f"### {name} (id={nid})")
        for i, label in enumerate(labels):
            schema_lines.append(f"- field_{i}: **{label}**")
        schema_lines.append("")

    tag_counts: dict[str, int] = {}
    lesson_tags: set[str] = set()
    for row in rows:
        for tag in row["tags"].split():
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
            if any(k in tag for k in ("課", "Lesson", "lesson", "L")):
                lesson_tags.add(tag)

    schema_lines.extend(
        [
            "## Coverage",
            "",
            f"- Total notes: {len(rows)}",
            f"- Note types: {len(notetype_names)}",
            f"- Distinct tags: {len(tag_counts)}",
            "",
            "### Tag histogram (top 30)",
            "",
        ]
    )
    for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1])[:30]:
        schema_lines.append(f"- `{tag}`: {count}")

    (OUT_DIR / "field-schema.md").write_text("\n".join(schema_lines) + "\n", encoding="utf-8")
    print(f"Wrote {tsv_path} ({len(rows)} rows)")
    print(f"Wrote {OUT_DIR / 'field-schema.md'}")


def main() -> int:
    apkg = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_APKG
    if not apkg.exists() or apkg.stat().st_size == 0:
        print(f"Missing deck: {apkg}", file=sys.stderr)
        print(
            "AnkiWeb download returned 404 (2026-06-23). Drop deck.apkg manually:\n"
            "  Anki desktop → Get Shared → search 'Mini Radio Plays' → Download\n"
            f"  → save as {DEFAULT_APKG}",
            file=sys.stderr,
        )
        return 1
    try:
        rows, notetype_names, field_names = parse_apkg(apkg)
    except zipfile.BadZipFile:
        print(f"Invalid apkg (not a zip): {apkg}", file=sys.stderr)
        print("Re-download via Anki desktop; curl URL is currently 404.", file=sys.stderr)
        return 1
    write_outputs(rows, notetype_names, field_names)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())