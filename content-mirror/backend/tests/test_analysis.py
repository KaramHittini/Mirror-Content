"""
Tests for the analysis endpoints.
Upload and queue tests mock the storage + Celery worker so they don't
require a real file system or broker.
"""

import io
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient


def _mp4_bytes() -> bytes:
    """Minimal valid-looking MP4 bytes (just enough to pass content-type check)."""
    return b"\x00\x00\x00\x18ftypisom" + b"\x00" * 100


@pytest.mark.asyncio
async def test_upload_unauthenticated(client: AsyncClient):
    resp = await client.post(
        "/api/v1/analyses/upload",
        files={"file": ("test.mp4", _mp4_bytes(), "video/mp4")},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_upload_unsupported_type(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/v1/analyses/upload",
        files={"file": ("image.png", b"fake png data", "image/png")},
        headers=auth_headers,
    )
    assert resp.status_code == 415


@pytest.mark.asyncio
@patch("app.api.v1.endpoints.analysis.StorageService")
@patch("app.api.v1.endpoints.analysis.enqueue_analysis")
async def test_upload_success(
    mock_enqueue: MagicMock,
    MockStorage: MagicMock,
    client: AsyncClient,
    auth_headers: dict,
):
    instance = MockStorage.return_value
    instance.upload = AsyncMock(return_value="uploads/test-uuid.mp4")
    mock_enqueue.return_value = "celery-task-id"

    resp = await client.post(
        "/api/v1/analyses/upload",
        files={"file": ("video.mp4", _mp4_bytes(), "video/mp4")},
        headers=auth_headers,
    )
    assert resp.status_code == 202
    body = resp.json()
    assert "analysis_id" in body
    assert body["message"] == "Analysis queued successfully"


@pytest.mark.asyncio
async def test_list_analyses_empty(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/analyses", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
@patch("app.api.v1.endpoints.analysis.StorageService")
@patch("app.api.v1.endpoints.analysis.enqueue_analysis")
async def test_get_analysis_not_found(
    mock_enqueue: MagicMock,
    MockStorage: MagicMock,
    client: AsyncClient,
    auth_headers: dict,
):
    resp = await client.get("/api/v1/analyses/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
@patch("app.api.v1.endpoints.analysis.StorageService")
@patch("app.api.v1.endpoints.analysis.enqueue_analysis")
async def test_upload_increments_usage(
    mock_enqueue: MagicMock,
    MockStorage: MagicMock,
    client: AsyncClient,
    auth_headers: dict,
):
    instance = MockStorage.return_value
    instance.upload = AsyncMock(return_value="uploads/video.mp4")
    mock_enqueue.return_value = "task-id"

    await client.post(
        "/api/v1/analyses/upload",
        files={"file": ("video.mp4", _mp4_bytes(), "video/mp4")},
        headers=auth_headers,
    )

    resp = await client.get("/api/v1/users/me/usage", headers=auth_headers)
    assert resp.json()["analyses_used"] == 1
