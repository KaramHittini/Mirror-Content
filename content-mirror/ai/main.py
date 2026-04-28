"""
Content Mirror AI Pipeline — Entry Point (Amr's primary file)

Orchestrates all analyzers and engines into a single JSON output.
Called by the Celery worker in backend/app/workers/analysis_worker.py.

Usage:
    from main import run_pipeline
    result = run_pipeline("/path/to/video.mp4")
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from analyzers.video_analyzer import analyze_video
from analyzers.audio_analyzer import analyze_audio
from analyzers.image_analyzer import analyze_image
from engine.insight_engine import generate_insights
from engine.recommendation_engine import generate_recommendations
from engine.benchmark_engine import find_similar_content


def run_pipeline(video_path: str) -> dict[str, Any]:
    """
    Full analysis pipeline for a single video file.

    Args:
        video_path: Absolute path to the video file.

    Returns:
        Structured JSON-safe dict matching the strict output schema.

    Raises:
        FileNotFoundError: If the video file does not exist.
        ValueError: If the video cannot be opened or processed.
    """
    if not Path(video_path).exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    # ── Step 1: Run all analyzers in sequence ─────────────────────────────────
    video_result = analyze_video(video_path)
    audio_result = analyze_audio(video_path)
    image_result = analyze_image(video_path)

    # ── Step 2: Merge raw results ─────────────────────────────────────────────
    merged: dict[str, Any] = {
        # Core scores (strict schema)
        "hook_score": video_result.hook_score,
        "pacing": video_result.pacing,
        "audio_quality": audio_result.audio_quality,
        "image_quality": image_result.image_quality,
        "weak_sections": video_result.weak_sections,
        "hook_duration_seconds": video_result.hook_duration_seconds,
        # Extended audio
        "silence_ratio": audio_result.silence_ratio,
        "snr_db": audio_result.snr_db,
        "transcript": audio_result.transcript,
        "wpm": audio_result.wpm,
        "filler_word_ratio": audio_result.filler_word_ratio,
        "hook_message_present": audio_result.hook_message_present,
        # Extended visual
        "sharpness_score": image_result.sharpness_score,
        "brightness_score": image_result.brightness_score,
        "face_detected": image_result.face_detected,
        "subtitles_detected": image_result.subtitles_detected,
    }

    # ── Step 3: Generate insights ─────────────────────────────────────────────
    insights = generate_insights(merged)
    merged["insights"] = insights

    # ── Step 4: Generate recommendations ─────────────────────────────────────
    recommendations = generate_recommendations(insights)
    merged["recommendations"] = recommendations

    # ── Step 5: Benchmark against similar successful content ──────────────────
    similar = find_similar_content(merged)
    merged["similar_content"] = similar

    return _sanitize(merged)


def _sanitize(data: dict) -> dict:
    """Ensure all values are JSON-serializable."""
    return json.loads(json.dumps(data, default=_serialize))


def _serialize(obj: Any) -> Any:
    import numpy as np
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return str(obj)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python main.py <video_path>")
        sys.exit(1)

    result = run_pipeline(sys.argv[1])
    print(json.dumps(result, indent=2))
