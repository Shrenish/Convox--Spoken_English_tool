"""Schema for scenario definitions surfaced to the client."""

from pydantic import BaseModel


class ScenarioOut(BaseModel):
    scenario_key: str
    title: str
    environment: str
    objective: str
    difficulty: float
    partner: str
    category: str = "core"
    stage_key: str | None = None
    events_pool: list[str] = []
    success_conditions: list[str] = []
    hidden_objectives: list[str] = []
    description: str = ""