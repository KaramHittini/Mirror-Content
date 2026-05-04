FROM python:3.12-slim

WORKDIR /app

# System deps: build tools + all media/vision libraries the AI pipeline needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ cmake build-essential \
    libpq-dev \
    ffmpeg \
    tesseract-ocr \
    libsndfile1 \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 libgomp1 \
    libopenblas-dev liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip wheel && \
    pip install --no-cache-dir "setuptools==69.5.1"

# Backend requirements (Celery, SQLAlchemy, config, redis …)
COPY backend/requirements.txt /tmp/backend_req.txt
RUN pip install --no-cache-dir -r /tmp/backend_req.txt

# AI pipeline requirements (cv2, moviepy, whisper, face-recognition …)
COPY ai/requirements.txt /tmp/ai_req.txt
RUN pip install --no-cache-dir --no-build-isolation -r /tmp/ai_req.txt

# Non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

# Copy backend source — ai/ is mounted as a volume at /app/ai
COPY --chown=appuser:appgroup backend/ .
RUN mkdir -p /app/ai && chown appuser:appgroup /app/ai

USER appuser
