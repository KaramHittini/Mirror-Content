"""Unit tests for ai/engine/recommendation_engine.py — Amr."""

from __future__ import annotations

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from engine.recommendation_engine import generate_recommendations, _match_problem_to_key


# ── _match_problem_to_key ─────────────────────────────────────────────────────

def test_hook_keyword_matches():
    assert _match_problem_to_key("weak opening hook — high early drop-off risk") == "hook"


def test_slow_pacing_keyword_matches():
    assert _match_problem_to_key("slow pacing likely reduces mid-video retention") == "slow_pacing"


def test_silence_keyword_matches():
    assert _match_problem_to_key("excessive silence gaps hurt engagement") == "silence"


def test_audio_quality_keyword_matches():
    assert _match_problem_to_key("poor audio quality — viewers may tune out") == "audio_quality"


def test_filler_keyword_matches():
    assert _match_problem_to_key("high filler word usage reduces perceived authority") == "filler_words"


def test_hook_message_keyword_matches():
    assert _match_problem_to_key("main message not stated in first 5 seconds") == "hook_message"


def test_face_keyword_matches():
    assert _match_problem_to_key("no human presence detected") == "no_face"


def test_subtitle_keyword_matches():
    assert _match_problem_to_key("missing captions reduce accessibility") == "subtitles"


def test_sharpness_keyword_matches():
    assert _match_problem_to_key("low visual sharpness signals poor production quality") == "sharpness"


def test_lighting_keyword_matches():
    assert _match_problem_to_key("lighting is too dark") == "lighting"


def test_unrecognised_problem_returns_none():
    assert _match_problem_to_key("some completely unknown issue xyz") is None


# ── generate_recommendations ──────────────────────────────────────────────────

def _make_insight(problem: str, severity: str = "medium") -> dict:
    return {"id": "abc", "problem": problem, "cause": "test", "evidence": "test", "severity": severity}


def test_returns_list():
    recs = generate_recommendations([])
    assert isinstance(recs, list)


def test_empty_insights_gives_empty_recommendations():
    assert generate_recommendations([]) == []


def test_each_recommendation_has_required_fields():
    insights = [_make_insight("weak opening hook"), _make_insight("missing captions")]
    recs = generate_recommendations(insights)
    for rec in recs:
        assert "id" in rec
        assert "title" in rec
        assert "description" in rec
        assert "example" in rec
        assert "priority" in rec
        assert "category" in rec


def test_no_duplicate_recommendations():
    insights = [
        _make_insight("weak opening hook"),
        _make_insight("hook score is low"),   # both match "hook"
    ]
    recs = generate_recommendations(insights)
    titles = [r["title"] for r in recs]
    assert len(titles) == len(set(titles)), "Duplicate recommendations returned"


def test_recommendations_sorted_by_priority():
    insights = [
        _make_insight("missing captions"),       # priority 2
        _make_insight("weak opening hook"),       # priority 1
        _make_insight("high filler word usage"),  # priority 3
    ]
    recs = generate_recommendations(insights)
    priorities = [r["priority"] for r in recs]
    assert priorities == sorted(priorities)


def test_caps_at_six():
    insights = [
        _make_insight("weak opening hook"),
        _make_insight("slow pacing"),
        _make_insight("excessive silence"),
        _make_insight("poor audio quality"),
        _make_insight("high filler word usage"),
        _make_insight("main message not stated"),
        _make_insight("no human presence"),
        _make_insight("missing captions"),
    ]
    recs = generate_recommendations(insights)
    assert len(recs) <= 6


def test_unrecognised_insight_is_skipped():
    insights = [_make_insight("some completely unknown issue xyz")]
    recs = generate_recommendations(insights)
    assert recs == []
