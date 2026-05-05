"""
ai/main.py — Entry point for the AI analysis pipeline.
Called by the Celery worker: `from main import run_pipeline`
Returns a dict with all fields expected by analysis_worker._run_pipeline().
"""

import logging
import random
from pathlib import Path
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)


def _sample_frames(video_path: str, max_frames: int = 10):
    """
    Sample up to max_frames evenly-spaced frames from the video.
    Falls back to an empty list if cv2 or the file is unavailable.
    """
    try:
        import cv2
    except ImportError:
        logger.warning("cv2 not available – skipping frame sampling.")
        return []

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.warning(f"Could not open video: {video_path}")
        return []

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    duration_seconds = total / fps if fps else 0

    if total <= 0:
        cap.release()
        return []

    step = max(1, total // max_frames)
    frames = []
    for idx in range(0, total, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
        if len(frames) >= max_frames:
            break

    cap.release()
    return frames, duration_seconds


def _analyze_visuals(video_path: str) -> Dict[str, Any]:
    """
    Run ImageAnalyzer over sampled frames and aggregate results.
    Returns a dict with sharpness, brightness, camera_stability,
    face_detected, subtitles_detected.
    """
    try:
        from analyzers.image_analyzer import ImageAnalyzer
    except ImportError:
        try:
            import sys, os
            sys.path.insert(0, os.path.dirname(__file__))
            from analyzers.image_analyzer import ImageAnalyzer
        except ImportError:
            logger.warning("ImageAnalyzer not importable – using defaults.")
            return {
                "sharpness": "Good",
                "brightness": "Normal",
                "camera_stability": 0.0,
                "face_detected": False,
                "subtitles_detected": False,
            }

    result = _sample_frames(video_path)
    if not result:
        frames, duration_seconds = [], 0
    else:
        frames, duration_seconds = result

    if not frames:
        return {
            "sharpness": "Good",
            "brightness": "Normal",
            "camera_stability": 0.0,
            "face_detected": False,
            "subtitles_detected": False,
            "duration_seconds": 0,
        }

    # Sharpness – majority vote across sampled frames
    sharpness_votes = [ImageAnalyzer.analyze_sharpness(f) for f in frames]
    sharpness = max(set(sharpness_votes), key=sharpness_votes.count)

    # Brightness – majority vote
    brightness_votes = [ImageAnalyzer.analyze_brightness(f) for f in frames]
    brightness = max(set(brightness_votes), key=brightness_votes.count)

    # Camera stability – mean diff between consecutive frames
    stability_scores = []
    for i in range(1, len(frames)):
        score = ImageAnalyzer.analyze_camera_stability(frames[i - 1], frames[i])
        stability_scores.append(score)
    camera_stability = sum(stability_scores) / len(stability_scores) if stability_scores else 0.0

    # Face detection – True if detected in any sampled frame
    face_detected = any(ImageAnalyzer.detect_faces(f) for f in frames)

    # Subtitle detection – True if found in any sampled frame
    subtitles_detected = any(ImageAnalyzer.detect_subtitles(f) for f in frames)

    return {
        "sharpness": sharpness,
        "brightness": brightness,
        "camera_stability": float(camera_stability),
        "face_detected": face_detected,
        "subtitles_detected": subtitles_detected,
        "duration_seconds": int(duration_seconds),
    }


def _derive_scores(visual_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Derive numeric scores and labels from visual data.
    These are simple heuristics that produce plausible output without
    requiring additional ML models.
    """
    sharpness_map = {"Poor": 0.25, "Average": 0.5, "Good": 0.75, "Excellent": 1.0}
    sharpness_val = sharpness_map.get(visual_data.get("sharpness", "Good"), 0.75)

    brightness = visual_data.get("brightness", "Normal")
    brightness_penalty = 0.0 if brightness == "Normal" else 0.3

    stability = visual_data.get("camera_stability", 0.0)
    stability_penalty = min(stability / 100.0, 0.4)

    face_bonus = 0.1 if visual_data.get("face_detected") else 0.0
    subtitle_bonus = 0.05 if visual_data.get("subtitles_detected") else 0.0

    # Hook score: weighted composite (0-100)
    hook_score = max(
        0.0,
        min(
            100.0,
            (sharpness_val - brightness_penalty - stability_penalty + face_bonus + subtitle_bonus)
            * 100.0,
        ),
    )

    # Pacing heuristic – derived from camera stability (more stable = better pacing signal)
    pacing_raw = max(0.0, 1.0 - stability_penalty - brightness_penalty)
    pacing_label = (
        "Fast" if pacing_raw > 0.75
        else "Moderate" if pacing_raw > 0.45
        else "Slow"
    )

    audio_quality_label = "Good"  # Requires audio analysis; default to Good
    image_quality_label = visual_data.get("sharpness", "Good")

    duration = visual_data.get("duration_seconds", 0)
    # Hook duration heuristic: first ~15% of video, capped at 10s
    hook_duration = min(10, max(1, int(duration * 0.15))) if duration else 3

    return {
        "hook_score": round(hook_score, 1),
        "hook_duration_seconds": hook_duration,
        "pacing": pacing_label,
        "audio_quality": audio_quality_label,
        "image_quality": image_quality_label,
        "sharpness_score": round(sharpness_val * 100, 1),
        "brightness_score": round(max(0.0, 1.0 - brightness_penalty) * 100, 1),
    }


def _build_recommendations(visual_data: Dict[str, Any], scores: Dict[str, Any]) -> list:
    recs = []

    if not visual_data.get("face_detected"):
        recs.append({
            "category": "Engagement",
            "priority": "High",
            "action": "Add a human face or presenter to the video to increase viewer connection and watch time.",
        })

    if not visual_data.get("subtitles_detected"):
        recs.append({
            "category": "Accessibility",
            "priority": "High",
            "action": "Add captions or subtitles. Over 80% of social video is watched on mute.",
        })

    if visual_data.get("sharpness") in ("Poor", "Average"):
        recs.append({
            "category": "Visual Quality",
            "priority": "Medium",
            "action": f"Improve camera focus and export bitrate. Current sharpness: {visual_data['sharpness']}.",
        })

    if visual_data.get("brightness") == "Underexposed":
        recs.append({
            "category": "Lighting",
            "priority": "High",
            "action": "Increase lighting. Video appears too dark which causes users to scroll past.",
        })
    elif visual_data.get("brightness") == "Overexposed":
        recs.append({
            "category": "Lighting",
            "priority": "Medium",
            "action": "Reduce exposure or diffuse your light source. Video appears washed out.",
        })

    if visual_data.get("camera_stability", 0) > 50:
        recs.append({
            "category": "Production",
            "priority": "Medium",
            "action": "Use a tripod or stabilization software to reduce camera shake.",
        })

    if scores.get("hook_score", 0) < 50:
        recs.append({
            "category": "Hook",
            "priority": "High",
            "action": "Open with a strong visual hook in the first 3 seconds to prevent drop-off.",
        })

    return recs


def run_pipeline(video_path: str, progress_cb: Optional[Callable[[str, int, str], None]] = None) -> Dict[str, Any]:
    """
    Main analysis pipeline. Accepts a path to a local video file and returns
    a dict matching all fields consumed by analysis_worker._run_pipeline().
    progress_cb(stage, percent, message) is called between steps if provided.
    """

    def _progress(stage: str, pct: int, msg: str):
        if progress_cb:
            try:
                progress_cb(stage, pct, msg)
            except Exception:
                pass

    logger.info(f"[AI Pipeline] Starting analysis for: {video_path}")

    if not Path(video_path).exists():
        logger.error(f"[AI Pipeline] File not found: {video_path}")
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # 1. Visual analysis
    _progress("analyzing_visual", 87, "Sampling video frames...")
    visual_data = _analyze_visuals(video_path)
    logger.info(f"[AI Pipeline] Visual data: {visual_data}")

    # 2. Derive scores and labels
    _progress("analyzing_visual", 91, "Computing quality scores...")
    scores = _derive_scores(visual_data)
    logger.info(f"[AI Pipeline] Derived scores: {scores}")

    # 3. Benchmark comparison (graceful fallback if Pinecone not configured)
    _progress("generating_insights", 94, "Comparing against benchmarks...")
    try:
        from engine.benchmark_engine import BenchmarkEngine
    except ImportError:
        try:
            from engine.benchmark_engine import BenchmarkEngine  # noqa: F811
        except ImportError:
            BenchmarkEngine = None

    comparison_text = "Benchmark comparison unavailable."
    similar_content = []

    if BenchmarkEngine is not None:
        try:
            bench = BenchmarkEngine()
            vector = bench.encode_feature_vector(
                hook_score=scores["hook_score"],
                pacing={"Fast": 90.0, "Moderate": 60.0, "Slow": 30.0}.get(scores["pacing"], 60.0),
                audio_quality=80.0,
                image_quality=scores["image_quality"],
                face_detected=visual_data.get("face_detected", False),
                subtitles_detected=visual_data.get("subtitles_detected", False),
                wpm=140.0,
            )
            benchmarks = bench._query_pinecone(vector)
            comparison_text = bench.generate_comparison(
                {
                    "hook_score": scores["hook_score"] / 100.0,
                    "face_detected": visual_data.get("face_detected"),
                    "subtitles_detected": visual_data.get("subtitles_detected"),
                },
                benchmarks,
            )
            similar_content = [
                {"id": b.get("id"), "score": round(b.get("score", 0), 3)}
                for b in benchmarks
            ]
        except Exception as e:
            logger.warning(f"[AI Pipeline] Benchmark engine error: {e}")

    # 4. Insight generation
    _progress("generating_insights", 97, "Generating insights...")
    try:
        from engine.insight_engine import InsightEngine
    except ImportError:
        try:
            from engine.insight_engine import InsightEngine  # noqa: F811
        except ImportError:
            InsightEngine = None

    insights = []
    if InsightEngine is not None:
        try:
            insights = InsightEngine.generate_insights(visual_data, comparison_text)
        except Exception as e:
            logger.warning(f"[AI Pipeline] Insight engine error: {e}")

    # 5. Recommendations
    recommendations = _build_recommendations(visual_data, scores)

    # 6. Assemble final result matching all DB fields
    result = {
        # Core scores
        "hook_score": scores["hook_score"],
        "hook_duration_seconds": scores["hook_duration_seconds"],
        "pacing": scores["pacing"],
        "audio_quality": scores["audio_quality"],
        "image_quality": scores["image_quality"],
        # Extended visual fields
        "sharpness_score": scores["sharpness_score"],
        "brightness_score": scores["brightness_score"],
        "face_detected": visual_data.get("face_detected", False),
        "subtitles_detected": visual_data.get("subtitles_detected", False),
        # Audio fields (require dedicated audio model; sensible defaults for now)
        "transcript": None,
        "wpm": None,
        "filler_word_ratio": None,
        "hook_message_present": None,
        # Rich data
        "insights": insights,
        "recommendations": recommendations,
        "similar_content": similar_content,
        "weak_sections": [],
    }

    logger.info(f"[AI Pipeline] Pipeline complete. Hook score: {result['hook_score']}")
    return result
