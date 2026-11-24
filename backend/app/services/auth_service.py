"""Authentication and session management services (JWT, bcrypt, and user onboarding)."""

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models.user import User
from ..models.learner_profile import LearnerProfile

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, email: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email or "",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": True},
        )
    except (jwt.PyJWTError, ValueError):
        return None


async def get_user_by_id(session: AsyncSession, user_id: str) -> User | None:
    return await session.get(User, user_id)


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(select(User).where(User.email == email.lower().strip()))


async def create_local_user(
    session: AsyncSession,
    *,
    display_name: str,
    email: str,
    password: str,
) -> User:
    email_clean = email.lower().strip()
    existing = await get_user_by_email(session, email_clean)
    if existing:
        raise ValueError(f"User with email '{email_clean}' already exists.")

    user = User(
        display_name=display_name.strip() or "Learner",
        email=email_clean,
        password_hash=hash_password(password),
        auth_provider="local",
        onboarding_completed=False,
    )
    session.add(user)
    await session.flush()

    # Create associated default LearnerProfile
    profile = LearnerProfile(
        user_id=user.id,
        country="India",
        communication_context="Everyday American English",
        target_objective="Communicate comfortably in common everyday situations.",
        cefr_provisional="B1 — Intermediate",
    )
    session.add(profile)
    await session.flush()
    return user


async def authenticate_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
) -> User:
    email_clean = email.lower().strip()
    user = await get_user_by_email(session, email_clean)
    if not user or not user.password_hash:
        raise ValueError("Invalid email or password.")
    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password.")
    return user


async def update_user_onboarding(
    session: AsyncSession,
    user_id: str,
    *,
    country: str | None = None,
    communication_context: str | None = None,
) -> User:
    user = await session.get(User, user_id)
    if not user:
        raise ValueError("User not found.")

    if country:
        user.country = country.strip()
    if communication_context:
        user.communication_context = communication_context.strip()
    user.onboarding_completed = True

    # Mirror into learner profile
    profile = await session.scalar(
        select(LearnerProfile).where(LearnerProfile.user_id == user_id)
    )
    if profile:
        if country:
            profile.country = country.strip()
        if communication_context:
            profile.communication_context = communication_context.strip()
    await session.flush()
    return user
