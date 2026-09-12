"""Travel / Global Survival — journey orchestration (PRD §46).

A journey is an ordered chain of stages (airport → immigration → ... → emergency),
each backed by one travel scenario. The flow per stage:

        start_stage  →  conversation runs  →  complete_stage
   (creates the topic    (user speaks with     (evaluates the talk, scores the
    conversation, stage   the AI partner)        stage, unlocks the next one)
    marked active)

`complete_stage` is the only place that writes stage state — the conversation
engine and learner model stay untouched by travel specifics.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Scenario as DbScenario
from ..models.travel import TravelJourney, TravelStage
from ..schemas.travel import (
    TravelJourneyOut,
    TravelStageCompleteResponse,
    TravelStageOut,
    TravelStageStartResponse,
)
from .conversation_engine import conversation_engine
from .evaluation_engine import evaluate_conversation
from .exceptions import JourneyNotFound, StageNotActive, StageNotFound
from .learner_model import apply_evaluation
from .scenarios_data import TRAVEL_STAGE_TITLES, TRAVEL_STAGES


async def start_journey(
    session: AsyncSession, user_id: str, destination: str = "UK"
) -> TravelJourney:
    journey = TravelJourney(user_id=user_id, destination=destination, current_stage=0)
    session.add(journey)
    await session.flush()

    for index, stage_def in enumerate(TRAVEL_STAGES):
        scenario = await session.scalar(
            select(DbScenario).where(DbScenario.scenario_key == stage_def.key)
        )
        session.add(
            TravelStage(
                journey_id=journey.id,
                stage_key=stage_def.stage_key,
                stage_index=index,
                status="active" if index == 0 else "locked",
                scenario_id=scenario.id if scenario else None,
            )
        )
    await session.flush()
    # Populate stages on the returned instance so callers can iterate it safely
    # in an async session (get() would skip eager options on an identity-map hit).
    await session.refresh(journey, attribute_names=["stages"])
    return journey


async def get_journey(session: AsyncSession, journey_id: str) -> TravelJourney:
    journey = await session.get(TravelJourney, journey_id)
    if not journey:
        raise JourneyNotFound(journey_id)
    # Same identity-map caveat as evaluation_engine: a journey created earlier
    # in this session comes back from get() without stages loaded, then
    # iterating journey.stages would lazy-load synchronously → MissingGreenlet.
    await session.refresh(journey, attribute_names=["stages"])
    return journey


async def journey_out(session: AsyncSession, journey_id: str) -> TravelJourneyOut:
    journey = await get_journey(session, journey_id)
    return TravelJourneyOut(
        journey_id=journey.id,
        destination=journey.destination,
        status=journey.status,
        current_stage=journey.current_stage,
        stages=[_stage_out(s) for s in journey.stages],
    )


async def start_stage(
    session: AsyncSession, journey_id: str, stage_key: str
) -> TravelStageStartResponse:
    """Open the conversation for an active stage. Returns the first AI turn."""
    journey, stage = await _require_stage(session, journey_id, stage_key)
    if stage.status != "active":
        raise StageNotActive(stage_key)

    scenario = await session.get(DbScenario, stage.scenario_id)
    if scenario is None:
        raise StageNotFound(stage_key)

    conversation, opening, audio_url = await conversation_engine.start_conversation(
        session,
        user_id=journey.user_id,
        scenario_key=scenario.scenario_key,
        mode="travel",
    )
    stage.conversation_id = conversation.id
    await session.flush()

    return TravelStageStartResponse(
        conversation_id=conversation.id,
        stage_key=stage.stage_key,
        scenario_key=scenario.scenario_key,
        title=TRAVEL_STAGE_TITLES.get(stage.stage_key, stage.stage_key),
        ai_transcript=opening,
        ai_audio_url=audio_url,
    )


async def complete_stage(
    session: AsyncSession, journey_id: str, stage_key: str
) -> TravelStageCompleteResponse:
    """Evaluate the stage's conversation, score the stage, unlock the next."""
    journey, stage = await _require_stage(session, journey_id, stage_key)
    if stage.status != "active":
        if stage.status == "completed":
            raise StageNotActive(stage_key)  # already done — idempotent guard
        raise StageNotActive(stage_key)

    if stage.conversation_id is None:
        raise StageNotFound(stage_key)

    # End the conversation if the user left it open, then evaluate + learn.
    await conversation_engine.end_conversation(session, stage.conversation_id)
    evaluation = await evaluate_conversation(session, stage.conversation_id)
    await apply_evaluation(session, stage.conversation_id)

    stage.status = "completed"
    stage.score = evaluation.readiness_score
    stage.completed_at = datetime.now(timezone.utc)

    is_last = stage.stage_index >= len(journey.stages) - 1

    next_stage = None
    if not is_last:
        journey.current_stage = stage.stage_index + 1
        follow_on = journey.stages[stage.stage_index + 1]
        follow_on.status = "active"
        next_stage = _stage_out(follow_on)
    else:
        journey.current_stage = stage.stage_index
        journey.status = "completed"
        journey.completed_at = datetime.now(timezone.utc)

    await session.flush()

    recommended = []
    try:
        import json as _json

        transfer_data = _json.loads(evaluation.transfer_json)
        recommended = [str(f) for f in transfer_data.get("recommended_focus", [])]
    except (TypeError, ValueError):
        recommended = []

    return TravelStageCompleteResponse(
        journey_id=journey.id,
        stage_key=stage.stage_key,
        next_stage=next_stage,
        journey_completed=is_last,
        recommended_focus=recommended,
    )


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

async def _require_stage(
    session: AsyncSession, journey_id: str, stage_key: str
) -> tuple[TravelJourney, TravelStage]:
    journey = await get_journey(session, journey_id)
    for stage in journey.stages:
        if stage.stage_key == stage_key:
            return journey, stage
    raise StageNotFound(stage_key)


def _stage_out(stage: TravelStage) -> TravelStageOut:
    return TravelStageOut(
        stage_key=stage.stage_key,
        stage_index=stage.stage_index,
        title=TRAVEL_STAGE_TITLES.get(stage.stage_key, stage.stage_key),
        status=stage.status,
        scenario_key=f"travel_{stage.stage_key}",
        score=stage.score,
    )