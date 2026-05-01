"""Shared video utilities used across analyzers."""

from __future__ import annotations

import cv2
import numpy as np


def extract_frames(video_path: str, interval_seconds: float = 1.0) -> list[np.ndarray]:
    """
    Extract frames at a fixed time interval.

    Args:
        video_path: Path to video file.
        interval_seconds: Time between extracted frames.

    Returns:
        List of BGR numpy arrays.
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(fps * interval_seconds))
    frames: list[np.ndarray] = []
    idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % step == 0:
            frames.append(frame)
        idx += 1

    cap.release()
    return frames


def get_video_duration(video_path: str) -> float:
    """Return video duration in seconds."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    cap.release()
    return total_frames / fps


def get_video_dimensions(video_path: str) -> tuple[int, int]:
    """Return (width, height) of the video."""
    cap = cv2.VideoCapture(video_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return w, h


def resize_frame(frame: np.ndarray, max_dim: int = 720) -> np.ndarray:
    """Resize frame so the longest edge is at most max_dim pixels."""
    h, w = frame.shape[:2]
    if max(h, w) <= max_dim:
        return frame
    scale = max_dim / max(h, w)
    return cv2.resize(frame, (int(w * scale), int(h * scale)))
