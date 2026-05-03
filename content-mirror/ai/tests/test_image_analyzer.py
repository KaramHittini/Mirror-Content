"""Unit tests for ai/analyzers/image_analyzer.py — Noor Adili.

All tests use synthetic numpy frames so no real video is needed.
"""

from __future__ import annotations

import sys
import os
from unittest.mock import patch, MagicMock
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from analyzers.image_analyzer import (
    _compute_sharpness,
    _compute_brightness,
    _compute_stability,
    _classify_image_quality,
    analyze_image,
)


# ── Synthetic frame helpers ───────────────────────────────────────────────────

def _solid_frame(h: int = 100, w: int = 100, bgr: tuple = (128, 128, 128)) -> np.ndarray:
    """Solid-colour frame — zero sharpness (no edges)."""
    frame = np.zeros((h, w, 3), dtype=np.uint8)
    frame[:] = bgr
    return frame


def _checkerboard_frame(h: int = 100, w: int = 100) -> np.ndarray:
    """High-frequency checkerboard — very sharp."""
    frame = np.zeros((h, w, 3), dtype=np.uint8)
    for r in range(h):
        for c in range(w):
            frame[r, c] = (255, 255, 255) if (r + c) % 2 == 0 else (0, 0, 0)
    return frame


# ── _compute_sharpness ────────────────────────────────────────────────────────

def test_sharpness_solid_frame_is_zero():
    frames = [_solid_frame()]
    assert _compute_sharpness(frames) == pytest.approx(0.0, abs=1.0)


def test_sharpness_checkerboard_is_high():
    frames = [_checkerboard_frame()]
    assert _compute_sharpness(frames) > 100.0


def test_sharpness_increases_with_detail():
    solid = _compute_sharpness([_solid_frame()])
    detailed = _compute_sharpness([_checkerboard_frame()])
    assert detailed > solid


# ── _compute_brightness ───────────────────────────────────────────────────────

def test_brightness_black_frame():
    frames = [_solid_frame(bgr=(0, 0, 0))]
    assert _compute_brightness(frames) == pytest.approx(0.0, abs=1.0)


def test_brightness_white_frame():
    frames = [_solid_frame(bgr=(255, 255, 255))]
    assert _compute_brightness(frames) == pytest.approx(255.0, abs=1.0)


def test_brightness_mid_grey():
    frames = [_solid_frame(bgr=(128, 128, 128))]
    b = _compute_brightness(frames)
    assert 60.0 < b < 200.0


# ── _compute_stability ────────────────────────────────────────────────────────

def test_stability_identical_frames_is_one():
    frame = _solid_frame()
    assert _compute_stability([frame, frame, frame]) == pytest.approx(1.0, abs=0.01)


def test_stability_completely_different_frames_is_low():
    black = _solid_frame(bgr=(0, 0, 0))
    white = _solid_frame(bgr=(255, 255, 255))
    stability = _compute_stability([black, white, black, white])
    assert stability < 0.1


def test_stability_single_frame_returns_one():
    assert _compute_stability([_solid_frame()]) == 1.0


# ── _classify_image_quality ───────────────────────────────────────────────────

def test_classify_excellent():
    q = _classify_image_quality(sharpness=400.0, brightness=120.0, stability=0.95)
    assert q == "excellent"


def test_classify_poor():
    q = _classify_image_quality(sharpness=5.0, brightness=10.0, stability=0.3)
    assert q == "poor"


def test_classify_good():
    q = _classify_image_quality(sharpness=200.0, brightness=100.0, stability=0.88)
    assert q in ("good", "excellent")


def test_classify_average():
    q = _classify_image_quality(sharpness=60.0, brightness=80.0, stability=0.7)
    assert q in ("average", "good")


# ── analyze_image (integration — _sample_frames mocked) ──────────────────────

def test_analyze_image_returns_result():
    frames = [_checkerboard_frame() for _ in range(30)]
    with patch("analyzers.image_analyzer._sample_frames", return_value=frames):
        result = analyze_image("/fake/video.mp4")

    assert result.image_quality in ("poor", "average", "good", "excellent")
    assert result.sharpness_score >= 0.0
    assert 0.0 <= result.brightness_score <= 255.0
    assert isinstance(result.face_detected, bool)
    assert isinstance(result.subtitles_detected, bool)


def test_analyze_image_empty_frames_returns_poor():
    with patch("analyzers.image_analyzer._sample_frames", return_value=[]):
        result = analyze_image("/fake/video.mp4")

    assert result.image_quality == "poor"
    assert result.sharpness_score == 0.0
    assert result.face_detected is False


def test_analyze_image_dark_frame_classified_poorly():
    dark_frames = [_solid_frame(bgr=(5, 5, 5)) for _ in range(10)]
    with patch("analyzers.image_analyzer._sample_frames", return_value=dark_frames):
        result = analyze_image("/fake/video.mp4")

    assert result.brightness_score < 30.0
    assert result.image_quality in ("poor", "average")
