"""
Transcription analyzer — Nour Alfarraj

Responsibilities:
- Whisper-based speech-to-text transcription
- Word-level timestamp extraction
- Speaking pace (WPM)
- Filler word detection and ratio
- Hook message presence detection (first 5 seconds)
"""

from __future__ import annotations

import re
from dataclasses import dataclass

FILLER_WORDS = {
    # English
    "um", "uh", "like", "you know", "basically", "so",
    # Arabic
    "يعني", "اممم", "آآآه", "إيه", "هاه"
}


@dataclass
class TranscriptionResult:
    transcript: str
    wpm: int
    filler_word_ratio: float
    hook_message_present: bool


def analyze_transcription(audio_path: str, language: str = "ar") -> TranscriptionResult:
    """
    Run Whisper transcription pipeline on an audio file.

    Args:
        audio_path: Path to a WAV audio file (16kHz mono recommended).
        language: Language code ('ar', 'en', or None for auto-detect).

    Returns:
        TranscriptionResult with transcript and speech quality metrics.
    """
    transcript_data = _transcribe(audio_path, language=language)
    text = transcript_data["text"]
    duration = transcript_data.get("duration", 60)
    segments = transcript_data.get("segments", [])

    return TranscriptionResult(
        transcript=text,
        wpm=_compute_wpm(text, duration),
        filler_word_ratio=round(_compute_filler_ratio(text), 3),
        hook_message_present=_check_hook_message(segments, seconds=5.0),
    )


def _transcribe(audio_path: str, language: str = "ar") -> dict:
    """
    Transcribe audio using OpenAI Whisper (local base model).
    Falls back to empty result on failure.
    """
    try:
        import whisper
        model = whisper.load_model("base")
        result = model.transcribe(
            audio_path,
            word_timestamps=True,
            language=language,
            initial_prompt="تجاهل الموسيقى وركز على الكلام فقط" if language == "ar" else "Ignore background music and focus on speech only"
        )
        segments = result.get("segments", [])
        duration = segments[-1].get("end", 60) if segments else 60
        return {
            "text": result.get("text", "").strip(),
            "segments": segments,
            "duration": duration,
        }
    except Exception:
        return {"text": "", "segments": [], "duration": 60}


def _compute_wpm(transcript: str, duration_seconds: float) -> int:
    """Words per minute from transcript and video duration."""
    words = len(transcript.split())
    minutes = max(duration_seconds / 60, 0.01)
    return int(words / minutes)


def _compute_filler_ratio(transcript: str) -> float:
    """Ratio of filler words to total words."""
    words = transcript.lower().split()
    if not words:
        return 0.0
    filler_count = sum(
        1 for w in words
        if re.sub(r"[^a-z\u0600-\u06FF]", "", w) in FILLER_WORDS
    )
    return filler_count / len(words)


def _check_hook_message(segments: list[dict], seconds: float = 5.0) -> bool:
    """
    Detect whether the speaker delivers a message in the opening seconds.
    A hook is present if at least 5 words are spoken within the first `seconds`.
    """
    early_words: list[str] = []
    for seg in segments:
        if seg.get("start", 999) <= seconds:
            early_words.extend(seg.get("text", "").split())
    return len(early_words) >= 5