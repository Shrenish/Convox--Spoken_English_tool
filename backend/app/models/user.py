"""User model — single-user in v1, but the schema is multi-user ready."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    display_name: Mapped[str] = mapped_column(String(120), default="Learner")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # JSON blob of flexible preferences (speed pref, correction frequency, etc.)
    preferences_json: Mapped[str] = mapped_column(default="{}")

    learner_profile = relationship(
        "LearnerProfile", back_populates="user", uselist=False
    )
    conversations = relationship(
        "Conversation", back_populates="user", order_by="Conversation.started_at"
    )
    journeys = relationship("TravelJourney", back_populates="user")

    @property
    def preferences(self) -> dict:
        import json

        try:
            return json.loads(self.preferences_json)
        except (json.JSONDecodeError, TypeError):
            return {}

    def set_preferences(self, prefs: dict) -> None:
        import json

        self.preferences_json = json.dumps(prefs)