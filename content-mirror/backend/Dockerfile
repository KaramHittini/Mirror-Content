# ── Builder: compile wheels that need C extensions ─────────────
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN python -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Runtime: only what's needed to run ─────────────────────────
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 ffmpeg tesseract-ocr \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 libffi8 shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/venv /app/venv

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 --ingroup appgroup appuser

WORKDIR /app
COPY --chown=appuser:appgroup . .
RUN mkdir -p uploads && chown appuser:appgroup uploads

USER appuser
ENV PATH="/app/venv/bin:$PATH"

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
