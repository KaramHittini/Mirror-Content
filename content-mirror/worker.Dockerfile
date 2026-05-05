# Build context: content-mirror/ (root .dockerignore applies)
# ── Builder ──────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN python -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

COPY backend/requirements.txt backend-requirements.txt
COPY ai/requirements.txt ai-requirements.txt
RUN pip install --no-cache-dir -r backend-requirements.txt -r ai-requirements.txt

# ── Runtime ──────────────────────────────────────────────────────
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 ffmpeg tesseract-ocr \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf-xlib-2.0-0 libffi8 shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/venv /app/venv

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

WORKDIR /app

# Backend code (Celery tasks, models, config)
COPY --chown=appuser:appgroup backend/ .

# AI pipeline code
COPY --chown=appuser:appgroup ai/ ai/

RUN mkdir -p uploads && chown appuser:appgroup uploads

USER appuser
ENV PATH="/app/venv/bin:$PATH"

CMD ["celery", "-A", "app.workers.celery_app", "worker", \
     "--queues", "analysis", "--loglevel=info", "--concurrency=1"]
