"""One-click migration script to copy all existing data from SQLite into Supabase (PostgreSQL).

Usage:
    python migrate_sqlite_to_supabase.py "postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

Or set DATABASE_URL in backend/.env to your Supabase connection string and run:
    python migrate_sqlite_to_supabase.py
"""

import asyncio
import os
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import Base
from app.models.conversation import Conversation, ScenarioEvent, Turn
from app.models.evaluation import Evaluation
from app.models.evaluation_job import EvaluationJob
from app.models.learner_profile import LearnerProfile
from app.models.scenario import Scenario
from app.models.travel import TravelJourney, TravelStage
from app.models.user import User


async def migrate(target_url: str):
    sqlite_path = Path(__file__).resolve().parent / "convox.db"
    if not sqlite_path.exists():
        print(f"[-] SQLite database not found at {sqlite_path}. Nothing to migrate.")
        return

    sqlite_url = f"sqlite+aiosqlite:///{sqlite_path}"
    print(f"[+] Connecting to source SQLite: {sqlite_url}")
    source_engine = create_async_engine(sqlite_url, echo=False)
    source_session_factory = async_sessionmaker(source_engine, class_=AsyncSession, expire_on_commit=False)

    # Format destination Postgres URL to use asyncpg
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif target_url.startswith("postgresql://") and not target_url.startswith("postgresql+"):
        target_url = target_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    print(f"[+] Connecting to target Supabase Postgres: {target_url.split('@')[-1] if '@' in target_url else target_url}")
    target_engine = create_async_engine(target_url, echo=False)
    target_session_factory = async_sessionmaker(target_engine, class_=AsyncSession, expire_on_commit=False)

    # 1. Create tables on target
    print("[+] Creating schema tables in Supabase...")
    async with target_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[✓] Tables verified in Supabase.")

    # 2. Extract and load in dependency order
    table_classes = [
        User,
        LearnerProfile,
        Scenario,
        Conversation,
        Turn,
        ScenarioEvent,
        Evaluation,
        EvaluationJob,
        TravelJourney,
        TravelStage,
    ]

    async with source_session_factory() as src_session, target_session_factory() as dst_session:
        for model in table_classes:
            name = model.__tablename__
            rows = (await src_session.execute(select(model))).scalars().all()
            print(f"[+] Migrating table '{name}': {len(rows)} records found in SQLite...")

            for r in rows:
                # Merge into destination (idempotent upsert by primary key)
                await dst_session.merge(r)

            await dst_session.commit()
            print(f"[✓] '{name}' migrated successfully.")

    print("\n[🎉] Migration complete! All data successfully transferred from SQLite to Supabase.")
    print("[+] You can now set DATABASE_URL in backend/.env to your Supabase connection string.")


if __name__ == "__main__":
    from app.config import settings

    url = sys.argv[1] if len(sys.argv) > 1 else settings.async_database_url
    if not url or "sqlite" in url:
        print("\n[!] Please provide your Supabase Postgres connection string.")
        print('    Example: python migrate_sqlite_to_supabase.py "postgresql://postgres.xxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres"\n')
        sys.exit(1)

    asyncio.run(migrate(url))
