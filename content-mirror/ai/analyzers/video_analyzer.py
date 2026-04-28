"""
Video structure analyzer — Amr's primary file.

Responsibilities:
- Split video into Hook / Body / CTA segments
- Score hook effectiveness (0.0–10.0)
- Detect pacing (slow / medium / fast)
- Identify weak sections (drop-off risk timestamps)
- Measure hook duration
"""

from __future__ import annotations

import cv2
import numpy as np
from dataclasses import dataclass, field
from scenedetect import detect, ContentDetector


@dataclass
class VideoAnalysisResult:
    hook_score: float
    pacing: str
    weak_sections: list[dict]
    hook_duration_seconds: int


def analyze_video(video_path: str) -> VideoAnalysisResult:
    """
    Entry point. Runs the full video structural analysis.

    Args:
        video_path: Absolute path to the video file.

    Returns:
        VideoAnalysisResult with hook_score, pacing, weak_sections, hook_duration_seconds.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_seconds = total_frames / fps
    cap.release()

    motion_scores = _compute_motion_scores(video_path, fps)
    scene_changes = _detect_scene_changes(video_path)
    hook_duration = _detect_hook_duration(motion_scores, fps)
    hook_score = _score_hook(motion_scores, hook_duration, fps, scene_changes)
    pacing = _classify_pacing(scene_changes, duration_seconds, motion_scores)
    weak_sections = _find_weak_sections(motion_scores, fps, duration_seconds)

    return VideoAnalysisResult(
        hook_score=round(hook_score, 2),
        pacing=pacing,
        weak_sections=weak_sections,
        hook_duration_seconds=hook_duration,
    )


def _compute_motion_scores(video_path: str, fps: float, sample_interval: float = 0.5) -> list[float]:
    """Sample frames every `sample_interval` seconds and compute inter-frame motion."""
    cap = cv2.VideoCapture(video_path)
    scores: list[float] = []
    prev_gray = None
    frame_idx = 0
    sample_every = max(1, int(fps * sample_interval))

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % sample_every == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                scores.append(float(np.mean(diff)))
            else:
                scores.append(0.0)
            prev_gray = gray
        frame_idx += 1

    cap.release()
    return scores


def _detect_scene_changes(video_path: str) -> list[float]:
    """Return timestamps (seconds) of scene cuts detected by PySceneDetect."""
    try:
        scenes = detect(video_path, ContentDetector(threshold=27.0))
        return [scene[0].get_seconds() for scene in scenes]
    except Exception:
        return []


def _detect_hook_duration(motion_scores: list[float], fps: float) -> int:
    """
    Estimate hook duration as the point where motion sustains above the median.
    Capped at 10 seconds as a reasonable hook window.
    """
    if not motion_scores:
        return 3

    median_motion = float(np.median(motion_scores))
    hook_frames = 0
    for score in motion_scores:
        if score >= median_motion * 0.6:
            hook_frames += 1
        else:
            break

    duration_seconds = int(hook_frames * 0.5)  # sampled at 0.5s intervals
    return max(1, min(duration_seconds, 10))


def _score_hook(
    motion_scores: list[float],
    hook_duration: int,
    fps: float,
    scene_changes: list[float],
) -> float:
    """
    Composite hook score (0.0–10.0) based on:
    - Motion level in first 5 seconds (high motion = better hook)
    - Presence of scene change in first 3 seconds
    - Hook duration (3–5s is optimal)
    """
    score = 5.0

    hook_samples = int(5.0 / 0.5)  # first 5 seconds at 0.5s intervals
    hook_motion = motion_scores[:hook_samples] if motion_scores else []

    if hook_motion:
        avg_motion = float(np.mean(hook_motion))
        overall_avg = float(np.mean(motion_scores)) if motion_scores else 1.0
        motion_ratio = avg_motion / (overall_avg + 1e-6)
        score += min(2.0, motion_ratio * 2.0)

    early_cuts = [t for t in scene_changes if t <= 3.0]
    if early_cuts:
        score += 1.5

    if 3 <= hook_duration <= 5:
        score += 1.0
    elif hook_duration < 2:
        score -= 1.5

    return float(np.clip(score, 0.0, 10.0))


def _classify_pacing(scene_changes: list[float], duration_seconds: float, motion_scores: list[float]) -> str:
    """
    Classify pacing as slow / medium / fast based on cuts-per-minute and avg motion.
    """
    if duration_seconds <= 0:
        return "medium"

    cuts_per_minute = (len(scene_changes) / duration_seconds) * 60
    avg_motion = float(np.mean(motion_scores)) if motion_scores else 0

    if cuts_per_minute >= 8 or avg_motion > 25:
        return "fast"
    elif cuts_per_minute >= 3 or avg_motion > 10:
        return "medium"
    return "slow"


def _find_weak_sections(
    motion_scores: list[float],
    fps: float,
    duration_seconds: float,
    window_size: int = 6,
) -> list[dict]:
    """
    Identify consecutive low-motion windows as weak sections.
    A section is weak if its average motion is below 25% of the global median.
    """
    if not motion_scores:
        return []

    global_median = float(np.median(motion_scores))
    threshold = global_median * 0.25
    sample_interval = 0.5
    weak_sections: list[dict] = []
    i = 0

    while i < len(motion_scores) - window_size:
        window = motion_scores[i : i + window_size]
        if float(np.mean(window)) < threshold:
            start_sec = int(i * sample_interval)
            end_sec = int((i + window_size) * sample_interval)
            weak_sections.append({
                "start_seconds": start_sec,
                "end_seconds": end_sec,
                "reason": "Prolonged low motion — likely audience drop-off risk",
            })
            i += window_size
        else:
            i += 1

    return weak_sections
