"""Schemas for the Travel / Global Survival API."""

from pydantic import BaseModel


class TravelStartRequest(BaseModel):
    destination: str = "UK"


class TravelStageOut(BaseModel):
    stage_key: str
    stage_index: int
    title: str
    status: str                 # locked / active / completed
    scenario_key: str | None = None
    score: float | None = None


class TravelJourneyOut(BaseModel):
    journey_id: str
    destination: str
    status: str
    current_stage: int
    stages: list[TravelStageOut] = []


class TravelStageCompleteResponse(BaseModel):
    journey_id: str
    stage_key: str
    next_stage: TravelStageOut | None = None
    journey_completed: bool = False
    recommended_focus: list[str] = []


class TravelStageStartResponse(BaseModel):
    """Response when a travel stage's conversation opens: the first AI turn."""

    conversation_id: str
    stage_key: str
    scenario_key: str
    title: str
    ai_transcript: str
    ai_audio_url: str | None = None