import secrets

import redis.asyncio as aioredis
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import _password_reset_html, _verify_email_html, send_email
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.db.database import get_session
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_RESET_TTL = 3600       # 1 hour
_VERIFY_TTL = 86400     # 24 hours


async def _redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_session)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    user = User(name=body.name, email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send verification email (best-effort)
    token = secrets.token_urlsafe(32)
    r = await _redis()
    await r.setex(f"verify_email:{token}", _VERIFY_TTL, str(user.id))
    await r.aclose()
    verify_url = f"{settings.app_base_url}/verify-email?token={token}"
    await send_email(user.email, "Verify your Content Mirror email", _verify_email_html(verify_url))

    refresh = create_refresh_token(user.id)
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="lax",
                        max_age=settings.jwt_refresh_token_expire_days * 86400)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    refresh = create_refresh_token(user.id)
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="lax",
                        max_age=settings.jwt_refresh_token_expire_days * 86400)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str = Cookie(None), db: AsyncSession = Depends(get_session)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie("refresh_token")


@router.post("/forgot-password", status_code=204)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    # Always return 204 — never reveal whether the email exists
    if not user:
        return Response(status_code=204)

    token = secrets.token_urlsafe(32)
    r = await _redis()
    await r.setex(f"pwd_reset:{token}", _RESET_TTL, str(user.id))
    await r.aclose()

    reset_url = f"{settings.app_base_url}/reset-password?token={token}"
    await send_email(user.email, "Reset your Content Mirror password", _password_reset_html(reset_url))
    return Response(status_code=204)


@router.post("/reset-password", status_code=204)
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_session)):
    r = await _redis()
    user_id = await r.getdel(f"pwd_reset:{body.token}")
    await r.aclose()

    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link. Please request a new one.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return Response(status_code=204)


@router.get("/verify-email", status_code=204)
async def verify_email(token: str, db: AsyncSession = Depends(get_session)):
    r = await _redis()
    user_id = await r.getdel(f"verify_email:{token}")
    await r.aclose()

    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.email_verified = True
    await db.commit()
    return Response(status_code=204)


@router.post("/resend-verification", status_code=204)
async def resend_verification(
    refresh_token: str = Cookie(None),
    db: AsyncSession = Depends(get_session),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user or user.email_verified:
        return Response(status_code=204)

    token = secrets.token_urlsafe(32)
    r = await _redis()
    await r.setex(f"verify_email:{token}", _VERIFY_TTL, str(user.id))
    await r.aclose()

    verify_url = f"{settings.app_base_url}/verify-email?token={token}"
    await send_email(user.email, "Verify your Content Mirror email", _verify_email_html(verify_url))
    return Response(status_code=204)
