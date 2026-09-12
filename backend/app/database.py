"""Async SQLAlchemy engine, session factory, and declarative base.

SQLite-first via aiosqlite. The repository layer is written against SQLAlchemy
so a Postgres + pgvector swap (Phase 2) only changes the URL here.
"""

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    """Create all tables. v1 uses create_all; Alembic lands in Phase 2."""
    from . import models  # noqa: F401  (ensure models are registered)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if _is_sqlite:
            # WAL mode reduces lock contention for a file-backed DB.
            await conn.execute(text("PRAGMA journal_mode=WAL"))


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session."""
    async with SessionLocal() as session:
        yield session