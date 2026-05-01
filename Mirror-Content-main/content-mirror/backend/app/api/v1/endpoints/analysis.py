from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.database import get_session
from app.models.user import User
from app.models.analysis import Analysis
from app.schemas.analysis import AnalysisUploadResponse, AnalysisResponse, AnalysisSummary
from app.core.dependencies import get_current_user
from app.services.storage_service import StorageService
from app.services.queue_service import enqueue_analysis

router = APIRouter(prefix="/analyses", tags=["analyses"])

ALLOWED_MIME = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"}
MAX_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB


@router.post("/upload", response_model=AnalysisUploadResponse, status_code=202)
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if current_user.analyses_used >= current_user.analyses_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Monthly limit of {current_user.analyses_limit} analyses reached. Upgrade to Pro for more.",
        )

    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail="Unsupported file type. Upload MP4, MOV, AVI, or MKV.")

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 500 MB.")

    storage = StorageService()
    storage_key = await storage.upload(content, file.filename or "video.mp4")

    analysis = Analysis(
        user_id=current_user.id,
        filename=file.filename or "video.mp4",
        storage_key=storage_key,
        status="pending",
    )
    db.add(analysis)
    current_user.analyses_used += 1
    await db.commit()
    await db.refresh(analysis)

    enqueue_analysis(analysis.id, storage_key)

    return AnalysisUploadResponse(analysis_id=analysis.id)


@router.get("", response_model=list[AnalysisSummary])
async def list_analyses(
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(desc(Analysis.created_at))
        .limit(limit)
    )
    return result.scalars().all()


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
