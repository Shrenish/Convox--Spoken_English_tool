"""Authentication router: register, login, logout, me, and onboarding profile update."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
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


import time
from collections import defaultdict

_AUTH_RATE_BUCKETS: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(request: Request, prefix: str, limit: int = 10, window_sec: int = 60) -> None:
    ip = request.client.host if request.client else "unknown"
    key = f"{prefix}:{ip}"
    now = time.monotonic()
    bucket = [t for t in _AUTH_RATE_BUCKETS[key] if now - t < window_sec]
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again in a minute.",
        )
    bucket.append(now)
    _AUTH_RATE_BUCKETS[key] = bucket


def _set_auth_cookie(response: Response, token: str, request: Request | None = None) -> None:
    is_https = request.url.scheme == "https" if request else False
    response.set_cookie(
        key="convox_session",
        value=token,
        httponly=True,
        samesite="lax",
        secure=is_https,
        max_age=60 * 60 * 24 * 7,  # 7 days
        path="/",
        domain=None,
    )


@router.post("/register", response_model=UserOut)
async def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    _check_rate_limit(request, "register")
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
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    _check_rate_limit(request, "login")
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


# ─── Google OAuth ─────────────────────────────────────────────────────────────

@router.get("/google")
async def google_login(request: Request):
    """Redirect the user to Google's OAuth 2.0 consent screen with CSRF state."""
    import secrets
    import urllib.parse
    from fastapi.responses import RedirectResponse
    from ..config import settings

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")

    state = secrets.token_urlsafe(32)
    redirect_uri = "http://localhost:8000/api/auth/google/callback"
    params = urllib.parse.urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    })
    resp = RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")
    resp.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        secure=(request.url.scheme == "https"),
        max_age=300,
        path="/",
    )
    return resp


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    """Exchange Google auth code for user profile, verify CSRF state, set cookie, and redirect."""
    import secrets
    import httpx
    from fastapi.responses import RedirectResponse
    from sqlalchemy import select
    from ..config import settings
    from ..models.learner_profile import LearnerProfile

    expected_state = request.cookies.get("oauth_state")
    if not state or not expected_state or not secrets.compare_digest(state, expected_state):
        return RedirectResponse(f"{settings.FRONTEND_URL}/?auth_error=invalid_state")

    if error or not code:
        return RedirectResponse(f"{settings.FRONTEND_URL}/?auth_error={error or 'missing_code'}")

    redirect_uri = "http://localhost:8000/api/auth/google/callback"
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            return RedirectResponse(f"{settings.FRONTEND_URL}/?auth_error=token_exchange_failed")

        access_token = token_resp.json().get("access_token")
        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_resp.status_code != 200:
            return RedirectResponse(f"{settings.FRONTEND_URL}/?auth_error=userinfo_failed")

        info = user_resp.json()

    google_id = info.get("id")
    email = info.get("email")
    display_name = info.get("name") or (email.split("@")[0] if email else "CONVOX Learner")

    user = None
    if google_id:
        user = await session.scalar(select(User).where(User.google_id == google_id))
    if not user and email:
        user = await session.scalar(select(User).where(User.email == email))
        if user and google_id:
            user.google_id = google_id
            user.auth_provider = "google"

    if not user:
        user = User(
            display_name=display_name,
            email=email,
            auth_provider="google",
            google_id=google_id,
            onboarding_completed=False,
        )
        session.add(user)
        await session.flush()
        session.add(LearnerProfile(user_id=user.id))

    await session.commit()

    jwt_token = create_access_token(user.id)
    dest = "/dashboard" if user.onboarding_completed else "/onboarding"
    response = RedirectResponse(f"{settings.FRONTEND_URL}{dest}")
    response.delete_cookie("oauth_state", path="/")
    _set_auth_cookie(response, jwt_token, request)
    return response
