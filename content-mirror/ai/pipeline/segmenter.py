"""
Pipeline Segmenter — Amr's file.

Splits a video into three canonical content segments:
  - Hook   : first N seconds (typically 0–10s) — viewer retention window
  - Body   : middle portion — core content delivery
  - CTA    : last N seconds — call-to-action / outro window

Segmentation uses scene-detection as a primary signal and falls back to
fixed-duration boundaries when PySceneDetect cannot run.

Each segment is represented as a VideoSegment dataclass containing its
start/end timestamps, extracted frames, and a label.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from pipeline.preprocessor import PreprocessedVideo


HOOK_MAX_SECONDS = 10.0
CTA_MAX_SECONDS = 10.0


@dataclass
class VideoSegment:
    label: str               # "hook" | "body" | "cta"
    start_seconds: float
    end_seconds: float
    frames: list[np.ndarray] = field(default_factory=list)

    @property
    def duration(self) -> float:
        return self.end_seconds - self.start_seconds

    @property
    def frame_count(self) -> int:
        return len(self.frames)


@dataclass
class SegmentationResult:
    hook: VideoSegment
    body: VideoSegment
    cta: VideoSegment
    scene_change_timestamps: list[float]

    def all_segments(self) -> list[VideoSegment]:
        return [self.hook, self.body, self.cta]


def segment(preprocessed: PreprocessedVideo) -> SegmentationResult:
    """
    Segment a preprocessed video into Hook, Body, and CTA.

    Args:
        preprocessed: Output from pipeline.preprocessor.preprocess().

    Returns:
        SegmentationResult with three labelled VideoSegment objects.
    """
    duration = preprocessed.duration_seconds
    scene_changes = _detect_scene_changes(preprocessed.video_path)

    hook_end = _find_hook_end(scene_changes, duration)
    cta_start = _find_cta_start(scene_changes, duration, hook_end)

    hook = VideoSegment(label="hook", start_seconds=0.0, end_seconds=hook_end)
    body = VideoSegment(label="body", start_seconds=hook_end, end_seconds=cta_start)
    cta = VideoSegment(label="cta", start_seconds=cta_start, end_seconds=duration)

    # Assign frames to each segment
    _assign_frames(preprocessed, [hook, body, cta])

    return SegmentationResult(
        hook=hook,
        body=body,
        cta=cta,
        scene_change_timestamps=scene_changes,
    )


def _detect_scene_changes(video_path: str) -> list[float]:
    """Return scene-change timestamps in seconds using PySceneDetect."""
    try:
        from scenedetect import detect, ContentDetector
        scenes = detect(video_path, ContentDetector(threshold=27.0))
        return [scene[0].get_seconds() for scene in scenes]
    except Exception:
        return []


def _find_hook_end(scene_changes: list[float], duration: float) -> float:
    """
    Hook ends at the first scene change after 3s, capped at HOOK_MAX_SECONDS.
    Falls back to min(10s, 20% of video) if no scene changes found.
    """
    candidates = [t for t in scene_changes if 3.0 <= t <= HOOK_MAX_SECONDS]
    if candidates:
        return candidates[0]
    return min(HOOK_MAX_SECONDS, duration * 0.20)


def _find_cta_start(scene_changes: list[float], duration: float, hook_end: float) -> float:
    """
    CTA starts at the last scene change in the final CTA_MAX_SECONDS window,
    or falls back to (duration - CTA_MAX_SECONDS).
    Guaranteed to be after hook_end.
    """
    cta_window_start = duration - CTA_MAX_SECONDS
    candidates = [t for t in scene_changes if cta_window_start <= t < duration]
    cta_start = candidates[0] if candidates else cta_window_start
    return max(cta_start, hook_end + 1.0)  # never overlap hook


def _assign_frames(preprocessed: PreprocessedVideo, segments: list[VideoSegment]) -> None:
    """Distribute preprocessed frames into the correct segment buckets."""
    for i, frame in enumerate(preprocessed.frames):
        timestamp = i * preprocessed.frame_interval
        for seg in segments:
            if seg.start_seconds <= timestamp < seg.end_seconds:
                seg.frames.append(frame)
                break
        else:
            # Last frame may land exactly on duration — assign to cta
            segments[-1].frames.append(frame)
