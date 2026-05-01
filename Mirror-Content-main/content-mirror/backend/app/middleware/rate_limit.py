import time
import logging
from collections import defaultdict
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("content_mirror.rate_limit")

# Paths that are exempt from IP-level rate limiting (health check, static)
_EXEMPT_PREFIXES = ("/health", "/docs", "/redoc", "/openapi")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory sliding-window IP rate limiter.
    Default: 120 requests per minute per IP.
    This complements the per-user monthly analysis quota enforced at the endpoint level.
    """

    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        self.rpm = requests_per_minute
        self._windows: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(p) for p in _EXEMPT_PREFIXES):
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        cutoff = now - 60.0

        bucket = self._windows[ip]
        # Evict timestamps outside the 60-second window
        self._windows[ip] = [t for t in bucket if t > cutoff]

        if len(self._windows[ip]) >= self.rpm:
            logger.warning("Rate limit hit: ip=%s path=%s", ip, path)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests — please slow down."},
                headers={"Retry-After": "60"},
            )

        self._windows[ip].append(now)
        return await call_next(request)
