from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateRequest, UsageResponse
from app.core.dependencies import get_current_user

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
        analyses_limit=current_user.analyses_limit,
        plan=current_user.plan,
        usage_pct=round((current_user.analyses_used / current_user.analyses_limit) * 100, 1),
    )
