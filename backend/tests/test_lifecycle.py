"""Phase 2 tests: Session lifecycle, idempotency, unique constraints, and finalization."""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import Conversation, EvaluationJob, Turn
from app.services.conversation_engine import conversation_engine
from app.services.evaluation_engine import evaluate_conversation
from app.services.exceptions import ConversationInactive
from app.services.finalization_service import finalize_conversation
from app.services.users import DEFAULT_USER_ID


async def test_start_conversation_idempotent_request_id(seeded_session):
    request_id = "req_start_123"
    conv1, open1, _ = await conversation_engine.start_conversation(
        seeded_session,
        user_id=DEFAULT_USER_ID,
        scenario_key="introduce_classmate",
        request_id=request_id,
    )
    await seeded_session.commit()

    conv2, open2, _ = await conversation_engine.start_conversation(
        seeded_session,
        user_id=DEFAULT_USER_ID,
        scenario_key="introduce_classmate",
        request_id=request_id,
    )
    assert conv1.id == conv2.id
    assert open1 == open2


async def test_duplicate_turns_sequence_constraint(seeded_session):
    conv, _, _ = await conversation_engine.start_conversation(
        seeded_session,
        user_id=DEFAULT_USER_ID,
        scenario_key="introduce_classmate",
    )
    await seeded_session.commit()

    # Try inserting duplicate sequence 0 for the same conversation
    t_dup = Turn(
        conversation_id=conv.id,
        speaker="user",
        sequence=0,
        transcript="Duplicate sequence turn",
    )
    seeded_session.add(t_dup)
    with pytest.raises(IntegrityError):
        await seeded_session.commit()
    await seeded_session.rollback()


async def test_cannot_add_turns_to_completed_conversation(seeded_session):
    conv, _, _ = await conversation_engine.start_conversation(
        seeded_session,
        user_id=DEFAULT_USER_ID,
        scenario_key="introduce_classmate",
    )
    await seeded_session.commit()

    # Finalize
    await conversation_engine.end_conversation(seeded_session, conv.id)
    await seeded_session.commit()

    # Attempt turn
    with pytest.raises(ConversationInactive):
        await conversation_engine.process_user_turn(
            seeded_session,
            conv.id,
            transcript_override="Hello?",
        )


async def test_cannot_evaluate_active_conversation(seeded_session):
    conv, _, _ = await conversation_engine.start_conversation(
        seeded_session,
        user_id=DEFAULT_USER_ID,
        scenario_key="introduce_classmate",
    )
    await seeded_session.commit()

    with pytest.raises(ValueError, match="cannot be evaluated until completed"):
        await evaluate_conversation(seeded_session, conv.id)


async def test_finalization_is_idempotent_and_freezes_transcript(seeded_session):
    conv, _, _ = await conversation_engine.start_conversation(
        seeded_session,
        user_id=DEFAULT_USER_ID,
        scenario_key="introduce_classmate",
    )
    await seeded_session.commit()

    c1, j1 = await finalize_conversation(seeded_session, conv.id)
    await seeded_session.commit()
    assert c1.status == "completed"
    assert c1.frozen_transcript_hash is not None
    assert c1.frozen_transcript_json is not None
    assert j1 is not None
    assert j1.status == "pending"

    # Call finalize again
    c2, j2 = await finalize_conversation(seeded_session, conv.id)
    assert c1.id == c2.id
    assert j1.id == j2.id
    assert c1.frozen_transcript_hash == c2.frozen_transcript_hash
