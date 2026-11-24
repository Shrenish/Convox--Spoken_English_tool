"""Application configuration via pydantic-settings.

All secrets come from environment variables or a `.env` file in the backend root.
Fail fast if the critical API keys are missing.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- API keys (required) ---
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # --- Model selection ---
    CONVERSATION_MODEL: str = "claude-sonnet-5"
    EVALUATION_MODEL: str = "claude-sonnet-5"
    STT_MODEL: str = "whisper-large-v3"
    TTS_MODEL: str = "tts-1"
    TTS_VOICE: str = "alloy"

    # --- Database ---
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BACKEND_DIR / 'convox.db'}"

    # --- Audio storage ---
    AUDIO_DIR: Path = BACKEND_DIR / "audio"
    MAX_AUDIO_BYTES: int = 10 * 1024 * 1024  # 10 MB safety cap on uploaded audio

    # --- Security & Auth ---
    JWT_SECRET: str = "convox-dev-secret-key-change-in-production-12345678"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback/google"

    # --- Conversation behaviour ---
    MAX_TURNS: int = 14                # hard cap to avoid runaway sessions
    TURN_TIMEOUT_SECONDS: int = 90     # websocket/user idle guard
    ENABLE_EVENTS: bool = True         # master switch for controlled events

    @property
    def has_anthropic(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY)

    @property
    def has_groq(self) -> bool:
        return bool(self.GROQ_API_KEY)

    @property
    def has_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY)


settings = Settings()