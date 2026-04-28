"""
Benchmark Engine — Noor Adili's primary file.

Finds similar successful content from the vector DB and explains why they succeeded
compared to the user's content.

Vector schema: each stored content item has a feature vector of:
  [hook_score, pacing_encoded, audio_quality_encoded, image_quality_encoded,
   face_detected, subtitles_detected, wpm_normalized]
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import numpy as np


QUALITY_ENCODING = {"poor": 0.25, "average": 0.5, "good": 0.75, "excellent": 1.0}
PACING_ENCODING = {"slow": 0.0, "medium": 0.5, "fast": 1.0}


@dataclass
class SimilarContent:
    title: str
    platform: str
    url: str | None
    why_successful: str
    key_differences: str
    hook_score: float

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "platform": self.platform,
            "url": self.url,
            "why_successful": self.why_successful,
            "key_differences": self.key_differences,
            "hook_score": self.hook_score,
        }


def find_similar_content(analysis_data: dict[str, Any]) -> list[dict]:
    """
    Query vector DB for similar successful content.
    Falls back to curated seed examples if Pinecone is unavailable.

    Args:
        analysis_data: Merged analyzer output dict.

    Returns:
        List of SimilarContent dicts (top 3).
    """
    try:
        return _query_pinecone(analysis_data)
    except Exception:
        return _fallback_seed_examples(analysis_data)


def build_feature_vector(data: dict) -> list[float]:
    """Encode analysis data into a normalized feature vector for similarity search."""
    return [
        float(data.get("hook_score", 5.0)) / 10.0,
        PACING_ENCODING.get(data.get("pacing", "medium"), 0.5),
        QUALITY_ENCODING.get(data.get("audio_quality", "average"), 0.5),
        QUALITY_ENCODING.get(data.get("image_quality", "average"), 0.5),
        1.0 if data.get("face_detected") else 0.0,
        1.0 if data.get("subtitles_detected") else 0.0,
        min(float(data.get("wpm", 130)) / 200.0, 1.0),
    ]


def _query_pinecone(data: dict) -> list[dict]:
    from pinecone import Pinecone
    import os

    api_key = os.getenv("PINECONE_API_KEY", "")
    index_name = os.getenv("PINECONE_INDEX_NAME", "content-mirror-benchmarks")
    if not api_key:
        raise ValueError("Pinecone API key not set")

    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)
    vector = build_feature_vector(data)

    results = index.query(vector=vector, top_k=3, include_metadata=True)
    similar: list[dict] = []
    for match in results.matches:
        meta = match.metadata or {}
        key_diffs = _generate_key_differences(data, meta)
        similar.append(SimilarContent(
            title=meta.get("title", "Successful video"),
            platform=meta.get("platform", "tiktok"),
            url=meta.get("url"),
            why_successful=meta.get("why_successful", "Strong hook and clear message"),
            key_differences=key_diffs,
            hook_score=float(meta.get("hook_score", 8.0)),
        ).to_dict())
    return similar


def _fallback_seed_examples(data: dict) -> list[dict]:
    """
    Curated seed examples used when Pinecone is unavailable (MVP development phase).
    These are illustrative and should be replaced with real indexed content.
    """
    hook_score = data.get("hook_score", 5.0)
    pacing = data.get("pacing", "medium")
    has_subtitles = data.get("subtitles_detected", False)

    examples = [
        SimilarContent(
            title="Creator growth video — 0 to 100K in 6 months",
            platform="tiktok",
            url=None,
            why_successful="Opened with a bold statistic in the first 2 seconds, used fast cuts every 3–4 seconds, and included animated captions throughout",
            key_differences=_describe_difference(hook_score, 8.9, pacing, "fast", has_subtitles, True),
            hook_score=8.9,
        ),
        SimilarContent(
            title="'Why your content isn't growing' explainer",
            platform="instagram",
            url=None,
            why_successful="Clear value promise stated verbally and visually within 3 seconds, face on camera builds trust, subtitles enabled 3x more watch time",
            key_differences=_describe_difference(hook_score, 8.2, pacing, "medium", has_subtitles, True),
            hook_score=8.2,
        ),
        SimilarContent(
            title="Tutorial video — highest retention in category",
            platform="youtube",
            url=None,
            why_successful="Hook asks a direct question the audience cares about, body uses screen recordings + talking head alternation, clear CTA at the end",
            key_differences=_describe_difference(hook_score, 7.8, pacing, "medium", has_subtitles, True),
            hook_score=7.8,
        ),
    ]
    return [e.to_dict() for e in examples]


def _describe_difference(
    user_hook: float,
    their_hook: float,
    user_pacing: str,
    their_pacing: str,
    user_subs: bool,
    their_subs: bool,
) -> str:
    diffs = []
    if their_hook - user_hook >= 1.5:
        diffs.append(f"Their hook score ({their_hook:.1f}) was significantly higher than yours ({user_hook:.1f})")
    if user_pacing != their_pacing:
        diffs.append(f"They used {their_pacing} pacing vs your {user_pacing} pacing")
    if their_subs and not user_subs:
        diffs.append("They used subtitles throughout — you didn't")
    return ". ".join(diffs) if diffs else "Similar overall structure, minor execution differences"


def _generate_key_differences(user_data: dict, meta: dict) -> str:
    return _describe_difference(
        user_hook=user_data.get("hook_score", 5.0),
        their_hook=float(meta.get("hook_score", 8.0)),
        user_pacing=user_data.get("pacing", "medium"),
        their_pacing=meta.get("pacing", "fast"),
        user_subs=bool(user_data.get("subtitles_detected")),
        their_subs=bool(meta.get("subtitles_detected", True)),
    )
