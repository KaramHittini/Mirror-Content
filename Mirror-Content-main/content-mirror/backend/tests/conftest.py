"""
Pytest fixtures for the Content Mirror backend test suite.
Uses an in-memory SQLite database so tests run without Postgres.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.db.database import Base, get_session
from app.core.security import hash_password
from app.models.user import User

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def db_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    """HTTP test client with the DB dependency overridden."""

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_session] = _override_session
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def registered_user(db_session: AsyncSession):
    """A pre-created user in the test DB."""
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=hash_password("password123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient):
    """Register + log in, return Authorization headers."""
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Auth User", "email": "auth@example.com", "password": "password123"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "auth@example.com", "password": "password123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
