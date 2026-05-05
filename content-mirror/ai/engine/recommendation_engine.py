"""
Recommendation Engine — Amr's secondary file.

Maps each detected insight/problem to a specific, actionable recommendation.
Every recommendation includes a concrete example where possible.
"""

from __future__ import annotations

import uuid
from typing import Any


PROBLEM_TO_RECOMMENDATION: dict[str, dict] = {
    "hook": {
        "title": "Rewrite your opening hook",
        "description": "Start with a surprising statement, bold visual change, or direct question within the first 2 seconds. Viewers decide to stay or leave almost instantly.",
        "example": "Instead of 'Hey guys, welcome back' — try 'This one mistake is costing you 70% of your views' (show it visually as you say it).",
        "priority": 1,
        "category": "hook",
    },
    "slow_pacing": {
        "title": "Increase edit pace and cut dead air",
        "description": "Add more cuts, B-roll, or on-screen text to maintain visual momentum. Target at least 4–6 scene changes per minute for short-form content.",
        "example": "Cut every pause, filler, or moment where nothing new is happening. Use jump cuts — they feel dynamic, not jarring.",
        "priority": 2,
        "category": "pacing",
    },
    "silence": {
        "title": "Remove silence gaps and dead audio",
        "description": "Trim any pause longer than 0.5 seconds. Add background music at 10–20% volume to fill acoustic gaps.",
        "example": "Use auto-silence remover tools (Descript, CapCut's voice cleanup) to strip all dead air in one click.",
        "priority": 2,
        "category": "pacing",
    },
    "audio_quality": {
        "title": "Improve recording audio quality",
        "description": "Use a lapel mic or directional microphone. Record in a quiet room. Apply noise reduction in post.",
        "example": "A $20 Boya BY-M1 lapel mic eliminates 80% of ambient noise compared to a phone mic.",
        "priority": 1,
        "category": "audio",
    },
    "filler_words": {
        "title": "Reduce filler words for a more confident delivery",
        "description": "Practice scripting key sentences, or use a teleprompter app. Edit out 'um', 'uh', and 'like' in post.",
        "example": "Descript and CapCut can auto-detect and remove filler words from your audio.",
        "priority": 3,
        "category": "audio",
    },
    "hook_message": {
        "title": "State your value proposition in the first 5 seconds",
        "description": "Answer 'Why should I keep watching?' within the first 3–5 seconds — explicitly. Don't assume viewers know.",
        "example": "'In the next 60 seconds, I'll show you exactly why your videos aren't growing — and the exact fix.'",
        "priority": 1,
        "category": "hook",
    },
    "no_face": {
        "title": "Add a talking-head segment to build connection",
        "description": "Even 5–10 seconds of direct-to-camera eye contact significantly increases emotional resonance and trust.",
        "example": "Open with 2–3 seconds of your face looking directly at the camera before cutting to screen recordings or B-roll.",
        "priority": 3,
        "category": "visual",
    },
    "subtitles": {
        "title": "Add subtitles/captions to every video",
        "description": "85% of social videos are watched on mute. Auto-caption with CapCut, Captions.ai, or Descript. Bold font, high contrast.",
        "example": "Use white text with black outline, 60–80% screen width, positioned in the lower third.",
        "priority": 2,
        "category": "captions",
    },
    "sharpness": {
        "title": "Improve video sharpness and resolution",
        "description": "Export at minimum 1080p 30fps. Ensure your camera or phone lens is clean. Avoid digital zoom.",
        "example": "On iPhone: Settings → Camera → Record Video → 1080p HD at 60fps. Always tap to focus before recording.",
        "priority": 2,
        "category": "visual",
    },
    "lighting": {
        "title": "Fix your lighting setup",
        "description": "Face a window or use a ring light/softbox. Aim for even, soft light with no harsh shadows. Avoid backlit shots.",
        "example": "A $30 ring light placed 3 feet in front of you at eye level will transform your video quality instantly.",
        "priority": 2,
        "category": "visual",
    },
}

CATEGORY_MAP = {
    "weak opening": "hook",
    "hook": "hook",
    "slow": "slow_pacing",
    "pacing": "slow_pacing",
    "silence": "silence",
    "audio": "audio_quality",
    "filler": "filler_words",
    "main message": "hook_message",
    "value": "hook_message",
    "face": "no_face",
    "human": "no_face",
    "caption": "subtitles",
    "subtitle": "subtitles",
    "sharp": "sharpness",
    "blur": "sharpness",
    "light": "lighting",
    "bright": "lighting",
    "dark": "lighting",
}


def generate_recommendations(insights: list[dict[str, Any]]) -> list[dict]:
    """
    Map insights to recommendations.

    Args:
        insights: List of insight dicts from insight_engine.

    Returns:
        Deduplicated, priority-sorted list of recommendation dicts.
    """
    used_keys: set[str] = set()
    recommendations: list[dict] = []

    for insight in insights:
        problem = insight.get("problem", "").lower()
        matched_key = _match_problem_to_key(problem)
        if matched_key and matched_key not in used_keys:
            used_keys.add(matched_key)
            rec = PROBLEM_TO_RECOMMENDATION[matched_key].copy()
            rec["id"] = str(uuid.uuid4())
            recommendations.append(rec)

    recommendations.sort(key=lambda r: r["priority"])
    return recommendations[:6]  # return top 6


def _match_problem_to_key(problem: str) -> str | None:
    for keyword, rec_key in CATEGORY_MAP.items():
        if keyword in problem:
            return rec_key
    return None
