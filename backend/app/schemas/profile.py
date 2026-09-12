"""Schemas for the learner profile and scenario recommendation."""

from pydantic import BaseModel


class LearnerProfileOut(BaseModel):
    user_id: str
    display_name: str
    skill_dims: dict[str, float] = {}
    interests: list[str] = []
    mentor_prefs: dict = {}
    common_errors: list[dict] = []
    readiness_score: float
    intl_gap: float
    sessions_completed: int


class ProfileUpdate(BaseModel):
    interests: list[str] | None = None
    mentor_prefs: dict | None = None
    preferences: dict | None = None


class ScenarioRecommendation(BaseModel):
    scenario_key: str
    title: str
    reason: str                  # why this scenario targets the weakest dimension
    difficulty: float
    estimated_minutes: int