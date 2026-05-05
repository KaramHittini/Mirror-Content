#!/bin/sh
set -e

# Start Celery worker in background (single concurrency for memory efficiency)
celery -A app.workers.celery_app worker \
    --queues analysis \
    --loglevel=info \
    --concurrency=1 &

# Start uvicorn in foreground — container lifetime matches uvicorn
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 1
