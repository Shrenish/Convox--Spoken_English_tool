"""Evaluation + progress API."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas import EvaluationOut, ProgressSummary
from ..services.evaluation_engine import evaluate_conversation
from ..services.learner_model import get_progress_summary
from ..services.users import DEFAULT_USER_ID, get_or_create_default_user

router = APIRouter(prefix="/api", tags=["evaluation"])


@router.get("/evaluation/{conversation_id}", response_model=EvaluationOut)
async def get_evaluation(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> EvaluationOut:
    """CORE scores for one conversation. Runs evaluation on demand if missing."""
    evaluation = await evaluate_conversation(session, conversation_id)
    await session.commit()
    return EvaluationOut(
        conversation_id=conversation_id,
        language_scores=_load(evaluation.language_scores_json),
        interaction_scores=_load(evaluation.interaction_scores_json),
        readiness_score=evaluation.readiness_score,
        recovery_index=evaluation.recovery_index,
        vocab_recovery_index=evaluation.vocab_recovery_index,
        intl_gap=evaluation.intl_gap,
        confidence=evaluation.confidence,
    )


@router.get("/progress/summary", response_model=ProgressSummary)
async def progress_summary(
    session: AsyncSession = Depends(get_session),
) -> ProgressSummary:
    await get_or_create_default_user(session)
    summary = await get_progress_summary(session, DEFAULT_USER_ID)
    await session.commit()
    return summary


def _load(raw: str) -> dict:
    import json

    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}