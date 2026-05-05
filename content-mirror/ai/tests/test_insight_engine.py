"""Unit tests for ai/engine/insight_engine.py — Amr."""

from __future__ import annotations

from unittest.mock import patch, MagicMock
import pytest

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from engine.insight_engine import generate_insights, _apply_rules


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _base_data(**overrides) -> dict:
    base = {
        "hook_score": 7.0,
        "pacing": "medium",
        "audio_quality": "good",
        "image_quality": "good",
        "silence_ratio": 0.1,
        "filler_word_ratio": 0.03,
        "hook_message_present": True,
        "face_detected": True,
        "subtitles_detected": True,
        "sharpness_score": 150.0,
        "brightness_score": 120.0,
        "wpm": 140,
        "weak_sections": [],
    }
    base.update(overrides)
    return base


# ── _apply_rules ──────────────────────────────────────────────────────────────

def test_no_insights_for_good_video():
    insights = _apply_rules(_base_data())
    assert insights == [], "Good video should produce no rule-based insights"


def test_weak_hook_score_below_4_is_high_severity():
    insights = _apply_rules(_base_data(hook_score=2.5))
    problems = [i["problem"] for i in insights]
    assert any("hook" in p.lower() for p in problems)
    hook_insight = next(i for i in insights if "hook" in i["problem"].lower())
    assert hook_insight["severity"] == "high"


def test_moderate_hook_score_is_medium_severity():
    insights = _apply_rules(_base_data(hook_score=5.0))
    hook_insight = next((i for i in insights if "hook" in i["problem"].lower()), None)
    assert hook_insight is not None
    assert hook_insight["severity"] == "medium"


def test_slow_pacing_produces_insight():
    insights = _apply_rules(_base_data(pacing="slow"))
    assert any("pacing" in i["problem"].lower() for i in insights)


def test_high_silence_ratio_produces_insight():
    insights = _apply_rules(_base_data(silence_ratio=0.6))
    assert any("silence" in i["problem"].lower() for i in insights)


def test_poor_audio_quality_is_high_severity():
    insights = _apply_rules(_base_data(audio_quality="poor"))
    audio_insight = next((i for i in insights if "audio" in i["problem"].lower()), None)
    assert audio_insight is not None
    assert audio_insight["severity"] == "high"


def test_high_filler_ratio_produces_insight():
    insights = _apply_rules(_base_data(filler_word_ratio=0.15))
    assert any("filler" in i["problem"].lower() for i in insights)


def test_missing_hook_message_is_high_severity():
    insights = _apply_rules(_base_data(hook_message_present=False))
    insight = next((i for i in insights if "message" in i["problem"].lower()), None)
    assert insight is not None
    assert insight["severity"] == "high"


def test_no_face_detected_produces_insight():
    insights = _apply_rules(_base_data(face_detected=False))
    assert any("face" in i["problem"].lower() or "human" in i["problem"].lower() for i in insights)


def test_missing_subtitles_produces_insight():
    insights = _apply_rules(_base_data(subtitles_detected=False))
    assert any("caption" in i["problem"].lower() or "subtitle" in i["problem"].lower() for i in insights)


def test_low_sharpness_produces_insight():
    insights = _apply_rules(_base_data(sharpness_score=10.0))
    assert any("sharp" in i["problem"].lower() for i in insights)


def test_overexposed_brightness_produces_insight():
    insights = _apply_rules(_base_data(brightness_score=245.0))
    assert any("light" in i["problem"].lower() or "bright" in i["problem"].lower() or "dark" in i["problem"].lower() for i in insights)


def test_too_dark_brightness_produces_insight():
    insights = _apply_rules(_base_data(brightness_score=10.0))
    assert any("dark" in i["problem"].lower() or "light" in i["problem"].lower() for i in insights)


def test_each_insight_has_required_fields():
    insights = _apply_rules(_base_data(hook_score=2.0, pacing="slow", silence_ratio=0.7))
    for insight in insights:
        assert "id" in insight
        assert "problem" in insight
        assert "cause" in insight
        assert "evidence" in insight
        assert insight["severity"] in ("low", "medium", "high")


# ── generate_insights (full pipeline with mocked Gemini) ─────────────────────

def test_generate_insights_caps_at_8():
    data = _base_data(
        hook_score=2.0, pacing="slow", silence_ratio=0.7,
        audio_quality="poor", filler_word_ratio=0.2,
        hook_message_present=False, face_detected=False,
        subtitles_detected=False, sharpness_score=5.0, brightness_score=5.0,
    )
    with patch("engine.insight_engine.genai"):
        insights = generate_insights(data)
    assert len(insights) <= 8


def test_generate_insights_returns_list_on_gemini_failure():
    data = _base_data(hook_score=3.0)
    with patch("engine.insight_engine.genai", side_effect=Exception("API down")):
        insights = generate_insights(data)
    assert isinstance(insights, list)


def test_generate_insights_sorted_high_first():
    data = _base_data(
        hook_score=2.0, audio_quality="poor", hook_message_present=False
    )
    with patch("engine.insight_engine.genai"):
        insights = generate_insights(data)
    severity_order = {"high": 0, "medium": 1, "low": 2}
    severities = [severity_order[i["severity"]] for i in insights]
    assert severities == sorted(severities)
