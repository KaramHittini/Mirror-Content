"""
Visual quality analyzer — Noor Adili's primary file.

Responsibilities:
- Frame sampling across the video timeline
- Sharpness (Laplacian variance)
- Brightness histogram analysis
- Blur detection
- Camera stability (inter-frame consistency)
- Face presence detection
- Subtitle/caption text detection (OCR on lower-third region)
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class ImageAnalysisResult:
    image_quality: str          # poor / average / good / excellent
    sharpness_score: float      # Laplacian variance (higher = sharper)
    brightness_score: float     # 0–255 mean brightness
    face_detected: bool
    subtitles_detected: bool


def analyze_image(video_path: str, sample_count: int = 30) -> ImageAnalysisResult:
    """
    Visual quality analysis by sampling `sample_count` evenly-spaced frames.

    Args:
        video_path: Path to the video file.
        sample_count: Number of frames to analyze.

    Returns:
        ImageAnalysisResult with quality classification and individual scores.
    """
    frames = _sample_frames(video_path, sample_count)
    if not frames:
        return ImageAnalysisResult(
            image_quality="poor",
            sharpness_score=0.0,
            brightness_score=0.0,
            face_detected=False,
            subtitles_detected=False,
        )

    sharpness = _compute_sharpness(frames)
    brightness = _compute_brightness(frames)
    stability = _compute_stability(frames)
    face_detected = _detect_faces(frames)
    subtitles_detected = _detect_subtitles(frames)
    image_quality = _classify_image_quality(sharpness, brightness, stability)

    return ImageAnalysisResult(
        image_quality=image_quality,
        sharpness_score=round(sharpness, 2),
        brightness_score=round(brightness, 2),
        face_detected=face_detected,
        subtitles_detected=subtitles_detected,
    )


def _sample_frames(video_path: str, count: int) -> list[np.ndarray]:
    """Extract `count` evenly-spaced frames from the video."""
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    indices = np.linspace(0, total - 1, count, dtype=int)
    frames: list[np.ndarray] = []

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if ret:
            frames.append(frame)

    cap.release()
    return frames


def _compute_sharpness(frames: list[np.ndarray]) -> float:
    """Average Laplacian variance across frames. Higher = sharper."""
    scores = []
    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        scores.append(cv2.Laplacian(gray, cv2.CV_64F).var())
    return float(np.mean(scores))


def _compute_brightness(frames: list[np.ndarray]) -> float:
    """Mean brightness (0–255) averaged across sampled frames."""
    values = []
    for frame in frames:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        values.append(float(np.mean(hsv[:, :, 2])))
    return float(np.mean(values))


def _compute_stability(frames: list[np.ndarray]) -> float:
    """
    Camera stability score (0–1). Computed as 1 minus the mean normalized
    inter-frame pixel difference. 1.0 = perfectly stable.
    """
    if len(frames) < 2:
        return 1.0
    diffs = []
    for a, b in zip(frames[:-1], frames[1:]):
        diff = cv2.absdiff(
            cv2.cvtColor(a, cv2.COLOR_BGR2GRAY),
            cv2.cvtColor(b, cv2.COLOR_BGR2GRAY),
        )
        diffs.append(float(np.mean(diff)) / 255.0)
    mean_diff = float(np.mean(diffs))
    return float(np.clip(1.0 - mean_diff, 0.0, 1.0))


def _detect_faces(frames: list[np.ndarray]) -> bool:
    """Return True if a face is detected in any sampled frame."""
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    for frame in frames[::3]:  # check every 3rd frame for speed
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        if len(faces) > 0:
            return True
    return False


def _detect_subtitles(frames: list[np.ndarray]) -> bool:
    """
    Heuristic subtitle detection: look for high-contrast horizontal text region
    in the lower-third of the frame using edge density.
    Falls back to OCR (pytesseract) if available.
    """
    for frame in frames[::5]:
        h = frame.shape[0]
        lower_third = frame[int(h * 0.75) :, :]
        gray = cv2.cvtColor(lower_third, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = float(np.sum(edges > 0)) / edges.size
        if edge_density > 0.05:
            return True

    try:
        import pytesseract
        for frame in frames[::10]:
            h = frame.shape[0]
            lower_third = frame[int(h * 0.75) :, :]
            text = pytesseract.image_to_string(lower_third).strip()
            if len(text) > 10:
                return True
    except Exception:
        pass

    return False


def _classify_image_quality(sharpness: float, brightness: float, stability: float) -> str:
    score = 0

    if sharpness >= 300:
        score += 3
    elif sharpness >= 100:
        score += 2
    elif sharpness >= 40:
        score += 1

    if 60 <= brightness <= 200:
        score += 2
    elif 40 <= brightness <= 220:
        score += 1

    if stability >= 0.85:
        score += 2
    elif stability >= 0.65:
        score += 1

    if score >= 6:
        return "excellent"
    elif score >= 4:
        return "good"
    elif score >= 2:
        return "average"
    return "poor"
