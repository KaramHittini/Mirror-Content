"""
Audio quality & speech analyzer — Nour Alfarraj's primary file.

Responsibilities:
- Extract audio from video
- RMS energy / volume consistency
- Silence ratio detection
- SNR approximation
- Whisper transcription + word-level timestamps
- Speaking pace (WPM), filler word detection
- Detect if main message is stated in first 5 seconds
"""

from __future__ import annotations

import os
import re
import tempfile
from dataclasses import dataclass

import librosa
import numpy as np
from moviepy.editor import VideoFileClip


@dataclass
class AudioAnalysisResult:
    audio_quality: str               # poor / average / good / excellent
    silence_ratio: float             # 0.0–1.0
    snr_db: float
    transcript: str
    wpm: int
    filler_word_ratio: float         # 0.0–1.0
    hook_message_present: bool


FILLER_WORDS = {"um", "uh", "like", "you know", "basically", "literally", "actually", "so", "right"}


def analyze_audio(video_path: str, language: str | None = None) -> AudioAnalysisResult:
    """
    Full audio analysis pipeline.

    Args:
        video_path: Path to the video file.
        language: Language code for Whisper ('ar', 'en', or None for auto-detect).

    Returns:
        AudioAnalysisResult with quality classification and speech metrics.
    """
    audio_path = _extract_audio(video_path)
    try:
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            return AudioAnalysisResult(
                audio_quality="unknown",
                silence_ratio=0.0,
                snr_db=0.0,
                transcript="",
                wpm=0,
                filler_word_ratio=0.0,
                hook_message_present=False,
            )
        y, sr = librosa.load(audio_path, sr=16000, mono=True)

        rms = _compute_rms(y)
        silence_ratio = _compute_silence_ratio(y, sr)
        snr_db = _estimate_snr(y)
        audio_quality = _classify_audio_quality(rms, silence_ratio, snr_db)

        transcript_data = _transcribe(audio_path, language=language)
        wpm = _compute_wpm(transcript_data["text"], transcript_data.get("duration", 60))
        filler_ratio = _compute_filler_ratio(transcript_data["text"])
        hook_message_present = _check_hook_message(transcript_data, seconds=5)

        return AudioAnalysisResult(
            audio_quality=audio_quality,
            silence_ratio=round(silence_ratio, 3),
            snr_db=round(snr_db, 1),
            transcript=transcript_data["text"],
            wpm=wpm,
            filler_word_ratio=round(filler_ratio, 3),
            hook_message_present=hook_message_present,
        )
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)


def _extract_audio(video_path: str) -> str:
    """
    Extract audio track to a temporary WAV file.

    Returns the temp file path even if no audio track exists — the caller
    checks os.path.getsize() > 0 before loading, so an empty file is safe.

    Raises:
        RuntimeError: If the file cannot be opened at all by moviepy.
    """
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    clip = VideoFileClip(video_path)
    if clip.audio is None:
        clip.close()
        return tmp.name  # empty file — analyze_audio caller must guard
    clip.audio.write_audiofile(tmp.name, fps=16000, nbytes=2, codec="pcm_s16le", verbose=False, logger=None)
    clip.close()
    return tmp.name


def _compute_rms(y: np.ndarray) -> float:
    """Root mean square energy — proxy for overall volume level."""
    return float(np.sqrt(np.mean(y ** 2)))


def _compute_silence_ratio(y: np.ndarray, sr: int, threshold_db: float = -40.0) -> float:
    """Fraction of audio that is below the silence threshold."""
    intervals = librosa.effects.split(y, top_db=abs(threshold_db))
    voiced_samples = sum(end - start for start, end in intervals)
    return 1.0 - (voiced_samples / len(y))


def _estimate_snr(y: np.ndarray) -> float:
    """
    Approximate SNR by comparing RMS of the loudest 10% vs quietest 10% of frames.
    Returns value in decibels.
    """
    frame_rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    sorted_rms = np.sort(frame_rms)
    noise_floor = float(np.mean(sorted_rms[: max(1, len(sorted_rms) // 10)]))
    signal_peak = float(np.mean(sorted_rms[-(len(sorted_rms) // 10) :]))
    if noise_floor < 1e-10:
        return 60.0
    return float(20 * np.log10(signal_peak / noise_floor))


def _classify_audio_quality(rms: float, silence_ratio: float, snr_db: float) -> str:
    score = 0
    if snr_db >= 30:
        score += 3
    elif snr_db >= 20:
        score += 2
    elif snr_db >= 10:
        score += 1

    if silence_ratio < 0.2:
        score += 2
    elif silence_ratio < 0.4:
        score += 1

    if rms > 0.05:
        score += 1

    if score >= 5:
        return "excellent"
    elif score >= 3:
        return "good"
    elif score >= 2:
        return "average"
    return "poor"


_whisper_model = None


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        _whisper_model = whisper.load_model("base")
    return _whisper_model


def _transcribe(audio_path: str, language: str | None = None) -> dict:
    """
    Transcribe audio using OpenAI Whisper (local model, cached per worker process).
    language=None triggers Whisper auto-detection. Falls back to empty transcript on failure.
    """
    try:
        model = _get_whisper_model()
        kwargs: dict = {"word_timestamps": True, "initial_prompt": "Ignore background music and focus on speech only"}
        if language:
            kwargs["language"] = language
        result = model.transcribe(audio_path, **kwargs)
        duration = result.get("segments", [{}])[-1].get("end", 60) if result.get("segments") else 60
        return {"text": result.get("text", "").strip(), "segments": result.get("segments", []), "duration": duration}
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
    filler_count = sum(1 for w in words if re.sub(r"[^a-z\u0600-\u06FF]", "", w) in FILLER_WORDS)
    return filler_count / len(words)


def _check_hook_message(transcript_data: dict, seconds: float = 5.0) -> bool:
    """
    Check whether any speech occurs in the first `seconds` of the video.
    A hook message is present if at least 5 words are spoken within that window.
    """
    segments = transcript_data.get("segments", [])
    early_words: list[str] = []
    for seg in segments:
        if seg.get("start", 999) <= seconds:
            early_words.extend(seg.get("text", "").split())
    return len(early_words) >= 5