"""
Celery worker tasks for AI analysis.
Broadcasts progress updates via Redis pub/sub (consumed by the WebSocket endpoint).
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from celery import Task
from celery.exceptions import SoftTimeLimitExceeded
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.workers.celery_app import celery_app
from app.core.config import settings

def _sync_db_url(url: str) -> str:
    """Convert any Postgres URL variant to a psycopg2 sync URL."""
    for prefix, replacement in (
        ("postgresql+asyncpg://", "postgresql+psycopg2://"),
        ("postgresql://", "postgresql+psycopg2://"),
        ("postgres://", "postgresql+psycopg2://"),
    ):
        if url.startswith(prefix):
            return replacement + url[len(prefix):]
    return url

sync_engine = create_engine(_sync_db_url(settings.database_url), pool_pre_ping=True)
SyncSession = sessionmaker(bind=sync_engine)


def _publish_progress(redis_client, analysis_id: str, stage: str, progress: int, message: str):
    payload = json.dumps({"analysisId": analysis_id, "stage": stage, "progress": progress, "message": message})
    redis_client.publish(f"analysis:{analysis_id}", payload)


def _get_ai_path() -> Path:
    ai_path = next(
        (p / "ai" for p in Path(__file__).resolve().parents if (p / "ai" / "main.py").exists()),
        Path("/app/ai"),
    )
    if str(ai_path) not in sys.path:
        sys.path.insert(0, str(ai_path))
    return ai_path


def _run_pipeline(r, db, analysis, file_path: str):
    from main import run_pipeline  # ai/main.py

    _publish_progress(r, analysis.id, "analyzing_video", 30, "Analyzing video structure...")
    _publish_progress(r, analysis.id, "analyzing_audio", 55, "Analyzing audio quality...")
    _publish_progress(r, analysis.id, "analyzing_visual", 70, "Analyzing visual quality...")
    _publish_progress(r, analysis.id, "generating_insights", 85, "Generating insights...")

    result = run_pipeline(file_path)

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

    _publish_progress(r, analysis.id, "complete", 100, "Analysis complete!")


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
        _get_ai_path()

        file_path = str(Path(settings.local_upload_dir) / storage_key)
        _run_pipeline(r, db, analysis, file_path)

    except SoftTimeLimitExceeded as exc:
        db.rollback()
        from app.models.analysis import Analysis as A
        analysis = db.get(A, analysis_id)
        if analysis:
            analysis.status = "failed"
            analysis.error_message = "Analysis timed out. Try a shorter video."
            db.commit()
        _publish_progress(r, analysis_id, "failed", 0, "Analysis timed out.")
    except Exception as exc:
        db.rollback()
        from app.models.analysis import Analysis as A
        analysis = db.get(A, analysis_id)
        if analysis:
            analysis.status = "failed"
            analysis.error_message = str(exc)
            db.commit()
        _publish_progress(r, analysis_id, "failed", 0, f"Analysis failed: {exc}")
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(bind=True, name="app.workers.analysis_worker.download_and_run_analysis", max_retries=2)
def download_and_run_analysis(self: Task, analysis_id: str, source_url: str):
    import redis as redis_lib
    import yt_dlp

    r = redis_lib.from_url(settings.redis_url)
    db = SyncSession()

    try:
        from app.models.analysis import Analysis

        analysis = db.get(Analysis, analysis_id)
        if not analysis:
            return

        analysis.status = "processing"
        db.commit()

        _publish_progress(r, analysis_id, "preprocessing", 5, "Downloading video...")

        upload_dir = Path(settings.local_upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)

        ydl_opts = {
            "format": "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio/best",
            "outtmpl": str(upload_dir / f"{analysis_id}.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
            "max_filesize": 500 * 1024 * 1024,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(source_url, download=True)
            ext = info.get("ext", "mp4")
            title = info.get("title", "video")

        storage_key = f"{analysis_id}.{ext}"
        file_path = str(upload_dir / storage_key)

        analysis.filename = f"{title[:200]}.{ext}"
        analysis.storage_key = storage_key
        db.commit()

        _publish_progress(r, analysis_id, "preprocessing", 20, "Download complete. Analyzing...")
        _get_ai_path()
        _run_pipeline(r, db, analysis, file_path)

    except SoftTimeLimitExceeded as exc:
        db.rollback()
        from app.models.analysis import Analysis as A
        analysis = db.get(A, analysis_id)
        if analysis:
            analysis.status = "failed"
            analysis.error_message = "Analysis timed out. Try a shorter video."
            db.commit()
        _publish_progress(r, analysis_id, "failed", 0, "Analysis timed out.")
    except Exception as exc:
        db.rollback()
        from app.models.analysis import Analysis as A
        analysis = db.get(A, analysis_id)
        if analysis:
            analysis.status = "failed"
            analysis.error_message = str(exc)
            db.commit()
        _publish_progress(r, analysis_id, "failed", 0, f"Analysis failed: {exc}")
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()
