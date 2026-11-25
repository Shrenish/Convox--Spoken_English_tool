"""Conversation engine — the turn-based state machine (PRD §14-§15, §50).

Handles:
* conversation lifecycle (create → turns → complete)
* persona + scenario-driven prompt assembly
* controlled event injection (one per eligible turn, from the scenario pool)
* LLM round-trip + transcript persistence
* TTS synthesis for the AI side
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import Scenario, Turn
from ..models.conversation import Conversation, ScenarioEvent
from ..utils.audio import save_recording
from ..utils.prompts import EVENT_PROMPTS, build_conversation_system_prompt, parse_json_or_fallback
from .exceptions import ConversationInactive, ConversationNotFound, LLMResponseError
from .llm_service import llm_service
from .scenarios_data import BY_KEY
from .stt_service import stt_service
from .tts_service import tts_service
from .scenario_engine import get_scenario_def


class ConversationEngine:
    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start_conversation(
        self,
        session: AsyncSession,
        *,
        user_id: str,
        scenario_key: str,
        mode: str = "conversation",
        request_id: str | None = None,
    ) -> tuple[Conversation, str, str | None]:
        """Create the conversation, persist the opening AI turn, synthesize it.
        Returns (conv, opening_text, opening_audio_url). Idempotent on request_id."""
        from ..models import User

        if request_id:
            existing = await session.scalar(
                select(Conversation).where(Conversation.request_id == request_id)
            )
            if existing:
                await session.refresh(existing, attribute_names=["turns"])
                opening_turn = next((t for t in existing.turns if t.sequence == 0 and t.speaker == "ai"), None)
                opening_text = opening_turn.transcript if opening_turn else ""
                audio_url = await self._persist_tts(existing.id, opening_text, use_cache=True)
                return existing, opening_text, audio_url

        defn = await get_scenario_def(session, scenario_key)

        user = await session.get(User, user_id)
        if not user:
            raise ConversationNotFound(user_id)

        from ..models import Scenario as DbScenario

        db_scenario = await session.scalar(
            select(DbScenario).where(DbScenario.scenario_key == scenario_key)
        )
        assert db_scenario is not None  # get_scenario_def synced the row

        conv = Conversation(
            request_id=request_id,
            user_id=user_id,
            scenario_id=db_scenario.id,
            mode=mode,
            status="active",
        )
        session.add(conv)
        await session.flush()

        opening = defn.opening_line
        session.add(
            Turn(
                conversation_id=conv.id,
                speaker="ai",
                sequence=0,
                transcript=opening,
            )
        )
        await session.flush()
        audio_url = await self._persist_tts(conv.id, opening, use_cache=True)
        return conv, opening, audio_url

    async def end_conversation(
        self, session: AsyncSession, conversation_id: str
    ) -> Conversation:
        from .finalization_service import finalize_conversation

        conv, _ = await finalize_conversation(session, conversation_id, enqueue_evaluation=True)
        return conv

    # ------------------------------------------------------------------
    # One turn
    # ------------------------------------------------------------------

    async def process_user_turn(
        self,
        session: AsyncSession,
        conversation_id: str,
        *,
        request_id: str | None = None,
        audio_bytes: bytes | None = None,
        audio_filename: str | None = None,
        transcript_override: str | None = None,
    ) -> dict[str, Any]:
        """Return shape matches TurnResponse (plus `ai_audio_path` which the router
        converts to a URL)."""
        if request_id:
            existing_user_turn = await session.scalar(
                select(Turn).where(Turn.request_id == request_id)
            )
            if existing_user_turn:
                # Turn already processed, return matching response
                ai_turn = await session.scalar(
                    select(Turn).where(
                        Turn.conversation_id == conversation_id,
                        Turn.sequence == existing_user_turn.sequence + 1,
                    )
                )
                return {
                    "user_transcript": existing_user_turn.transcript,
                    "ai_transcript": ai_turn.transcript if ai_turn else "",
                    "ai_audio_path": await self._persist_tts(conversation_id, ai_turn.transcript, use_cache=True) if ai_turn else None,
                    "sequence": ai_turn.sequence if ai_turn else existing_user_turn.sequence,
                    "event": None,
                    "conversation_complete": False,
                    "max_turns_reached": False,
                }

        conv = await session.get(Conversation, conversation_id)
        if not conv:
            raise ConversationNotFound(conversation_id)
        # Explicit async-safe load: get() with options is skipped on an
        # identity-map hit, and _remaining_events() reads conv.events — a sync
        # lazy load there raises MissingGreenlet. Load eagerly in all cases.
        await session.refresh(conv, attribute_names=["turns", "events"])
        if conv.status != "active":
            raise ConversationInactive(conversation_id)

        user_transcript, audio_path = await self._resolve_user_input(
            conv, audio_bytes, audio_filename, transcript_override
        )
        if len(audio_path or "") == 0:
            audio_path = None

        # Pure text mode: no audio to save.
        turn_count = len(conv.turns)
        maxed = turn_count >= settings.MAX_TURNS

        # Persist the user turn using loaded turns length to ensure sequence consistency
        seq_user = max([t.sequence for t in conv.turns] + [-1]) + 1
        session.add(
            Turn(
                request_id=request_id,
                conversation_id=conv.id,
                speaker="user",
                sequence=seq_user,
                transcript=user_transcript,
                audio_path=audio_path,
            )
        )
        await session.flush()

        if maxed:
            await self.end_conversation(session, conv.id)
            return {
                "user_transcript": user_transcript,
                "ai_transcript": "",
                "ai_audio_path": None,
                "sequence": seq_user,
                "event": None,
                "conversation_complete": True,
                "max_turns_reached": True,
            }

        # Generate AI reply + optionally inject a controlled event.
        defn = await self._defn_for(session, conv)
        ai_reply, event, ai_done = await self._generate_ai_reply(session, conv, defn)

        # Persist the AI turn.
        seq_ai = seq_user + 1
        session.add(
            Turn(
                conversation_id=conv.id,
                speaker="ai",
                sequence=seq_ai,
                transcript=ai_reply,
            )
        )
        await session.flush()
        audio_url = await self._persist_tts(conv.id, ai_reply, use_cache=False)

        done = ai_done or seq_ai + 1 >= settings.MAX_TURNS
        if done:
            await self.end_conversation(session, conv.id)

        return {
            "user_transcript": user_transcript,
            "ai_transcript": ai_reply,
            "ai_audio_path": audio_url,
            "sequence": seq_ai,
            "event": _event_out(event),
            "conversation_complete": done,
            "max_turns_reached": False,
        }

    async def list_turns(self, session: AsyncSession, conversation_id: str) -> list[dict]:
        rows = await session.execute(
            select(Turn).where(Turn.conversation_id == conversation_id).order_by(Turn.sequence)
        )
        return [
            {"speaker": t.speaker, "transcript": t.transcript, "sequence": t.sequence}
            for t in rows.scalars().all()
        ]

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _require(
        self, session: AsyncSession, conversation_id: str
    ) -> Conversation:
        conv = await session.get(Conversation, conversation_id)
        if not conv:
            raise ConversationNotFound(conversation_id)
        await session.refresh(conv, attribute_names=["turns", "events"])
        return conv

    async def _defn_for(self, session: AsyncSession, conv: Conversation):
        from ..models import Scenario as DbScenario

        row = await session.get(DbScenario, conv.scenario_id)
        key = row.scenario_key if row else None
        return BY_KEY.get(key) if key else None

    async def _resolve_user_input(
        self,
        conv: Conversation,
        audio_bytes: bytes | None,
        audio_filename: str | None,
        transcript_override: str | None,
    ) -> tuple[str, str | None]:
        """Return (transcript, saved_audio_path). Raises ValueError on empty input."""
        if transcript_override and transcript_override.strip():
            return transcript_override.strip(), None

        if audio_bytes is None or not audio_bytes:
            raise ValueError("No audio and no transcript provided")

        if len(audio_bytes) > settings.MAX_AUDIO_BYTES:
            raise ValueError("Audio too large")
        if len(audio_bytes) < 128:
            # Too-short clip likely a UI misclick; surface a clear message by generic
            # value error (router maps to 400).
            raise ValueError("Recording is empty or too short")

        ext = "webm"
        if audio_filename and "." in audio_filename:
            ext = audio_filename.rsplit(".", 1)[1].lower()
        prefix = f"user_{conv.id}"
        path = save_recording(audio_bytes, ext, prefix)

        # STT last so a provider failure doesn't orphan a saved file unnecessarily.
        try:
            transcript = await stt_service.transcribe_audio(
                audio_bytes, audio_filename or f"recording.{ext}"
            )
        except Exception:
            transcript = ""

        if not transcript.strip():
            raise ValueError("Could not understand the audio. Please try again.")
        return transcript.strip(), path

    async def _generate_ai_reply(
        self, session: AsyncSession, conv: Conversation, defn
    ) -> tuple[str, ScenarioEvent | None, bool]:
        history = await self.list_turns(session, conv.id)
        messages: list[dict[str, str]] = []
        for t in history:
            role = "assistant" if t["speaker"] == "ai" else "user"
            messages.append({"role": role, "content": t["transcript"]})

        remaining = self._remaining_events(conv, defn)
        system = build_conversation_system_prompt(
            persona=getattr(defn, "persona", "mentor") or "mentor",
            scenario_title=defn.title,
            environment=defn.environment,
            objective=defn.objective,
            partner_name=defn.partner_name,
            scenario_context=defn.context,
            events_remaining=remaining,
            accent=getattr(defn, "accent", None),
        )

        raw = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: llm_service.complete(
                system=system, messages=messages, max_tokens=450, temperature=0.6
            ),
        )
        if not raw.strip():
            raise LLMResponseError("Conversation model returned an empty response")

        parsed = parse_json_or_fallback(raw)
        if parsed and isinstance(parsed.get("reply"), str):
            reply = parsed["reply"].strip() or raw.strip()
            event = None
            if parsed.get("event_fired") and remaining:
                ev = await self._record_event(session, conv, parsed["event_fired"])
                event = ev
            return reply[:1200], event, bool(parsed.get("conversation_done"))

        # Resilient partial-JSON extractor so truncated JSON never leaks to the UI
        import re
        reply_match = re.search(r'"reply"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
        if reply_match:
            extracted_reply = reply_match.group(1).encode("utf-8").decode("unicode_escape", errors="ignore").strip()
            event = None
            ev_match = re.search(r'"event_fired"\s*:\s*"([^"]+)"', raw)
            if ev_match and remaining:
                ev = await self._record_event(session, conv, ev_match.group(1))
                event = ev
            done_match = re.search(r'"conversation_done"\s*:\s*(true|false)', raw, re.I)
            done = bool(done_match and done_match.group(1).lower() == "true")
            return extracted_reply[:1200], event, done

        # Plain-text fallback.
        return raw.strip().strip('"')[:1200], None, False

    def _remaining_events(self, conv: Conversation, defn) -> list[str]:
        if not settings.ENABLE_EVENTS:
            return []
        pool = list(getattr(defn, "events_pool", None) or [])
        if not pool:
            return []
        fired = {ev.event_type for ev in conv.events}
        unfired = [e for e in pool if e not in fired]
        # Once every pool event has fired, fall back to the full pool for longer chats.
        return unfired or pool

    async def _record_event(
        self, session: AsyncSession, conv: Conversation, event_type: str
    ) -> ScenarioEvent | None:
        if event_type not in EVENT_PROMPTS:
            return None
        seq = await self._next_sequence(session, conv.id)
        ev = ScenarioEvent(
            conversation_id=conv.id,
            event_type=event_type,
            trigger_turn=seq,
            description=EVENT_PROMPTS[event_type],
            resolved=False,
        )
        session.add(ev)
        await session.flush()
        return ev

    async def _persist_tts(
        self, conversation_id: str, text: str, *, use_cache: bool = False
    ) -> str | None:
        try:
            data = await asyncio.get_event_loop().run_in_executor(
                None, lambda: tts_service.synthesize(text, use_cache=use_cache)
            )
            if not data:
                return None
            return save_recording(data, "mp3", f"tts_{conversation_id}")
        except Exception:
            # TTS must never break the conversation; degrade gracefully.
            return None

    async def _turn_count(self, session: AsyncSession, conversation_id: str) -> int:
        res = await session.execute(
            select(func.count(Turn.id)).where(Turn.conversation_id == conversation_id)
        )
        return int(res.scalar() or 0)

    async def _next_sequence(self, session: AsyncSession, conversation_id: str) -> int:
        await session.flush()
        # Check in-session objects first to include uncommitted turns
        max_in_session = -1
        for obj in session.new:
            if isinstance(obj, Turn) and obj.conversation_id == conversation_id:
                if obj.sequence > max_in_session:
                    max_in_session = obj.sequence

        res = await session.execute(
            select(func.coalesce(func.max(Turn.sequence), -1)).where(
                Turn.conversation_id == conversation_id
            )
        )
        db_max = int(res.scalar() or -1)
        return max(max_in_session, db_max) + 1


def _event_out(event: ScenarioEvent | None) -> dict | None:
    if event is None:
        return None
    return {
        "event_type": event.event_type,
        "description": event.description,
        "resolved": event.resolved,
        "trigger_turn": event.trigger_turn,
    }






conversation_engine = ConversationEngine()