"""Gamification & Executive Personas API."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models.travel import TravelJourney, TravelStage
from ..models.user import User
from ..services.auth_deps import get_current_user
from ..services.gamification_service import GamificationState, calculate_gamification_state
from ..services.learner_model import get_or_create_profile

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


@router.get("/status", response_model=GamificationState)
async def get_gamification_status(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> GamificationState:
    profile = await get_or_create_profile(session, user.id)

    # Count completed travel stages for this user
    travel_completed_count = 0
    journeys = (
        await session.execute(
            select(TravelJourney).where(TravelJourney.user_id == user.id)
        )
    ).scalars().all()
    if journeys:
        for j in journeys:
            stages = (
                await session.execute(
                    select(TravelStage).where(
                        TravelStage.journey_id == j.id,
                        TravelStage.status == "completed",
                    )
                )
            ).scalars().all()
            travel_completed_count += len(stages)

    recovery = profile.recovery_profile.get("repair_rate", 0.0) if hasattr(profile, "recovery_profile") else 0.5
    if not isinstance(recovery, (int, float)):
        recovery = 0.5

    state = calculate_gamification_state(
        sessions_completed=profile.sessions_completed or 0,
        readiness_score=profile.readiness_score or 5.0,
        recovery_index=float(recovery),
        travel_stages_completed=travel_completed_count,
    )
    return state
