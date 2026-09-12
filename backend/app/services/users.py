"""Default user bootstrap — CONVOX v1 is a single-user local app.

We seed one stable user row so every endpoint has an identity to hang the
learner profile, conversations and travel journeys off, while the schema stays
multi-user ready.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import User

DEFAULT_USER_ID = "local-user"


async def get_or_create_default_user(session: AsyncSession) -> User:
    """Return the local user, creating it on first use. Called from lifespan and
    every API route that needs an identity."""
    user = await session.scalar(select(User).where(User.id == DEFAULT_USER_ID))
    if user is None:
        user = User(id=DEFAULT_USER_ID, display_name="Learner")
        session.add(user)
        await session.flush()
    return user