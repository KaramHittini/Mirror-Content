import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"name": "Bob", "email": "bob@example.com", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"name": "Carol", "email": "carol@example.com", "password": "short"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "password123"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "dave@example.com", "password": "password123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Eve", "email": "eve@example.com", "password": "password123"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "eve@example.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/users/me", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "auth@example.com"
    assert body["plan"] == "free"
    assert body["analyses_used"] == 0


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_patch_me(client: AsyncClient, auth_headers: dict):
    resp = await client.patch(
        "/api/v1/users/me",
        json={"name": "Updated Name"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_usage_endpoint(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/users/me/usage", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["analyses_used"] == 0
    assert body["analyses_limit"] == 5
    assert body["plan"] == "free"
    assert body["usage_pct"] == 0.0


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/auth/logout", headers=auth_headers)
    assert resp.status_code == 204
