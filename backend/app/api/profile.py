"""Learner profile API."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas import LearnerProfileOut, ProfileUpdate
from ..services.learner_model import get_or_create_profile, get_profile_out
from ..services.users import DEFAULT_USER_ID, get_or_create_default_user

router = APIRouter(prefix="/api", tags=["profile"])


@router.get("/profile", response_model=LearnerProfileOut)
async def read_profile(
    session: AsyncSession = Depends(get_session),
) -> LearnerProfileOut:
    await get_or_create_default_user(session)
    result = await get_profile_out(session, DEFAULT_USER_ID)
    await session.commit()
    return result


@router.patch("/profile", response_model=LearnerProfileOut)
async def update_profile(
    body: ProfileUpdate,
    session: AsyncSession = Depends(get_session),
) -> LearnerProfileOut:
    user = await get_or_create_default_user(session)
    profile = await get_or_create_profile(session, DEFAULT_USER_ID)

    if body.interests is not None:
        profile.set_interests(body.interests)
    if body.mentor_prefs is not None:
        profile.set_mentor_prefs(body.mentor_prefs)
    if body.preferences is not None:
        prefs = dict(user.preferences)
        prefs.update(body.preferences)
        user.set_preferences(prefs)

    await session.flush()
    result = await get_profile_out(session, DEFAULT_USER_ID)
    await session.commit()
    return result