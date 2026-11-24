"""Learner profile API."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models.user import User
from ..schemas import LearnerProfileOut, ProfileUpdate
from ..services.auth_deps import get_current_user
from ..services.learner_model import get_or_create_profile, get_profile_out

router = APIRouter(prefix="/api", tags=["profile"])


@router.get("/profile", response_model=LearnerProfileOut)
async def read_profile(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> LearnerProfileOut:
    result = await get_profile_out(session, user.id)
    await session.commit()
    return result


@router.patch("/profile", response_model=LearnerProfileOut)
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> LearnerProfileOut:
    profile = await get_or_create_profile(session, user.id)

    if body.interests is not None:
        profile.set_interests(body.interests)
    if body.mentor_prefs is not None:
        profile.set_mentor_prefs(body.mentor_prefs)
    if body.preferences is not None:
        prefs = dict(user.preferences)
        prefs.update(body.preferences)
        user.set_preferences(prefs)

    await session.flush()
    result = await get_profile_out(session, user.id)
    await session.commit()
    return result