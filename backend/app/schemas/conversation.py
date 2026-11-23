"""Schemas for the conversation API."""

from pydantic import BaseModel, Field


class ConversationStartRequest(BaseModel):
    scenario_key: str
    mode: str = "conversation"          # conversation / travel / exam
    difficulty_override: float | None = None
    request_id: str | None = None


class TurnRequest(BaseModel):
    """A user turn. Audio arrives as multipart; this is the metadata-only shape."""

    transcript: str | None = Field(default=None, description="Override: use text instead of STT")
    request_id: str | None = None


class EventOut(BaseModel):
    event_type: str
    description: str
    resolved: bool = False
    trigger_turn: int = 0


class TurnResponse(BaseModel):
    conversation_id: str
    sequence: int
    user_transcript: str = ""
    ai_transcript: str = ""
    ai_audio_url: str | None = None
    event: EventOut | None = None
    conversation_complete: bool = False
    max_turns_reached: bool = False


class ConversationSummary(BaseModel):
    id: str
    scenario_key: str
    mode: str
    status: str
    turn_count: int
    started_at: str