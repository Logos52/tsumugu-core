#!/usr/bin/env python3
"""Worker: single-file mlx-whisper transcribe + s2twp (invoked by transcribe_mrp.py)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import mlx_whisper
import opencc


def main() -> None:
    audio, json_out, txt_out, model, s2twp = sys.argv[1:6]
    conv = opencc.OpenCC(s2twp)

    result = mlx_whisper.transcribe(
        audio,
        path_or_hf_repo=model,
        language="zh",
        verbose=False,
    )

    segments = []
    lines: list[str] = []
    for seg in result.get("segments", []):
        text_s = conv.convert(seg.get("text", "").strip())
        if not text_s:
            continue
        segments.append(
            {
                "start": seg["start"],
                "end": seg["end"],
                "text": text_s,
            }
        )
        lines.append(text_s)

    payload = {
        "source": str(Path(audio).name),
        "model": model,
        "opencc": s2twp,
        "text": "\n".join(lines),
        "segments": segments,
    }

    Path(json_out).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(txt_out).write_text(payload["text"] + "\n", encoding="utf-8")
    print(f"  ✓ {len(lines)} segments, {len(payload['text'])} chars")


if __name__ == "__main__":
    main()