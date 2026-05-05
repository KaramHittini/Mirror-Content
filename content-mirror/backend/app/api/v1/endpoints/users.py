from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password
from app.db.database import get_session
from app.models.analysis import Analysis
from app.models.user import User
from app.schemas.user import ChangeEmailRequest, ChangePasswordRequest, UsageResponse, UserResponse, UserUpdateRequest

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
AVATAR_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    current_user.name = body.name
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/usage", response_model=UsageResponse)
async def get_usage(current_user: User = Depends(get_current_user)):
    return UsageResponse(
        analyses_used=current_user.analyses_used,
        analyses_today=current_user.analyses_today,
        daily_limit=current_user.daily_limit,
        plan=current_user.plan,
        usage_pct=round((current_user.analyses_today / current_user.daily_limit) * 100, 1),
    )


@router.patch("/me/password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return Response(status_code=204)


@router.delete("/me", status_code=204)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await db.execute(delete(Analysis).where(Analysis.user_id == current_user.id))
    await db.delete(current_user)
    await db.commit()
    return Response(status_code=204)


@router.patch("/me/email", response_model=UserResponse)
async def change_email(
    body: ChangeEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    existing = await db.execute(select(User).where(User.email == body.new_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")
    current_user.email = body.new_email
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="File must be an image (JPEG, PNG, WebP, GIF)")
    contents = await file.read()
    if len(contents) > AVATAR_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image must be under 5 MB")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    avatar_dir = Path(settings.local_upload_dir) / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{current_user.id}.{ext}"
    (avatar_dir / filename).write_bytes(contents)
    import time as _time
    current_user.avatar_url = f"/static/avatars/{filename}?v={int(_time.time())}"
    await db.commit()
    await db.refresh(current_user)
    return current_user
