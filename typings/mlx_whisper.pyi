from typing import TypedDict


class WhisperSegment(TypedDict):
    start: float
    end: float
    text: str


class WhisperTranscript(TypedDict, total=False):
    text: str
    segments: list[WhisperSegment]


def transcribe(
    audio: str,
    path_or_hf_repo: str = "",
    language: str = "",
    verbose: bool = False,
) -> WhisperTranscript: ...
