"""Authentication router: register, login, logout, me, and onboarding profile update."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models.user import User
from ..services.auth_deps import get_current_user, require_authenticated_user
from ..services.auth_service import (
    authenticate_user,
    create_access_token,
    create_local_user,
    update_user_onboarding,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OnboardingRequest(BaseModel):
    country: str = Field(..., min_length=1, max_length=100)
    communication_context: str = Field(..., min_length=1, max_length=100)


class UserOut(BaseModel):
    id: str
    display_name: str
    email: str | None
    auth_provider: str
    country: str | None
    communication_context: str | None
    onboarding_completed: bool
    token: str | None = None


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="convox_session",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True when served over HTTPS in production
        max_age=60 * 60 * 24 * 7,  # 7 days
        path="/",
        domain=None,
    )


@router.post("/register", response_model=UserOut)
async def register(
    body: RegisterRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    try:
        user = await create_local_user(
            session,
            display_name=body.display_name,
            email=body.email,
            password=body.password,
        )
        await session.commit()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    token = create_access_token(user.id, user.email)
    _set_auth_cookie(response, token)
    return UserOut(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        auth_provider=user.auth_provider,
        country=user.country,
        communication_context=user.communication_context,
        onboarding_completed=user.onboarding_completed,
        token=token,
    )


@router.post("/login", response_model=UserOut)
async def login(
    body: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    try:
        user = await authenticate_user(
            session,
            email=body.email,
            password=body.password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    token = create_access_token(user.id, user.email)
    _set_auth_cookie(response, token)
    return UserOut(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        auth_provider=user.auth_provider,
        country=user.country,
        communication_context=user.communication_context,
        onboarding_completed=user.onboarding_completed,
        token=token,
    )


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie(key="convox_session", path="/")
    return {"status": "ok", "message": "Successfully signed out."}


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(require_authenticated_user)) -> UserOut:
    return UserOut(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        auth_provider=user.auth_provider,
        country=user.country,
        communication_context=user.communication_context,
        onboarding_completed=user.onboarding_completed,
    )


@router.post("/onboarding", response_model=UserOut)
async def save_onboarding(
    body: OnboardingRequest,
    user: User = Depends(require_authenticated_user),
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    updated = await update_user_onboarding(
        session,
        user.id,
        country=body.country,
        communication_context=body.communication_context,
    )
    await session.commit()
    return UserOut(
        id=updated.id,
        display_name=updated.display_name,
        email=updated.email,
        auth_provider=updated.auth_provider,
        country=updated.country,
        communication_context=updated.communication_context,
        onboarding_completed=updated.onboarding_completed,
    )
