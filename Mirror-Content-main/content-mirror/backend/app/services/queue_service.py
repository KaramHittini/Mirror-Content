from app.workers.celery_app import celery_app


def enqueue_analysis(analysis_id: str, storage_key: str) -> str:
    """Push an analysis job onto the Celery queue. Returns the task ID."""
    result = celery_app.send_task(
        "app.workers.analysis_worker.run_analysis",
        kwargs={"analysis_id": analysis_id, "storage_key": storage_key},
        queue="analysis",
    )
    return result.id
