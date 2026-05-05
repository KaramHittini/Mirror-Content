"""Unit tests for ai/analyzers/audio_analyzer.py — Nour Alfarraj.

All tests mock heavy I/O (moviepy, librosa, whisper) so they run without
any real video or audio files.
"""

from __future__ import annotations

import sys
import os
from unittest.mock import patch, MagicMock
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from analyzers.audio_analyzer import (
    _compute_rms,
    _compute_silence_ratio,
    _estimate_snr,
    _classify_audio_quality,
    _compute_wpm,
    _compute_filler_ratio,
    _check_hook_message,
    analyze_audio,
)


# ── Pure computation helpers ──────────────────────────────────────────────────

def _sine_wave(freq: float = 440.0, sr: int = 16000, duration: float = 1.0, amp: float = 0.5) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    return (np.sin(2 * np.pi * freq * t) * amp).astype(np.float32)


def test_rms_nonzero_signal():
    y = _sine_wave(amp=0.5)
    assert _compute_rms(y) > 0


def test_rms_silence():
    y = np.zeros(16000, dtype=np.float32)
    assert _compute_rms(y) == 0.0


def test_silence_ratio_silent_audio_is_high():
    y = np.zeros(16000, dtype=np.float32)
    ratio = _compute_silence_ratio(y, 16000)
    assert ratio > 0.9


def test_silence_ratio_loud_audio_is_low():
    y = _sine_wave(amp=0.8, duration=2.0)
    ratio = _compute_silence_ratio(y, 16000)
    assert ratio < 0.5


def test_snr_pure_signal_is_high():
    y = _sine_wave(amp=0.8)
    snr = _estimate_snr(y)
    assert snr > 0.0


def test_snr_silence_returns_60():
    y = np.zeros(16000, dtype=np.float32)
    snr = _estimate_snr(y)
    assert snr == 60.0


# ── _classify_audio_quality ───────────────────────────────────────────────────

def test_classify_excellent():
    quality = _classify_audio_quality(rms=0.1, silence_ratio=0.1, snr_db=35.0)
    assert quality == "excellent"


def test_classify_poor():
    quality = _classify_audio_quality(rms=0.01, silence_ratio=0.7, snr_db=5.0)
    assert quality == "poor"


def test_classify_good():
    quality = _classify_audio_quality(rms=0.06, silence_ratio=0.15, snr_db=25.0)
    assert quality in ("good", "excellent")


# ── _compute_wpm ──────────────────────────────────────────────────────────────

def test_wpm_normal_speech():
    transcript = " ".join(["word"] * 150)
    wpm = _compute_wpm(transcript, duration_seconds=60.0)
    assert wpm == 150


def test_wpm_empty_transcript():
    assert _compute_wpm("", 60.0) == 0


def test_wpm_short_duration_doesnt_crash():
    transcript = "hello world"
    wpm = _compute_wpm(transcript, duration_seconds=0.1)
    assert isinstance(wpm, int)


# ── _compute_filler_ratio ─────────────────────────────────────────────────────

def test_filler_ratio_no_fillers():
    assert _compute_filler_ratio("the cat sat on the mat") == 0.0


def test_filler_ratio_all_fillers():
    ratio = _compute_filler_ratio("um uh um uh")
    assert ratio == 1.0


def test_filler_ratio_mixed():
    ratio = _compute_filler_ratio("um this is a good point")
    assert 0.0 < ratio < 1.0


def test_filler_ratio_empty():
    assert _compute_filler_ratio("") == 0.0


# ── _check_hook_message ───────────────────────────────────────────────────────

def _seg(start: float, text: str) -> dict:
    return {"start": start, "end": start + 2.0, "text": text}


def test_hook_message_present_when_enough_words_early():
    data = {"segments": [_seg(1.0, "Welcome to today's video about growing your channel")]}
    assert _check_hook_message(data, seconds=5.0) is True


def test_hook_message_absent_when_few_words():
    data = {"segments": [_seg(0.5, "Hey")]}
    assert _check_hook_message(data, seconds=5.0) is False


def test_hook_message_absent_when_speech_starts_late():
    data = {"segments": [_seg(10.0, "Welcome to today's video about growing your channel fast")]}
    assert _check_hook_message(data, seconds=5.0) is False


def test_hook_message_empty_segments():
    assert _check_hook_message({"segments": []}, seconds=5.0) is False


# ── analyze_audio (integration — all I/O mocked) ─────────────────────────────

def test_analyze_audio_returns_result():
    y = _sine_wave(amp=0.5, duration=10.0)

    mock_transcript = {
        "text": "This video will show you how to grow your channel fast today",
        "segments": [{"start": 0.5, "end": 4.0, "text": "This video will show you how to grow your channel fast today"}],
        "duration": 10.0,
    }

    with patch("analyzers.audio_analyzer._extract_audio", return_value="/tmp/fake.wav"), \
         patch("analyzers.audio_analyzer.librosa.load", return_value=(y, 16000)), \
         patch("analyzers.audio_analyzer._transcribe", return_value=mock_transcript), \
         patch("os.path.exists", return_value=True), \
         patch("os.path.getsize", return_value=1024), \
         patch("os.remove"):

        result = analyze_audio("/fake/video.mp4")

    assert result.audio_quality in ("poor", "average", "good", "excellent")
    assert 0.0 <= result.silence_ratio <= 1.0
    assert isinstance(result.wpm, int)
    assert 0.0 <= result.filler_word_ratio <= 1.0
    assert isinstance(result.hook_message_present, bool)
    assert isinstance(result.transcript, str)


def test_analyze_audio_handles_extraction_failure():
    """If librosa.load raises, analyze_audio should propagate the error."""
    with patch("analyzers.audio_analyzer._extract_audio", return_value="/tmp/fake.wav"), \
         patch("analyzers.audio_analyzer.librosa.load", side_effect=RuntimeError("load failed")), \
         patch("os.path.exists", return_value=True), \
         patch("os.path.getsize", return_value=1024), \
         patch("os.remove"):

        with pytest.raises(RuntimeError):
            analyze_audio("/fake/video.mp4")
