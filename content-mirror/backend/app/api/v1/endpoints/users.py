from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateRequest, UsageResponse, ChangePasswordRequest
from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password

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
    await db.delete(current_user)
    await db.commit()
    return Response(status_code=204)
