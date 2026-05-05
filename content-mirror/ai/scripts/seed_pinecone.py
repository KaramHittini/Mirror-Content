"""
Pinecone Seeding Script — Noor Adili.

Indexes a curated set of successful content examples into Pinecone so the
benchmark engine can perform real similarity searches instead of using the
hardcoded fallback examples.

Usage:
    PINECONE_API_KEY=your-key python ai/scripts/seed_pinecone.py

Each record in SEED_CONTENT represents a real-world successful video with
known performance characteristics. Add more records here as you curate data.

Vector schema (7 dimensions, all normalized 0–1):
    [hook_score/10, pacing_encoded, audio_quality_encoded,
     image_quality_encoded, face_detected, subtitles_detected, wpm/200]
"""

from __future__ import annotations

import os
import sys
import uuid

# Allow running from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

QUALITY_ENCODING = {"poor": 0.25, "average": 0.5, "good": 0.75, "excellent": 1.0}
PACING_ENCODING = {"slow": 0.0, "medium": 0.5, "fast": 1.0}


def build_vector(record: dict) -> list[float]:
    return [
        float(record["hook_score"]) / 10.0,
        PACING_ENCODING[record["pacing"]],
        QUALITY_ENCODING[record["audio_quality"]],
        QUALITY_ENCODING[record["image_quality"]],
        1.0 if record["face_detected"] else 0.0,
        1.0 if record["subtitles_detected"] else 0.0,
        min(float(record["wpm"]) / 200.0, 1.0),
    ]


# ── Curated content library ───────────────────────────────────────────────────
# Add real, well-performing videos here. Fields:
#   title, platform, why_successful, hook_score, pacing, audio_quality,
#   image_quality, face_detected, subtitles_detected, wpm
# Optional: url (if public)

SEED_CONTENT: list[dict] = [
    {
        "title": "Creator Growth: 0 to 100K in 6 Months",
        "platform": "tiktok",
        "url": None,
        "why_successful": "Opened with a bold statistic in the first 2 seconds, used fast cuts every 3–4 seconds, animated captions throughout boosted watch-without-sound rate",
        "hook_score": 8.9,
        "pacing": "fast",
        "audio_quality": "excellent",
        "image_quality": "good",
        "face_detected": True,
        "subtitles_detected": True,
        "wpm": 165,
    },
    {
        "title": "Why Your Content Isn't Growing (The Real Reason)",
        "platform": "instagram",
        "url": None,
        "why_successful": "Clear value promise stated verbally and visually within 3 seconds; direct eye contact with camera builds trust; subtitles enabled 3x more completion rate",
        "hook_score": 8.2,
        "pacing": "medium",
        "audio_quality": "excellent",
        "image_quality": "excellent",
        "face_detected": True,
        "subtitles_detected": True,
        "wpm": 140,
    },
    {
        "title": "5-Minute Morning Routine That Went Viral",
        "platform": "tiktok",
        "url": None,
        "why_successful": "Pattern interrupt in the first frame (unusual location), upbeat background music fills silence, text overlays on every scene cut",
        "hook_score": 9.1,
        "pacing": "fast",
        "audio_quality": "good",
        "image_quality": "excellent",
        "face_detected": True,
        "subtitles_detected": True,
        "wpm": 155,
    },
    {
        "title": "Tutorial: Edit Like a Pro in 60 Seconds",
        "platform": "youtube",
        "url": None,
        "why_successful": "Hook asks a direct question the audience cares about; alternates between screen recordings and talking head; clear CTA at the 55-second mark",
        "hook_score": 7.8,
        "pacing": "medium",
        "audio_quality": "excellent",
        "image_quality": "good",
        "face_detected": True,
        "subtitles_detected": True,
        "wpm": 130,
    },
    {
        "title": "Product Review That Outperformed the Brand's Own Content",
        "platform": "instagram",
        "url": None,
        "why_successful": "Unboxing hook generates curiosity; close-up shots show detail; spoken review matches on-screen text for dual-mode watching",
        "hook_score": 7.5,
        "pacing": "medium",
        "audio_quality": "good",
        "image_quality": "excellent",
        "face_detected": True,
        "subtitles_detected": True,
        "wpm": 125,
    },
    {
        "title": "Fitness Challenge: Before & After 30 Days",
        "platform": "tiktok",
        "url": None,
        "why_successful": "Transformation reveal in hook creates immediate curiosity gap; energetic music pace matches cut frequency; community challenge angle drives shares",
        "hook_score": 9.3,
        "pacing": "fast",
        "audio_quality": "good",
        "image_quality": "good",
        "face_detected": True,
        "subtitles_detected": True,
        "wpm": 170,
    },
    {
        "title": "Screen-Only Coding Tutorial (No Face)",
        "platform": "youtube",
        "url": None,
        "why_successful": "Highly specific title sets exact expectation; clear chapter structure reduces bounce; real-time typing keeps pacing high despite no face",
        "hook_score": 7.2,
        "pacing": "medium",
        "audio_quality": "excellent",
        "image_quality": "excellent",
        "face_detected": False,
        "subtitles_detected": True,
        "wpm": 120,
    },
    {
        "title": "Slow-Paced Documentary Style Travel Vlog",
        "platform": "youtube",
        "url": None,
        "why_successful": "Cinematic B-roll and narration compensate for slow pacing; high image quality signals production value; ambient audio adds immersion",
        "hook_score": 6.8,
        "pacing": "slow",
        "audio_quality": "excellent",
        "image_quality": "excellent",
        "face_detected": True,
        "subtitles_detected": False,
        "wpm": 95,
    },
]


def seed(api_key: str, index_name: str) -> None:
    from pinecone import Pinecone, ServerlessSpec

    pc = Pinecone(api_key=api_key)

    existing = [idx.name for idx in pc.list_indexes()]
    if index_name not in existing:
        print(f"Creating index '{index_name}' (dimension=7, metric=cosine)...")
        pc.create_index(
            name=index_name,
            dimension=7,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )

    index = pc.Index(index_name)

    vectors = []
    for record in SEED_CONTENT:
        vector_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, record["title"]))
        vector = build_vector(record)
        metadata = {
            "title": record["title"],
            "platform": record["platform"],
            "url": record.get("url") or "",
            "why_successful": record["why_successful"],
            "hook_score": record["hook_score"],
            "pacing": record["pacing"],
            "subtitles_detected": record["subtitles_detected"],
        }
        vectors.append({"id": vector_id, "values": vector, "metadata": metadata})

    index.upsert(vectors=vectors)
    print(f"Seeded {len(vectors)} records into '{index_name}'.")


if __name__ == "__main__":
    api_key = os.getenv("PINECONE_API_KEY", "")
    index_name = os.getenv("PINECONE_INDEX_NAME", "content-mirror-benchmarks")

    if not api_key:
        print("Error: PINECONE_API_KEY environment variable not set.")
        sys.exit(1)

    seed(api_key, index_name)
