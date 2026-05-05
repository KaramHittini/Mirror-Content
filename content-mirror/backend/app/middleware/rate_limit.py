import logging
import time
from collections import defaultdict

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("content_mirror.rate_limit")

_EXEMPT_PREFIXES = ("/health", "/docs", "/redoc", "/openapi")

# Stricter per-path limits for auth endpoints (attempts per minute per IP)
_AUTH_LIMITS: dict[str, int] = {
    "/api/v1/auth/login": 10,
    "/api/v1/auth/register": 5,
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window IP rate limiter with tighter limits on auth endpoints.
    Default global limit: 120 req/min per IP.
    Auth endpoints: 10/min for login, 5/min for register.
    """

    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        self.rpm = requests_per_minute
        self._windows: dict[str, list[float]] = defaultdict(list)
        self._auth_windows: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        from app.core.config import settings
        if settings.app_env == "testing":
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(p) for p in _EXEMPT_PREFIXES):
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        cutoff = now - 60.0

        # Stricter check for auth endpoints
        if path in _AUTH_LIMITS:
            limit = _AUTH_LIMITS[path]
            key = f"{ip}:{path}"
            self._auth_windows[key] = [t for t in self._auth_windows[key] if t > cutoff]
            if len(self._auth_windows[key]) >= limit:
                logger.warning("Auth rate limit hit: ip=%s path=%s", ip, path)
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many attempts — please wait before trying again."},
                    headers={"Retry-After": "60"},
                )
            self._auth_windows[key].append(now)

        # Global limit
        self._windows[ip] = [t for t in self._windows[ip] if t > cutoff]
        if len(self._windows[ip]) >= self.rpm:
            logger.warning("Rate limit hit: ip=%s path=%s", ip, path)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests — please slow down."},
                headers={"Retry-After": "60"},
            )
        self._windows[ip].append(now)
        return await call_next(request)
