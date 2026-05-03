"""
Pipeline Preprocessor — Amr's file.

Handles all pre-analysis preparation:
- Validate and open the video
- Extract raw frames at a configurable interval
- Extract audio track to a temp WAV file
- Normalize frame resolution so downstream analyzers work on consistent dimensions

This module is the first stage in the pipeline. Its output is consumed by
the segmenter and then the analyzers.
"""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass, field

import cv2
import numpy as np
from moviepy.editor import VideoFileClip


@dataclass
class PreprocessedVideo:
    video_path: str
    audio_path: str          # temp WAV file — caller must delete when done
    frames: list[np.ndarray]
    fps: float
    duration_seconds: float
    width: int
    height: int
    frame_interval: float    # seconds between each extracted frame

    @property
    def frame_count(self) -> int:
        return len(self.frames)

    @property
    def has_audio(self) -> bool:
        return os.path.exists(self.audio_path) and os.path.getsize(self.audio_path) > 0


def preprocess(video_path: str, frame_interval: float = 0.5, max_dimension: int = 720) -> PreprocessedVideo:
    """
    Full preprocessing pipeline for a single video.

    Args:
        video_path: Absolute path to the input video file.
        frame_interval: Seconds between extracted frames (default 0.5s).
        max_dimension: Resize so the longest edge is at most this many pixels.

    Returns:
        PreprocessedVideo with frames, audio path, and video metadata.

    Raises:
        FileNotFoundError: Video file does not exist.
        ValueError: Video cannot be opened by OpenCV.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps
    cap.release()

    frames = _extract_frames(video_path, fps, frame_interval, max_dimension)
    audio_path = _extract_audio(video_path)

    return PreprocessedVideo(
        video_path=video_path,
        audio_path=audio_path,
        frames=frames,
        fps=fps,
        duration_seconds=round(duration, 2),
        width=width,
        height=height,
        frame_interval=frame_interval,
    )


def cleanup(preprocessed: PreprocessedVideo) -> None:
    """Delete the temporary audio file created during preprocessing."""
    if os.path.exists(preprocessed.audio_path):
        os.remove(preprocessed.audio_path)


def _extract_frames(
    video_path: str,
    fps: float,
    interval: float,
    max_dimension: int,
) -> list[np.ndarray]:
    """Extract frames every `interval` seconds, resized to `max_dimension`."""
    cap = cv2.VideoCapture(video_path)
    step = max(1, int(fps * interval))
    frames: list[np.ndarray] = []
    idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % step == 0:
            frames.append(_resize(frame, max_dimension))
        idx += 1

    cap.release()
    return frames


def _resize(frame: np.ndarray, max_dim: int) -> np.ndarray:
    h, w = frame.shape[:2]
    if max(h, w) <= max_dim:
        return frame
    scale = max_dim / max(h, w)
    return cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _extract_audio(video_path: str) -> str:
    """Extract audio to a temp WAV file. Returns the file path."""
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    try:
        clip = VideoFileClip(video_path)
        if clip.audio is None:
            clip.close()
            return tmp.name  # empty file — has_audio will be False
        clip.audio.write_audiofile(
            tmp.name, fps=16000, nbytes=2, codec="pcm_s16le", verbose=False, logger=None
        )
        clip.close()
    except Exception:
        pass  # return whatever was written; has_audio guards downstream
    return tmp.name
