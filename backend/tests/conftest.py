"""Shared pytest fixtures.

The test DB + env must be configured BEFORE any `app.*` import so
`app.config.settings` picks up the test URL at instantiation.
"""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# StaticEnv override: a throwaway file DB rather than the dev convox.db.
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_convox.db"
os.environ["MAX_TURNS"] = "6"
os.environ["ENABLE_EVENTS"] = "false"

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

# Ensure every model is registered with Base.metadata before create_all.
from app import models  # noqa: E402,F401
from app.database import Base, get_session  # noqa: E402
from app.main import app  # noqa: E402
from app.services.scenario_engine import sync_scenarios  # noqa: E402
from app.services.users import get_or_create_default_user  # noqa: E402

TEST_DB_URL = "sqlite+aiosqlite:///./test_convox.db"


def _drop(path: str) -> None:
    try:
        os.remove(path)
    except FileNotFoundError:
        pass


@pytest_asyncio.fixture
async def db_engine():
    _drop("test_convox.db")
    engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()
    _drop("test_convox.db")


@pytest_asyncio.fixture
async def session(db_engine):
    maker = async_sessionmaker(db_engine, expire_on_commit=False)
    async with maker() as s:
        yield s


@pytest_asyncio.fixture
async def seeded_session(session):
    """Session with scenarios synced + the default user present."""
    await sync_scenarios(session)
    await get_or_create_default_user(session)
    await session.commit()
    return session


@pytest_asyncio.fixture
async def client(db_engine):
    from sqlalchemy.ext.asyncio import async_sessionmaker as _asm

    maker = _asm(db_engine, expire_on_commit=False)

    async def override_get_session():
        async with maker() as s:
            yield s

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()