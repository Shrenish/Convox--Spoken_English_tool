"""The personalized learner model: skill dimensions, interests, mentor prefs,
common errors, recovery profile, and the internationalization gap."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

# Canonical language-competence dimensions (CORE).
LANGUAGE_DIMENSIONS = [
    "fluency",
    "grammar",
    "vocabulary",
    "pronunciation",
    "coherence",
]

# Canonical interaction-competence dimensions (CORE).
INTERACTION_DIMENSIONS = [
    "listening_response",
    "clarification",
    "repair",
    "turn_management",
    "adaptability",
    "register_switching",
    "goal_achievement",
    "pressure_handling",
    "vocab_recovery",
]


class LearnerProfile(Base):
    __tablename__ = "learner_profiles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    country: Mapped[str | None] = mapped_column(String(100), default="India")
    communication_context: Mapped[str] = mapped_column(
        String(50), default="Everyday American English"
    )
    target_objective: Mapped[str] = mapped_column(
        String(255), default="Communicate comfortably in common everyday situations."
    )
    cefr_provisional: Mapped[str] = mapped_column(String(30), default="B1 — Intermediate")
    # JSON: { fluency: 7.0, grammar: 7.0, ..., listening_response: 6.5, ... }
    skill_dims_json: Mapped[str] = mapped_column(default="{}")
    # JSON: dimension confidence/coverage { fluency: { sample_count: 3, confidence: "HIGH" }, ... }
    dimension_coverage_json: Mapped[str] = mapped_column(default="{}")
    # JSON array of applied evaluation IDs to guarantee idempotent updates: ["eval_id_1", ...]
    applied_evaluations_json: Mapped[str] = mapped_column(default="[]")
    # JSON array of interests: ["technology", "AI", "travel"]
    interests_json: Mapped[str] = mapped_column(default="[]")
    # JSON: { correction_frequency, speaking_speed, challenge_level, persona_preference }
    mentor_prefs_json: Mapped[str] = mapped_column(default="{}")
    # JSON array of { pattern, fix, context }
    common_errors_json: Mapped[str] = mapped_column(default="[]")
    # JSON: { repair_rate, avg_recovery_time_sec }
    recovery_profile_json: Mapped[str] = mapped_column(default="{}")
    # Overall 0..10 Communication Readiness
    readiness_score: Mapped[float] = mapped_column(Float, default=5.0)
    intl_gap: Mapped[float] = mapped_column(Float, default=0.0)
    sessions_completed: Mapped[int] = mapped_column(default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="learner_profile")

    # --- JSON helpers -------------------------------------------------

    @property
    def skill_dims(self) -> dict:
        import json

        try:
            return json.loads(self.skill_dims_json)
        except (json.JSONDecodeError, TypeError):
            return {}

    def set_skill_dims(self, dims: dict) -> None:
        import json

        self.skill_dims_json = json.dumps(dims)

    def update_skill_dims(self, updates: dict) -> None:
        dims = self.skill_dims
        dims.update(updates)
        self.set_skill_dims(dims)

    @property
    def interests(self) -> list[str]:
        import json

        try:
            return json.loads(self.interests_json)
        except (json.JSONDecodeError, TypeError):
            return []

    def set_interests(self, interests: list[str]) -> None:
        import json

        self.interests_json = json.dumps(interests)

    @property
    def mentor_prefs(self) -> dict:
        import json

        try:
            return json.loads(self.mentor_prefs_json)
        except (json.JSONDecodeError, TypeError):
            return {}

    def set_mentor_prefs(self, prefs: dict) -> None:
        import json

        self.mentor_prefs_json = json.dumps(prefs)

    @property
    def common_errors(self) -> list[dict]:
        import json

        try:
            return json.loads(self.common_errors_json)
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def applied_evaluations(self) -> list[str]:
        import json

        try:
            return json.loads(self.applied_evaluations_json)
        except (json.JSONDecodeError, TypeError):
            return []

    def set_applied_evaluations(self, eval_ids: list[str]) -> None:
        import json

        self.applied_evaluations_json = json.dumps(eval_ids)

    def set_common_errors(self, errors: list[dict]) -> None:
        import json

        self.common_errors_json = json.dumps(errors)