"""
Celery worker task: runs the full AI pipeline for a given analysis job.
Broadcasts progress updates via Redis pub/sub (consumed by the WebSocket endpoint).
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from celery import Task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.workers.celery_app import celery_app
from app.core.config import settings

# Synchronous engine for use inside Celery worker
sync_engine = create_engine(settings.database_url.replace("+asyncpg", "+psycopg2"), pool_pre_ping=True)
SyncSession = sessionmaker(bind=sync_engine)


def _publish_progress(redis_client, analysis_id: str, stage: str, progress: int, message: str):
    payload = json.dumps({"analysisId": analysis_id, "stage": stage, "progress": progress, "message": message})
    redis_client.publish(f"analysis:{analysis_id}", payload)


@celery_app.task(bind=True, name="app.workers.analysis_worker.run_analysis", max_retries=2)
def run_analysis(self: Task, analysis_id: str, storage_key: str):
    import redis as redis_lib

    r = redis_lib.from_url(settings.redis_url)
    db = SyncSession()

    try:
        from app.models.analysis import Analysis

        analysis = db.get(Analysis, analysis_id)
        if not analysis:
            return

        analysis.status = "processing"
        db.commit()

        _publish_progress(r, analysis_id, "preprocessing", 10, "Preprocessing video...")

        # Resolve file path
        storage_service_sync = _get_file_path(storage_key)

        # Locate the ai/ directory — works in Docker (/app/ai) and local dev
        ai_path = next(
            (p / "ai" for p in Path(__file__).resolve().parents
             if (p / "ai" / "main.py").exists()),
            Path("/app/ai"),
        )
        if str(ai_path) not in sys.path:
            sys.path.insert(0, str(ai_path))

        _publish_progress(r, analysis_id, "analyzing_video", 30, "Analyzing video structure...")
        _publish_progress(r, analysis_id, "analyzing_audio", 55, "Analyzing audio quality...")
        _publish_progress(r, analysis_id, "analyzing_visual", 70, "Analyzing visual quality...")
        _publish_progress(r, analysis_id, "generating_insights", 85, "Generating insights...")

        from main import run_pipeline  # ai/main.py

        result = run_pipeline(storage_service_sync)

        # Map pipeline output onto model
        analysis.hook_score = result.get("hook_score")
        analysis.hook_duration_seconds = result.get("hook_duration_seconds")
        analysis.pacing = result.get("pacing")
        analysis.audio_quality = result.get("audio_quality")
        analysis.image_quality = result.get("image_quality")
        analysis.weak_sections = result.get("weak_sections", [])
        analysis.insights = result.get("insights", [])
        analysis.recommendations = result.get("recommendations", [])
        analysis.similar_content = result.get("similar_content", [])
        analysis.transcript = result.get("transcript")
        analysis.wpm = result.get("wpm")
        analysis.filler_word_ratio = result.get("filler_word_ratio")
        analysis.hook_message_present = result.get("hook_message_present")
        analysis.sharpness_score = result.get("sharpness_score")
        analysis.brightness_score = result.get("brightness_score")
        analysis.face_detected = result.get("face_detected")
        analysis.subtitles_detected = result.get("subtitles_detected")
        analysis.status = "completed"
        analysis.completed_at = datetime.now(timezone.utc)
        db.commit()

        _publish_progress(r, analysis_id, "complete", 100, "Analysis complete!")

    except Exception as exc:
        db.rollback()
        analysis = db.get(__import__("app.models.analysis", fromlist=["Analysis"]).Analysis, analysis_id)
        if analysis:
            analysis.status = "failed"
            analysis.error_message = str(exc)
            db.commit()
        _publish_progress(r, analysis_id, "failed", 0, f"Analysis failed: {exc}")
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


def _get_file_path(storage_key: str) -> str:
    from pathlib import Path
    return str(Path(settings.local_upload_dir) / storage_key)
