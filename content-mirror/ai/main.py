"""
Content Mirror AI Pipeline — Entry Point (Amr's primary file)

Orchestrates all analyzers and engines into a single JSON output.
Called by the Celery worker in backend/app/workers/analysis_worker.py.

Edge cases handled:
  - Very short videos (<5s): analyzed with a warning, weak_sections skipped
  - Audio-only files: only audio analysis runs; video/image scores default gracefully
  - Silent videos (no audio track): only video/image analysis runs; audio scores default

Usage:
    from main import run_pipeline
    result = run_pipeline("/path/to/video.mp4")
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import cv2

from analyzers.video_analyzer import analyze_video
from analyzers.audio_analyzer import analyze_audio
from analyzers.image_analyzer import analyze_image
from engine.insight_engine import generate_insights
from engine.recommendation_engine import generate_recommendations
from engine.benchmark_engine import find_similar_content

logger = logging.getLogger(__name__)

# Minimum duration we consider "analyzable" as a full video
_MIN_DURATION = 5.0


def run_pipeline(video_path: str) -> dict[str, Any]:
    """
    Full analysis pipeline for a single video file.

    Args:
        video_path: Absolute path to the video file.

    Returns:
        Structured JSON-safe dict matching the strict output schema.

    Raises:
        FileNotFoundError: If the video file does not exist.
        ValueError: If the file has neither a readable video nor audio stream.
    """
    if not Path(video_path).exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    info = _probe(video_path)

    if not info["has_video"] and not info["has_audio"]:
        raise ValueError(f"File has no readable video or audio stream: {video_path}")

    if info["has_video"] and info["duration"] < _MIN_DURATION:
        logger.warning("Short video (%.1fs < %ss) — analysis quality may be reduced", info["duration"], _MIN_DURATION)

    # ── Run analyzers, skipping unavailable streams ───────────────────────────
    if info["has_video"]:
        video_result = analyze_video(video_path)
        image_result = analyze_image(video_path)
    else:
        logger.warning("No video stream detected — skipping video and image analysis")
        video_result = None
        image_result = None

    if info["has_audio"]:
        audio_result = analyze_audio(video_path)
    else:
        logger.warning("No audio stream detected — skipping audio analysis")
        audio_result = None

    # ── Merge results, filling defaults for missing streams ───────────────────
    merged: dict[str, Any] = {
        # Core scores
        "hook_score":           video_result.hook_score          if video_result else 0.0,
        "pacing":               video_result.pacing              if video_result else "unknown",
        "audio_quality":        audio_result.audio_quality       if audio_result else "unknown",
        "image_quality":        image_result.image_quality       if image_result else "unknown",
        "hook_duration_seconds": video_result.hook_duration_seconds if video_result else 0,
        # Weak sections only meaningful for full-length videos
        "weak_sections": (
            video_result.weak_sections
            if video_result and info["duration"] >= _MIN_DURATION
            else []
        ),
        # Extended audio
        "silence_ratio":        audio_result.silence_ratio       if audio_result else 0.0,
        "snr_db":               audio_result.snr_db              if audio_result else 0.0,
        "transcript":           audio_result.transcript          if audio_result else "",
        "wpm":                  audio_result.wpm                 if audio_result else 0,
        "filler_word_ratio":    audio_result.filler_word_ratio   if audio_result else 0.0,
        "hook_message_present": audio_result.hook_message_present if audio_result else False,
        # Extended visual
        "sharpness_score":      image_result.sharpness_score     if image_result else 0.0,
        "brightness_score":     image_result.brightness_score    if image_result else 0.0,
        "face_detected":        image_result.face_detected       if image_result else False,
        "subtitles_detected":   image_result.subtitles_detected  if image_result else False,
    }

    # ── Engines ───────────────────────────────────────────────────────────────
    insights = generate_insights(merged)
    merged["insights"] = insights

    recommendations = generate_recommendations(insights)
    merged["recommendations"] = recommendations

    similar = find_similar_content(merged)
    merged["similar_content"] = similar

    return _sanitize(merged)


def _probe(video_path: str) -> dict[str, Any]:
    """
    Inspect the file with OpenCV to determine available streams and duration.

    Returns:
        dict with keys: has_video (bool), has_audio (bool), duration (float),
        width (int), height (int).
    """
    cap = cv2.VideoCapture(video_path)
    has_video = cap.isOpened()
    duration = 0.0
    width = height = 0

    if has_video:
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # A file with 0 frames is effectively not a video
        if total_frames == 0:
            has_video = False

    cap.release()

    # Detect audio stream via moviepy (lightweight check)
    has_audio = _has_audio_stream(video_path)

    return {
        "has_video": has_video,
        "has_audio": has_audio,
        "duration": round(duration, 2),
        "width": width,
        "height": height,
    }


def _has_audio_stream(video_path: str) -> bool:
    """Return True if the file contains a readable audio track."""
    try:
        from moviepy.editor import VideoFileClip
        clip = VideoFileClip(video_path)
        has_audio = clip.audio is not None
        clip.close()
        return has_audio
    except Exception:
        return False


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
