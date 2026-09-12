"""Audio utilities: safe metadata extraction and storage.

v1 accepts recordings as WAV/Ogg/WebM blobs from the browser MediaRecorder and
hands them straight to the STT provider (Groq accepts these formats). We also
save a copy to disk for the before/after Voice Mirror feature.
"""

import wave
from datetime import datetime, timezone
from pathlib import Path

from ..config import settings

ALLOWED_EXTENSIONS = {".wav", ".ogg", ".webm", ".mp3", ".m4a"}
# Keep filenames safe and prefix with date so mirror recordings are easy to browse.
_TIMESTAMP_FMT = "%Y%m%d_%H%M%S"


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime(_TIMESTAMP_FMT)


def is_allowed_audio(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def duration_ms_from_wav(path: str | Path) -> int:
    """Best-effort duration in ms. Returns 0 if we can't parse (e.g. ogg/webm)."""
    try:
        with wave.open(str(path), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            if rate == 0:
                return 0
            return int(frames / rate * 1000)
    except wave.Error:
        # wave module only reads RIFF WAV; ogg/webm fall back to 0.
        return 0


def save_recording(raw: bytes, extension: str, prefix: str) -> str:
    """Persist a raw recording and return a relative path (for DB + static serving)."""
    ext = extension if extension.startswith(".") else f".{extension}"
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".webm"  # generic fallback

    directory = settings.AUDIO_DIR
    Path(directory).mkdir(parents=True, exist_ok=True)
    filename = f"{prefix}_{timestamp()}{ext}"
    full_path = Path(directory) / filename
    full_path.write_bytes(raw)

    # Return a server-relative path for static serving.
    return f"/audio/{filename}"


def read_recording(relative_path: str) -> bytes:
    """Read back a previously saved recording by its relative path."""
    full_path = Path(settings.AUDIO_DIR) / Path(relative_path).name
    if not full_path.exists():
        raise FileNotFoundError(f"Recording not found: {relative_path}")
    return full_path.read_bytes()