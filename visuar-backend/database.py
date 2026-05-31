# database.py
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from pathlib import Path
from models import Base

# Safe incremental migrations (PostgreSQL) — applied on every startup
_SCHEMA_MIGRATIONS = [
    "ALTER TABLE test_results ADD COLUMN IF NOT EXISTS ai_findings TEXT",
    "ALTER TABLE test_results ADD COLUMN IF NOT EXISTS ai_recommendations TEXT",
    "ALTER TABLE test_results ADD COLUMN IF NOT EXISTS ai_summary TEXT",
    "ALTER TABLE test_results ADD COLUMN IF NOT EXISTS result_json TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR DEFAULT 'free'",
    "UPDATE users SET plan = 'free' WHERE plan IS NULL",
]

# Load .env from the same directory as this file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is required in .env file")

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with async_session() as session:
        yield session

async def run_schema_migrations():
    """Add columns/tables that exist in models but may be missing from older DBs."""
    async with engine.begin() as conn:
        for stmt in _SCHEMA_MIGRATIONS:
            await conn.execute(text(stmt))


async def init_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await run_schema_migrations()
        print("[DB] Schema ready (tables + migrations applied).")
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")