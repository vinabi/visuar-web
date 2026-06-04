"""
Database CRUD operations for AI conversations and messages.
Uses SQLAlchemy async session (same pattern as existing crud.py).
"""
from __future__ import annotations

import json
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from models import AiConversation, AiMessage

MAX_MESSAGES_PER_CONVERSATION = 5   # user messages (total turns)


# ── Conversations ─────────────────────────────────────────────────────────────

async def create_conversation(db: AsyncSession, user_id: int, title: str = "New Chat") -> AiConversation:
    conv = AiConversation(user_id=user_id, title=title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def get_conversations(db: AsyncSession, user_id: int, limit: int = 50) -> list[AiConversation]:
    result = await db.execute(
        select(AiConversation)
        .filter_by(user_id=user_id)
        .order_by(desc(AiConversation.updated_at))
        .limit(limit)
    )
    return result.scalars().all()


async def get_conversation(db: AsyncSession, conv_id: int, user_id: int) -> AiConversation:
    result = await db.execute(
        select(AiConversation).filter_by(id=conv_id, user_id=user_id)
    )
    conv = result.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


async def rename_conversation(db: AsyncSession, conv_id: int, user_id: int, title: str) -> AiConversation:
    conv = await get_conversation(db, conv_id, user_id)
    conv.title = title[:255]
    await db.commit()
    await db.refresh(conv)
    return conv


async def delete_conversation(db: AsyncSession, conv_id: int, user_id: int) -> None:
    conv = await get_conversation(db, conv_id, user_id)
    await db.delete(conv)
    await db.commit()


# ── Messages ──────────────────────────────────────────────────────────────────

async def get_messages(db: AsyncSession, conv_id: int, user_id: int) -> list[AiMessage]:
    # Verify ownership first
    await get_conversation(db, conv_id, user_id)
    result = await db.execute(
        select(AiMessage)
        .filter_by(conversation_id=conv_id)
        .order_by(AiMessage.created_at.asc())
    )
    return result.scalars().all()


async def add_message(
    db: AsyncSession,
    conv_id: int,
    user_id: int,
    role: str,
    content: str,
    metadata: dict | None = None,
) -> AiMessage:
    msg = AiMessage(
        conversation_id=conv_id,
        user_id=user_id,
        role=role,
        content=content,
        extra_data=json.dumps(metadata) if metadata else None,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def increment_message_count(db: AsyncSession, conv_id: int) -> int:
    """Increment user message counter and return new count."""
    result = await db.execute(select(AiConversation).filter_by(id=conv_id))
    conv = result.scalars().first()
    if conv:
        conv.message_count = (conv.message_count or 0) + 1
        await db.commit()
        return conv.message_count
    return 0


async def get_message_count(db: AsyncSession, conv_id: int) -> int:
    result = await db.execute(select(AiConversation).filter_by(id=conv_id))
    conv = result.scalars().first()
    return conv.message_count if conv else 0


async def auto_title_conversation(db: AsyncSession, conv_id: int, first_user_message: str) -> None:
    """Set conversation title from first user message (first 60 chars)."""
    result = await db.execute(select(AiConversation).filter_by(id=conv_id))
    conv = result.scalars().first()
    if conv and conv.title in ("New Chat", ""):
        title = first_user_message.strip()[:60]
        if len(first_user_message) > 60:
            title += "…"
        conv.title = title
        await db.commit()
