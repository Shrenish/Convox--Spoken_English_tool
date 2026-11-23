"""Schemas for evaluation, autopsy, and progress."""

from pydantic import BaseModel, Field


class EvidenceItem(BaseModel):
    timestamp: str = ""
    quote: str = ""
    skill: str = ""
    impact: str = "Medium"          # Low / Medium / High
    note: str = ""
    event_type: str | None = None


class EvaluationOut(BaseModel):
    conversation_id: str
    language_scores: dict[str, float | None] = {}
    interaction_scores: dict[str, float | None] = {}
    readiness_score: float
    recovery_index: float | None = None
    vocab_recovery_index: float | None = None
    intl_gap: float | None = None
    confidence: str


class AutopsyOut(BaseModel):
    conversation_id: str
    evaluation: EvaluationOut | None = None
    evidence: list[EvidenceItem] = []
    events: list[dict] = Field(default_factory=list)   # injected events with resolution
    recommended_focus: list[str] = Field(default_factory=list)


class ProgressTrendPoint(BaseModel):
    label: str                  # "Sep 13" / "Session 3"
    readiness: float
    recovery: float | None = None
    intl_gap: float | None = None


class ProgressSummary(BaseModel):
    readiness: float
    language_scores: dict[str, float] = {}
    interaction_scores: dict[str, float] = {}
    recovery_index: float
    intl_gap: float
    sessions_completed: int
    trend: list[ProgressTrendPoint] = []
    weakest_dimensions: list[str] = []
    recommended_focus: str = ""