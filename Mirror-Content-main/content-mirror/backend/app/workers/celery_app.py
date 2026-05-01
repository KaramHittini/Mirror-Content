from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "content_mirror",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.analysis_worker"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_routes={"app.workers.analysis_worker.*": {"queue": "analysis"}},
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
