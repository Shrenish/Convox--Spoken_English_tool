"""LLM service with Groq as the primary provider (free-tier, OpenAI-compatible)
and Anthropic as an optional fallback.

Groq endpoint: https://api.groq.com/openai/v1/chat/completions
Default model : qwen/qwen3.8-27b  (verified working on this account)

All calls are synchronous HTTP (httpx) so FastAPI can run them in a thread-pool
via run_in_executor, keeping the async event loop free.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx

from ..config import settings
from .exceptions import LLMNotConfigured, LLMResponseError

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Groq model constants
# ---------------------------------------------------------------------------
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b"
GROQ_FALLBACK_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "allam-2-7b"]


class LLMService:
    """Thin wrapper that calls Groq (primary) or Anthropic (fallback)."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def complete(
        self,
        *,
        system: str,
        messages: list[dict[str, str]],
        model: str | None = None,
        max_tokens: int = 500,
        temperature: float = 0.7,
    ) -> str:
        """Single completion – returns plain text.

        messages: [{"role": "user"|"assistant", "content": "…"}]
        """
        if not messages:
            raise LLMResponseError("complete() called with empty messages")

        if settings.OLLAMA_BASE_URL:
            try:
                return self._ollama_complete(
                    system=system,
                    messages=messages,
                    model=model or settings.OLLAMA_MODEL,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            except LLMResponseError as exc:
                if not settings.has_groq and not settings.has_anthropic:
                    raise
                log.warning("Ollama unavailable (%s), falling back to Groq", exc)

        if settings.has_groq:
            return self._groq_complete(
                system=system,
                messages=messages,
                model=model or GROQ_DEFAULT_MODEL,
                max_tokens=max_tokens,
                temperature=temperature,
            )

        # Anthropic fallback -----------------------------------------------
        if settings.has_anthropic:
            return self._anthropic_complete(
                system=system,
                messages=messages,
                model=model or settings.CONVERSATION_MODEL,
                max_tokens=max_tokens,
            )

        raise LLMNotConfigured(
            "No LLM provider is configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY in backend/.env"
        )

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
            log.warning("LLM returned non-JSON: %r", raw[:200])
            return None

    # ------------------------------------------------------------------
    # Ollama (local free primary)
    # ------------------------------------------------------------------

    def _ollama_complete(
        self,
        *,
        system: str,
        messages: list[dict[str, str]],
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        msgs = _build_openai_messages(system, messages)
        payload: dict[str, Any] = {
            "model": model,
            "messages": msgs,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat"
        try:
            resp = httpx.post(url, json=payload, timeout=120.0)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:500]
            raise LLMResponseError(f"Ollama HTTP {exc.response.status_code}: {body}") from exc
        except httpx.RequestError as exc:
            raise LLMResponseError(f"Ollama connection error: {exc}") from exc

        data = resp.json()
        try:
            return data["message"]["content"].strip()
        except (KeyError, TypeError) as exc:
            raise LLMResponseError(f"Unexpected Ollama response shape: {data!r}") from exc

    # ------------------------------------------------------------------
    # Groq (fallback)
    # ------------------------------------------------------------------

    def _groq_complete(
        self,
        *,
        system: str,
        messages: list[dict[str, str]],
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        msgs = _build_openai_messages(system, messages)
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        models_to_try = [model] + [m for m in GROQ_FALLBACK_MODELS if m != model]
        last_exc: Exception | None = None
        for candidate in models_to_try:
            payload: dict[str, Any] = {
                "model": candidate,
                "messages": msgs,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            try:
                resp = httpx.post(
                    GROQ_CHAT_URL,
                    json=payload,
                    headers=headers,
                    timeout=60.0,
                )
                if resp.status_code in (429, 404):
                    log.warning("Groq %s on %s, trying fallback", resp.status_code, candidate)
                    last_exc = LLMResponseError(f"Groq HTTP {resp.status_code}: {resp.text[:300]}")
                    if resp.status_code == 429:
                        time.sleep(2.0)
                    continue
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            except httpx.HTTPStatusError as exc:
                body = exc.response.text[:500]
                raise LLMResponseError(f"Groq HTTP {exc.response.status_code}: {body}") from exc
            except httpx.RequestError as exc:
                raise LLMResponseError(f"Groq connection error: {exc}") from exc
            except (KeyError, IndexError, TypeError) as exc:
                raise LLMResponseError(f"Unexpected Groq response shape: {exc}") from exc

        raise last_exc or LLMResponseError("All Groq models hit rate limits")

    # ------------------------------------------------------------------
    # Anthropic (fallback)
    # ------------------------------------------------------------------

    def _anthropic_complete(
        self,
        *,
        system: str,
        messages: list[dict[str, str]],
        model: str,
        max_tokens: int,
    ) -> str:
        msgs = _normalize_messages(messages)
        try:
            import anthropic  # lazy import – not required if using Groq

            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            # NOTE: temperature is intentionally omitted – newer SDK versions
            # removed it from messages.create().
            resp = client.messages.create(
                model=model,
                system=system,
                max_tokens=max_tokens,
                messages=msgs,
            )
        except Exception as exc:
            raise LLMResponseError(f"Anthropic API error: {exc}") from exc

        return _extract_anthropic_text(resp)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_openai_messages(
    system: str, messages: list[dict[str, str]]
) -> list[dict[str, str]]:
    """Convert to OpenAI-style [{role, content}] with system prepended."""
    out: list[dict[str, str]] = [{"role": "system", "content": system}]
    for m in messages:
        if m.get("content"):
            out.append({"role": m["role"], "content": m["content"]})
    return out


def _normalize_messages(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    """Ensure roles alternate and start with 'user' (Anthropic rule)."""
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


def _extract_anthropic_text(resp: Any) -> str:
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


# Singleton used throughout the app
llm_service = LLMService()
