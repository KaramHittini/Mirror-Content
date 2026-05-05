from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response as FastAPIResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_session
from app.models.analysis import Analysis
from app.models.user import User
from app.schemas.analysis import (
    AnalysisResponse,
    AnalysisSummary,
    AnalysisUploadResponse,
    URLAnalysisRequest,
)
from app.services.queue_service import enqueue_analysis
from app.services.storage_service import StorageService

router = APIRouter(prefix="/analyses", tags=["analyses"])

ALLOWED_MIME = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"}
MAX_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB


async def _check_and_increment_limit(user_id: str, db: AsyncSession) -> User:
    """Re-fetch the user row with a write lock to prevent race conditions on the daily limit."""
    result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = result.scalar_one()

    if user.analyses_reset_at != date.today():
        user.analyses_today = 0
        user.analyses_reset_at = date.today()

    if user.analyses_today >= user.daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit of {user.daily_limit} analyses reached. Come back tomorrow or upgrade to Pro.",
        )
    return user


@router.post("/upload", response_model=AnalysisUploadResponse, status_code=202)
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail="Unsupported file type. Upload MP4, MOV, AVI, or MKV.")

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 500 MB.")

    # Lock user row before checking/incrementing quota (prevents race condition)
    user = await _check_and_increment_limit(current_user.id, db)

    storage = StorageService()
    storage_key = await storage.upload(content, file.filename or "video.mp4")

    analysis = Analysis(
        user_id=user.id,
        filename=file.filename or "video.mp4",
        storage_key=storage_key,
        status="pending",
    )
    db.add(analysis)
    await db.flush()

    try:
        task_id = enqueue_analysis(str(analysis.id), storage_key)
        analysis.celery_task_id = task_id
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=503, detail="Analysis queue is unavailable. Please try again shortly.")

    user.analyses_used += 1
    user.analyses_today += 1
    await db.commit()
    await db.refresh(analysis)

    return AnalysisUploadResponse(analysis_id=analysis.id)


@router.post("/url", response_model=AnalysisUploadResponse, status_code=202)
async def analyze_url(
    body: URLAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    # Lock user row before checking/incrementing quota (prevents race condition)
    user = await _check_and_increment_limit(current_user.id, db)

    analysis = Analysis(
        user_id=user.id,
        filename=str(body.url),
        storage_key=None,
        status="pending",
    )
    db.add(analysis)
    await db.flush()

    try:
        from app.workers.analysis_worker import download_and_run_analysis
        task = download_and_run_analysis.delay(str(analysis.id), str(body.url))
        analysis.celery_task_id = task.id
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=503, detail="Analysis queue is unavailable. Please try again shortly.")

    user.analyses_used += 1
    user.analyses_today += 1
    await db.commit()
    await db.refresh(analysis)

    return AnalysisUploadResponse(analysis_id=analysis.id)


@router.post("/{analysis_id}/cancel", status_code=204)
async def cancel_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.status not in ("pending", "processing"):
        raise HTTPException(status_code=400, detail="Analysis is not in progress")

    # Actually revoke the Celery task so the worker stops processing
    if analysis.celery_task_id:
        try:
            from app.workers.celery_app import celery_app
            celery_app.control.revoke(analysis.celery_task_id, terminate=True, signal="SIGTERM")
        except Exception:
            pass  # best-effort; still mark as failed in DB

    analysis.status = "failed"
    analysis.error_message = "Cancelled by user"
    await db.commit()
    return FastAPIResponse(status_code=204)


@router.get("", response_model=list[AnalysisSummary])
async def list_analyses(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    q = select(Analysis).where(Analysis.user_id == current_user.id)
    if status == "in_progress":
        q = q.where(Analysis.status.in_(["pending", "processing"]))
    elif status:
        q = q.where(Analysis.status == status)
    if search:
        q = q.where(Analysis.filename.ilike(f"%{search}%"))
    q = q.order_by(desc(Analysis.created_at)).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.delete("/{analysis_id}", status_code=204)
async def delete_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    await db.delete(analysis)
    await db.commit()
    return FastAPIResponse(status_code=204)


@router.get("/internal/file/{storage_key:path}", include_in_schema=False)
async def serve_file_internal(storage_key: str):
    """Serve an uploaded file over Railway private network so the worker can fetch it."""
    import os
    file_path = os.path.join(os.environ.get("LOCAL_UPLOAD_DIR", "./uploads"), storage_key)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis
