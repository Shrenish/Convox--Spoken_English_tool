"""Speech-to-text via Groq's hosted Whisper.

`transcribe_audio` accepts the raw audio bytes. Groq's /openai/v1/audio/transcriptions
and /openai/v1/audio/translations endpoints accept webm/ogg/wav. We prefer
transcription (keeps the user's native language, matches PRD: Indian English stays
Indian English, not transliterated to 'standard' English).

`transcribe_to_english` is used by Global Ear Training only — when the AI speaks a
non-English variety, we still transcribe final responses to English for evaluation.
"""

from ..config import settings
from .exceptions import STTError, STTNotConfigured

# Groq's OpenAI-compatible audio endpoint.
_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
_TRANSLATE_URL = "https://api.groq.com/openai/v1/audio/translations"


class STTService:
    def __init__(self) -> None:
        self._client = None

    @property
    def client(self):
        if self._client is None:
            if not settings.has_groq:
                raise STTNotConfigured(
                    "GROQ_API_KEY is not set. Set it in backend/.env"
                )
            import httpx

            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = "recording.webm",
        language: str | None = None,  # e.g. "en" — leave None for auto-detect
    ) -> str:
        from ..utils.audio import is_allowed_audio

        if not is_allowed_audio(filename):
            filename = "recording.webm"

        files = {"file": (filename, audio_bytes)}
        data: dict[str, str] = {"model": settings.STT_MODEL}
        if language:
            data["language"] = language
        if settings.has_groq:
            headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
            url = _TRANSCRIBE_URL
        else:
            raise STTNotConfigured("GROQ_API_KEY is not set. Set it in backend/.env")

        try:
            resp = await self.client.post(url, files=files, data=data, headers=headers)
            resp.raise_for_status()
            payload = resp.json()
        except Exception as exc:
            raise STTError(f"Groq transcription failed: {exc}") from exc

        text = (payload.get("text") or "").strip()
        if not text:
            raise STTError("Groq returned an empty transcript")
        return text

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()


stt_service = STTService()