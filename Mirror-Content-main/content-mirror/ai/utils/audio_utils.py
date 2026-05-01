"""Shared audio utilities used by audio_analyzer and transcription_analyzer."""

from __future__ import annotations

import os
import tempfile

import librosa
import numpy as np
from moviepy.editor import VideoFileClip


def load_audio(video_path: str, sr: int = 16000) -> tuple[np.ndarray, int]:
    """
    Extract and load audio from a video file.

    Args:
        video_path: Path to video.
        sr: Target sample rate (default 16 kHz for Whisper compatibility).

    Returns:
        Tuple of (audio array, sample_rate).
    """
    audio_path = _extract_to_wav(video_path)
    try:
        y, loaded_sr = librosa.load(audio_path, sr=sr, mono=True)
        return y, loaded_sr
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)


def normalize_audio(y: np.ndarray) -> np.ndarray:
    """Normalize audio to peak amplitude of 1.0."""
    peak = np.max(np.abs(y))
    if peak < 1e-10:
        return y
    return y / peak


def _extract_to_wav(video_path: str) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    clip = VideoFileClip(video_path)
    clip.audio.write_audiofile(tmp.name, fps=16000, nbytes=2, codec="pcm_s16le", verbose=False, logger=None)
    clip.close()
    return tmp.name


def compute_db_rms(y: np.ndarray) -> float:
    """RMS energy in decibels."""
    rms = float(np.sqrt(np.mean(y ** 2)))
    if rms < 1e-10:
        return -100.0
    return float(20 * np.log10(rms))


def split_into_segments(y: np.ndarray, sr: int, segment_seconds: float = 5.0) -> list[np.ndarray]:
    """Split audio array into fixed-length segments."""
    segment_samples = int(sr * segment_seconds)
    return [y[i : i + segment_samples] for i in range(0, len(y), segment_samples) if len(y[i : i + segment_samples]) > sr]
