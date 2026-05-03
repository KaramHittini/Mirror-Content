"""
Unit tests for transcription_analyzer.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from transcription_analyzer import (
    _compute_wpm,
    _compute_filler_ratio,
    _check_hook_message,
)


def test_wpm_normal():
    transcript = "hello this is a test of the words per minute calculation"
    wpm = _compute_wpm(transcript, duration_seconds=30)
    assert wpm == 22, f"Expected 22, got {wpm}"
    print("✅ test_wpm_normal passed")


def test_wpm_empty():
    wpm = _compute_wpm("", duration_seconds=60)
    assert wpm == 0, f"Expected 0, got {wpm}"
    print("✅ test_wpm_empty passed")


def test_filler_ratio_high():
    transcript = "um I like basically uh want to say um something"
    ratio = _compute_filler_ratio(transcript)
    assert ratio > 0.3, f"Expected > 0.3, got {ratio}"
    print("✅ test_filler_ratio_high passed")


def test_filler_ratio_clean():
    transcript = "today we will discuss artificial intelligence"
    ratio = _compute_filler_ratio(transcript)
    assert ratio == 0.0, f"Expected 0.0, got {ratio}"
    print("✅ test_filler_ratio_clean passed")


def test_hook_present():
    segments = [
        {"start": 0.0, "end": 3.0, "text": "welcome everyone today we talk about AI"},
    ]
    assert _check_hook_message(segments, seconds=5) == True
    print("✅ test_hook_present passed")


def test_hook_absent():
    segments = [
        {"start": 6.0, "end": 10.0, "text": "welcome everyone today we talk about AI"},
    ]
    assert _check_hook_message(segments, seconds=5) == False
    print("✅ test_hook_absent passed")


if __name__ == "__main__":
    test_wpm_normal()
    test_wpm_empty()
    test_filler_ratio_high()
    test_filler_ratio_clean()
    test_hook_present()
    test_hook_absent()
    print("\n🎉 All tests passed!")