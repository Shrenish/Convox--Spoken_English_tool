"""Anthropic wrapper with a split between the fast conversation model and the
thorough evaluation model (PRD §50 two-channel architecture).

All calls are synchronous HTTP calls through the official SDK (the FastAPI app
runs these in a threadpool via `run_in_executor`), keeping latency predictable.
"""

import json
from typing import Any

from ..config import settings
from .exceptions import LLMNotConfigured, LLMResponseError


class LLMService:
    """Thin wrapper over the Anthropic Messages API."""

    def __init__(self) -> None:
        self._client = None
        # Cache of common TTS phrases not relevant here; kept minimal.

    @property
    def client(self):
        if self._client is None:
            if not settings.has_anthropic:
                raise LLMNotConfigured(
                    "ANTHROPIC_API_KEY is not set. Set it in backend/.env"
                )
            import anthropic

            self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._client

    def complete(
        self,
        *,
        system: str,
        messages: list[dict[str, str]],
        model: str | None = None,
        max_tokens: int = 500,
        temperature: float = 0.7,
    ) -> str:
        """Single completion, returns the text content.

        messages: [{"role": "user"|"assistant", "content": "..."}]
        """
        if not messages:
            raise LLMResponseError("complete() called with empty messages")

        # Conversation turn history must alternate; Anthropic requires user/assistant
        # to start with user. We coerce the first message to user if needed.
        msgs = _normalize_messages(messages)

        try:
            resp = self.client.messages.create(
                model=model or settings.CONVERSATION_MODEL,
                system=system,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=msgs,
            )
        except Exception as exc:  # anthropic.APIError etc.
            raise LLMResponseError(f"Anthropic API error: {exc}") from exc

        return _extract_text(resp)

    def complete_json(
        self,
        *,
        system: str,
        messages: list[dict[str, str]],
        model: str | None = None,
        max_tokens: int = 800,
        temperature: float = 0.2,
    ) -> dict[str, Any] | None:
        """Ask for structured JSON and parse it. Returns None on parse failure."""
        raw = self.complete(
            system=system,
            messages=messages,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        try:
            return json.loads(_strip_code_fences(raw))
        except (json.JSONDecodeError, TypeError):
            return None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_messages(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    """Ensure roles alternate and messages start with 'user' (Anthropic rule)."""
    msgs = [dict(m) for m in messages if m.get("content")]
    if not msgs:
        return msgs
    if msgs[0].get("role") == "assistant":
        msgs.insert(0, {"role": "user", "content": "Please proceed."})
    out: list[dict[str, str]] = []
    for m in msgs:
        if out and out[-1]["role"] == m["role"]:
            out[-1]["content"] += f"\n\n{m['content']}"
        else:
            out.append(m)
    return out


def _extract_text(resp: Any) -> str:
    parts = []
    for block in resp.content or []:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "\n".join(parts).strip()


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


llm_service = LLMService()