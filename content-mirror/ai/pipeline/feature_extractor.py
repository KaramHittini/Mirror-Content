"""
Pipeline Feature Extractor — Amr's file.

Aggregates per-segment visual and audio features into a flat, normalized
feature vector that feeds into the benchmark engine for similarity search.

Also exposes per-segment summary dicts used for detailed reporting.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np

from pipeline.segmenter import VideoSegment, SegmentationResult


QUALITY_ENCODING = {"poor": 0.25, "average": 0.5, "good": 0.75, "excellent": 1.0}
PACING_ENCODING = {"slow": 0.0, "medium": 0.5, "fast": 1.0}


@dataclass
class SegmentFeatures:
    label: str
    start_seconds: float
    end_seconds: float
    avg_sharpness: float
    avg_brightness: float
    avg_motion: float          # mean inter-frame pixel difference
    face_present: bool
    frame_count: int

    def to_dict(self) -> dict:
        return {
            "label": self.label,
            "start_seconds": self.start_seconds,
            "end_seconds": self.end_seconds,
            "avg_sharpness": round(self.avg_sharpness, 2),
            "avg_brightness": round(self.avg_brightness, 2),
            "avg_motion": round(self.avg_motion, 4),
            "face_present": self.face_present,
            "frame_count": self.frame_count,
        }


@dataclass
class ExtractedFeatures:
    segments: list[SegmentFeatures]
    global_feature_vector: list[float]   # normalized 7-dim vector for Pinecone

    def segment_dicts(self) -> list[dict]:
        return [s.to_dict() for s in self.segments]


def extract_features(
    segmentation: SegmentationResult,
    analysis_data: dict[str, Any],
) -> ExtractedFeatures:
    """
    Compute per-segment visual features and build the global feature vector.

    Args:
        segmentation: Output from pipeline.segmenter.segment().
        analysis_data: Merged output from all analyzers (from main.py).

    Returns:
        ExtractedFeatures with per-segment summaries and global vector.
    """
    segment_features = [
        _extract_segment_features(seg)
        for seg in segmentation.all_segments()
    ]

    global_vector = _build_global_vector(analysis_data)

    return ExtractedFeatures(
        segments=segment_features,
        global_feature_vector=global_vector,
    )


def _extract_segment_features(segment: VideoSegment) -> SegmentFeatures:
    frames = segment.frames
    if not frames:
        return SegmentFeatures(
            label=segment.label,
            start_seconds=segment.start_seconds,
            end_seconds=segment.end_seconds,
            avg_sharpness=0.0,
            avg_brightness=0.0,
            avg_motion=0.0,
            face_present=False,
            frame_count=0,
        )

    sharpness = _mean_sharpness(frames)
    brightness = _mean_brightness(frames)
    motion = _mean_motion(frames)
    face = _face_present(frames)

    return SegmentFeatures(
        label=segment.label,
        start_seconds=segment.start_seconds,
        end_seconds=segment.end_seconds,
        avg_sharpness=sharpness,
        avg_brightness=brightness,
        avg_motion=motion,
        face_present=face,
        frame_count=len(frames),
    )


def _build_global_vector(data: dict[str, Any]) -> list[float]:
    """
    Encode the merged analysis dict into a 7-dim normalized float vector.
    Mirrors benchmark_engine.build_feature_vector for compatibility.
    """
    return [
        float(data.get("hook_score", 5.0)) / 10.0,
        PACING_ENCODING.get(data.get("pacing", "medium"), 0.5),
        QUALITY_ENCODING.get(data.get("audio_quality", "average"), 0.5),
        QUALITY_ENCODING.get(data.get("image_quality", "average"), 0.5),
        1.0 if data.get("face_detected") else 0.0,
        1.0 if data.get("subtitles_detected") else 0.0,
        min(float(data.get("wpm", 130)) / 200.0, 1.0),
    ]


def _mean_sharpness(frames: list[np.ndarray]) -> float:
    scores = []
    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        scores.append(cv2.Laplacian(gray, cv2.CV_64F).var())
    return float(np.mean(scores)) if scores else 0.0


def _mean_brightness(frames: list[np.ndarray]) -> float:
    values = []
    for frame in frames:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        values.append(float(np.mean(hsv[:, :, 2])))
    return float(np.mean(values)) if values else 0.0


def _mean_motion(frames: list[np.ndarray]) -> float:
    if len(frames) < 2:
        return 0.0
    diffs = []
    for a, b in zip(frames[:-1], frames[1:]):
        diff = cv2.absdiff(
            cv2.cvtColor(a, cv2.COLOR_BGR2GRAY),
            cv2.cvtColor(b, cv2.COLOR_BGR2GRAY),
        )
        diffs.append(float(np.mean(diff)) / 255.0)
    return float(np.mean(diffs))


def _face_present(frames: list[np.ndarray]) -> bool:
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    for frame in frames[::max(1, len(frames) // 5)]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        if len(faces) > 0:
            return True
    return False
