"""Text-to-speech via OpenAI's Audio API (tts-1).

Produces MP3 bytes at 24kHz for the chosen `settings.TTS_VOICE`. The audio is
served back to the browser via a static-mount + `ai_audio_url`.

A tiny in-memory phrase cache avoids re-synthesizing repeated AI lines
(e.g. the greeting that every session starts with).
"""

import hashlib
import io

from ..config import settings
from .exceptions import TTSNotConfigured

_CACHE_LIMIT = 128


class TTSService:
    def __init__(self) -> None:
        self._client = None
        self._cache: dict[str, bytes] = {}

    @property
    def _openai_client(self):
        """Lazily-built OpenAI client used only for TTS."""
        if self._client is None:
            if not settings.has_openai:
                raise TTSNotConfigured(
                    "OPENAI_API_KEY is not set. Set it in backend/.env"
                )
            from openai import OpenAI

            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        model: str | None = None,
        use_cache: bool = True,
    ) -> bytes:
        """Synthesize text to MP3 bytes."""
        if not text.strip():
            return b""
        voice = voice or settings.TTS_VOICE
        model = model or settings.TTS_MODEL

        cache_key = hashlib.sha1(f"{voice}|{model}|{text}".encode()).hexdigest()
        if use_cache and cache_key in self._cache:
            return self._cache[cache_key]

        try:
            resp = self._openai_client.audio.speech.create(
                model=model, voice=voice, input=text
            )
            data = resp.read()
        except Exception as exc:
            raise TTSNotConfigured(f"OpenAI TTS failed: {exc}")

        if use_cache and len(self._cache) < _CACHE_LIMIT:
            self._cache[cache_key] = data
        return data

    def synthesize_to_wav(self, text: str, **kwargs) -> tuple[bytes, str]:
        """Returns (audio_bytes, mime). keeeps simple: mp3 everywhere."""
        return self.synthesize(text, **kwargs), "audio/mpeg"


tts_service = TTSService()