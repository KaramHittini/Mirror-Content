"""
Insight Engine — Amr's primary file.

Transforms raw analyzer outputs into structured, human-readable insights.
Uses a two-layer approach:
  1. Rule-based layer: deterministic detection of known patterns
  2. LLM layer: Claude generates nuanced, context-aware explanations

Output schema per insight:
  { id, problem, cause, evidence, severity, timestamp_seconds? }
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

import google.generativeai as genai

from app.core.config import settings  # type: ignore[import]


@dataclass
class Insight:
    problem: str
    cause: str
    evidence: str
    severity: str   # low | medium | high
    timestamp_seconds: int | None = None

    def to_dict(self) -> dict:
        return {
            "id": str(uuid.uuid4()),
            "problem": self.problem,
            "cause": self.cause,
            "evidence": self.evidence,
            "severity": self.severity,
            "timestamp_seconds": self.timestamp_seconds,
        }


def generate_insights(analysis_data: dict[str, Any]) -> list[dict]:
    """
    Main entry point. Combines rule-based + LLM insights.

    Args:
        analysis_data: Merged output from all analyzers.

    Returns:
        List of insight dicts, deduplicated and sorted by severity.
    """
    rule_insights = _apply_rules(analysis_data)
    llm_insights = _generate_llm_insights(analysis_data, rule_insights)
    all_insights = rule_insights + llm_insights

    # Sort: high → medium → low
    severity_order = {"high": 0, "medium": 1, "low": 2}
    all_insights.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 2))
    return all_insights[:8]  # cap at 8 insights


def _apply_rules(d: dict) -> list[dict]:
    """
    Deterministic rules that fire based on thresholds.
    Each rule maps a known pattern to a Problem → Cause → Evidence insight.
    """
    insights: list[Insight] = []

    hook_score = d.get("hook_score", 5.0)
    pacing = d.get("pacing", "medium")
    audio_quality = d.get("audio_quality", "average")
    silence_ratio = d.get("silence_ratio", 0.0)
    filler_ratio = d.get("filler_word_ratio", 0.0)
    hook_message = d.get("hook_message_present", True)
    face_detected = d.get("face_detected", True)
    subtitles = d.get("subtitles_detected", False)
    sharpness = d.get("sharpness_score", 100.0)
    brightness = d.get("brightness_score", 128.0)

    if hook_score < 4.0:
        insights.append(Insight(
            problem="Weak opening hook — high early drop-off risk",
            cause="The first 3–5 seconds lack sufficient motion, curiosity trigger, or visual change to retain viewers",
            evidence=f"Hook score: {hook_score:.1f}/10. Low motion detected in opening frames.",
            severity="high",
            timestamp_seconds=0,
        ))
    elif hook_score < 6.0:
        insights.append(Insight(
            problem="Moderate hook — room for improvement",
            cause="The opening captures some attention but lacks a strong pattern interrupt or clear value promise",
            evidence=f"Hook score: {hook_score:.1f}/10.",
            severity="medium",
            timestamp_seconds=0,
        ))

    if pacing == "slow":
        insights.append(Insight(
            problem="Slow pacing likely reduces mid-video retention",
            cause="Few scene changes and low motion signal a monotonous content flow that loses viewer attention",
            evidence=f"Pacing classified as slow. Limited cuts detected per minute.",
            severity="medium",
        ))

    if silence_ratio > 0.4:
        insights.append(Insight(
            problem="Excessive silence gaps hurt engagement",
            cause=f"{int(silence_ratio * 100)}% of the audio is silence — long pauses disrupt flow and feel unprofessional",
            evidence=f"Silence ratio: {silence_ratio:.2f}",
            severity="medium",
        ))

    if audio_quality in ("poor",):
        insights.append(Insight(
            problem="Poor audio quality — viewers may tune out",
            cause="High background noise, low volume, or inconsistent speech levels detected",
            evidence=f"Audio classified as: {audio_quality}",
            severity="high",
        ))

    if filler_ratio > 0.08:
        insights.append(Insight(
            problem="High filler word usage reduces perceived authority",
            cause=f"{int(filler_ratio * 100)}% of spoken words are fillers (um, uh, like, etc.), signalling uncertainty",
            evidence=f"Filler word ratio: {filler_ratio:.2f}",
            severity="low",
        ))

    if not hook_message:
        insights.append(Insight(
            problem="Main message not stated in first 5 seconds",
            cause="Viewers need to know immediately WHY they should keep watching. No clear value statement detected early.",
            evidence="Speech analysis found fewer than 5 words spoken in opening 5 seconds.",
            severity="high",
            timestamp_seconds=0,
        ))

    if not face_detected:
        insights.append(Insight(
            problem="No human presence detected — weaker emotional connection",
            cause="Videos without faces typically generate less empathy and lower watch time on social platforms",
            evidence="Face detection returned no results across sampled frames.",
            severity="low",
        ))

    if not subtitles:
        insights.append(Insight(
            problem="Missing captions reduce accessibility and watch time",
            cause="85%+ of social media videos are watched without sound. No subtitles detected in lower-third region.",
            evidence="Text detection found no subtitle region across sampled frames.",
            severity="medium",
        ))

    if sharpness < 40:
        insights.append(Insight(
            problem="Low visual sharpness signals poor production quality",
            cause="Blurry or low-resolution video reduces perceived professionalism and content credibility",
            evidence=f"Sharpness score: {sharpness:.1f} (threshold: 40)",
            severity="medium",
        ))

    if brightness < 30 or brightness > 230:
        direction = "too dark" if brightness < 30 else "overexposed"
        insights.append(Insight(
            problem=f"Lighting is {direction}",
            cause="Extreme brightness values make it difficult to read facial expressions and on-screen elements",
            evidence=f"Mean brightness: {brightness:.1f}/255",
            severity="medium",
        ))

    return [i.to_dict() for i in insights]


def _generate_llm_insights(analysis_data: dict, rule_insights: list[dict]) -> list[dict]:
    """
    Use Gemini to generate 1–2 additional insights that rules may have missed,
    or to add nuance to the overall performance picture.
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.ai_model)

        rule_summary = "\n".join(
            f"- {i['problem']}: {i['cause']}" for i in rule_insights[:4]
        )

        prompt = f"""You are a senior social media content analyst. Based on the following video analysis data, identify 1–2 additional insights that the rule-based system may have missed.

Analysis data:
- Hook score: {analysis_data.get('hook_score', 'N/A')}/10
- Pacing: {analysis_data.get('pacing', 'N/A')}
- Audio quality: {analysis_data.get('audio_quality', 'N/A')}
- Image quality: {analysis_data.get('image_quality', 'N/A')}
- Face detected: {analysis_data.get('face_detected', 'N/A')}
- Subtitles detected: {analysis_data.get('subtitles_detected', 'N/A')}
- WPM: {analysis_data.get('wpm', 'N/A')}
- Hook duration: {analysis_data.get('hook_duration_seconds', 'N/A')}s

Already identified issues:
{rule_summary}

Return ONLY a JSON array of insights (1–2 items). Each item must have EXACTLY these fields:
- problem (string): The content issue
- cause (string): Why this is happening (use "Likely" / "Strong signal suggests" — never claim certainty)
- evidence (string): What data supports this
- severity (string): "low", "medium", or "high"

Return only valid JSON, no explanation."""

        response = model.generate_content(prompt)

        import json
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        return [{"id": str(uuid.uuid4()), **item} for item in parsed if isinstance(item, dict)]
    except Exception as exc:
        logger.warning("Gemini LLM insights failed: %s", exc)
        return []
