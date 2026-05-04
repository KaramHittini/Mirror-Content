import json
import logging
import logging.config
from contextlib import asynccontextmanager
from pathlib import Path

import redis.asyncio as aioredis
import sentry_sdk
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.api.v1.router import router
from app.core.config import settings
from app.core.security import decode_token
from app.db.database import create_tables, AsyncSessionLocal
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware

# ── Sentry ─────────────────────────────────────────────────────────────────────
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.2,
        send_default_pii=False,
    )

# ── Logging setup ──────────────────────────────────────────────────────────────
if settings.app_env == "production":
    from app.core.logging_config import JSONFormatter
    _handler = logging.StreamHandler()
    _handler.setFormatter(JSONFormatter())
    logging.root.handlers = [_handler]
    logging.root.setLevel(logging.INFO)
else:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%H:%M:%S",
    )
logger = logging.getLogger("content_mirror")


# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Content Mirror API (env=%s)", settings.app_env)
    Path(settings.local_upload_dir).mkdir(parents=True, exist_ok=True)
    await create_tables()
    logger.info("Database tables ready")
    yield
    logger.info("Shutting down")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Content Mirror API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
)

# Middleware — order matters: CORS first, then logging
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=120)

app.include_router(router)
Path(settings.local_upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.local_upload_dir), name="static")


# ── Global exception handler ───────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Our team has been notified."},
    )


# ── WebSocket — real-time analysis progress ────────────────────────────────────
@app.websocket("/ws/{analysis_id}")
async def analysis_websocket(websocket: WebSocket, analysis_id: str):
    from sqlalchemy import select as sa_select
    from app.models.analysis import Analysis

    # Authenticate via token query param (httpOnly cookie can't be read by JS for WS)
    token = websocket.query_params.get("token", "")
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001)
        return

    user_id = payload["sub"]

    # Verify the analysis belongs to this user
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            sa_select(Analysis).where(
                Analysis.id == analysis_id,
                Analysis.user_id == user_id,
            )
        )
        if not result.scalar_one_or_none():
            await websocket.close(code=4003)
            return

    await websocket.accept()
    r = aioredis.from_url(settings.redis_url)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"analysis:{analysis_id}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"].decode())
                data = json.loads(message["data"])
                if data.get("stage") in ("complete", "failed"):
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"analysis:{analysis_id}")
        await r.aclose()


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    from sqlalchemy import text
    checks: dict[str, str] = {}

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception:
        checks["db"] = "error"

    try:
        r = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"

    healthy = all(v == "ok" for v in checks.values())
    return JSONResponse(
        status_code=200 if healthy else 503,
        content={"status": "ok" if healthy else "degraded", "checks": checks, "env": settings.app_env},
    )
