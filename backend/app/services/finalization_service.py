"""Shared session finalization and snapshot freeze service (Plan §4.2, Phase 2)."""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Conversation, EvaluationJob
from .exceptions import ConversationNotFound


def compute_transcript_hash(turns: list[dict[str, Any]]) -> str:
    """Create a deterministic SHA-256 hash of the conversation turns."""
    serialized = json.dumps(turns, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


async def finalize_conversation(
    session: AsyncSession,
    conversation_id: str,
    *,
    enqueue_evaluation: bool = True,
) -> tuple[Conversation, EvaluationJob | None]:
    """Transitions a conversation from active -> completed, freezes its transcript snapshot,
    and atomically creates an evaluation job if requested.

    Idempotent: If the conversation is already completed, returns the conversation and
    existing evaluation job without modifying the snapshot.
    """
    conv = await session.get(Conversation, conversation_id)
    if not conv:
        raise ConversationNotFound(conversation_id)

    # Idempotent return if already finalized
    if conv.status == "completed":
        job = await session.scalar(
            select(EvaluationJob).where(EvaluationJob.conversation_id == conversation_id)
        )
        return conv, job

    # Load turns eagerly
    await session.refresh(conv, attribute_names=["turns"])

    # Prepare immutable snapshot
    ordered_turns = sorted(conv.turns, key=lambda t: t.sequence)
    snapshot = [
        {
            "id": t.id,
            "speaker": t.speaker,
            "sequence": t.sequence,
            "transcript": t.transcript,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "duration_ms": t.duration_ms,
        }
        for t in ordered_turns
    ]
    snapshot_json = json.dumps(snapshot)
    snapshot_hash = compute_transcript_hash(snapshot)

    conv.status = "completed"
    conv.ended_at = datetime.now(timezone.utc)
    conv.frozen_transcript_json = snapshot_json
    conv.frozen_transcript_hash = snapshot_hash
    session.add(conv)

    job = None
    if enqueue_evaluation:
        existing_job = await session.scalar(
            select(EvaluationJob).where(EvaluationJob.conversation_id == conversation_id)
        )
        if not existing_job:
            job = EvaluationJob(
                conversation_id=conversation_id,
                status="pending",
                attempt_count=0,
            )
            session.add(job)
        else:
            job = existing_job

    await session.flush()
    return conv, job
