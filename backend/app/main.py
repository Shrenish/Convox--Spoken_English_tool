"""CONVOX API — FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import SessionLocal, init_db
from .services.exceptions import ServiceError
from .services.scenario_engine import sync_scenarios
from .services.users import get_or_create_default_user

__version__ = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Bring the DB, scenario catalogue, default user up on start, and start background evaluation worker."""
    from .services.evaluation_worker import evaluation_worker

    await init_db()
    async with SessionLocal() as session:
        await sync_scenarios(session)
        await get_or_create_default_user(session)
        await session.commit()
    await evaluation_worker.start()
    yield
    await evaluation_worker.stop()


# Ensure the audio directory exists before the static mount below.
Path(settings.AUDIO_DIR).mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="CONVOX",
    description="Voice-first adaptive communication simulator for Indian college students "
    "(CORE evaluation, conversation autopsy, learner model, Travel / Global Survival).",
    version=__version__,
    lifespan=lifespan,
)

# Local single-user dev: allow configured local origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Recordings & synthesized voice: served back as /audio/<file>.
app.mount("/audio", StaticFiles(directory=settings.AUDIO_DIR), name="audio")


@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"detail": {"code": exc.code, "message": exc.message}},
    )


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "version": __version__,
        "configured": {
            "anthropic": settings.has_anthropic,
            "groq": settings.has_groq,
            "openai": settings.has_openai,
        },
        "notes": (
            "Missing keys only block the features that need them: conversation/evals "
            "need ANTHROPIC_API_KEY, STT needs GROQ_API_KEY, TTS needs OPENAI_API_KEY."
        ),
    }


# Routers
from .api import auth as auth_api  # noqa: E402
from .api import conversation as conversation_api  # noqa: E402
from .api import evaluation as evaluation_api  # noqa: E402
from .api import profile as profile_api  # noqa: E402
from .api import scenario as scenario_api  # noqa: E402
from .api import travel as travel_api  # noqa: E402

for router in (
    auth_api.router,
    conversation_api.router,
    scenario_api.router,
    evaluation_api.router,
    profile_api.router,
    travel_api.router,
):
    app.include_router(router)