"""Travel / Global Survival API."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas import TravelJourneyOut, TravelStageCompleteResponse, TravelStageStartResponse
from ..schemas.travel import TravelStartRequest
from ..services.travel_service import (
    complete_stage,
    journey_out,
    start_journey,
    start_stage,
)
from ..services.users import DEFAULT_USER_ID, get_or_create_default_user

router = APIRouter(prefix="/api/travel", tags=["travel"])


@router.post("/start", response_model=TravelJourneyOut)
async def start_travel_journey(
    body: TravelStartRequest,
    session: AsyncSession = Depends(get_session),
) -> TravelJourneyOut:
    user = await get_or_create_default_user(session)
    journey = await start_journey(session, user.id, destination=body.destination)
    await session.commit()
    return await journey_out(session, journey.id)


@router.get("/{journey_id}", response_model=TravelJourneyOut)
async def get_travel_journey(
    journey_id: str,
    session: AsyncSession = Depends(get_session),
) -> TravelJourneyOut:
    return await journey_out(session, journey_id)


@router.post("/{journey_id}/stage/{stage_key}/start", response_model=TravelStageStartResponse)
async def start_travel_stage(
    journey_id: str,
    stage_key: str,
    session: AsyncSession = Depends(get_session),
) -> TravelStageStartResponse:
    result = await start_stage(session, journey_id, stage_key)
    await session.commit()
    return result


@router.post(
    "/{journey_id}/stage/{stage_key}/complete", response_model=TravelStageCompleteResponse
)
async def complete_travel_stage(
    journey_id: str,
    stage_key: str,
    session: AsyncSession = Depends(get_session),
) -> TravelStageCompleteResponse:
    result = await complete_stage(session, journey_id, stage_key)
    await session.commit()
    return result