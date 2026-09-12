"""Scenario model. Scenario *definitions* live in JSON data files; this table
records which scenarios exist so sessions can reference them consistently."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    scenario_key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    environment: Mapped[str] = mapped_column(String(80))          # college / workplace / travel / international
    objective: Mapped[str] = mapped_column(String(80))            # reach_agreement / get_info ...
    difficulty: Mapped[float] = mapped_column(Float, default=5.0)  # 1..10
    partner: Mapped[str] = mapped_column(String(80), default="mentor")
    category: Mapped[str] = mapped_column(String(40), default="core")  # core / travel
    stage_key: Mapped[str | None] = mapped_column(String(40), nullable=True)  # travel stage, if any
    # JSON arrays: events_pool, success_conditions, hidden_objectives
    events_json: Mapped[str] = mapped_column(default="[]")
    success_conditions_json: Mapped[str] = mapped_column(default="[]")
    hidden_objectives_json: Mapped[str] = mapped_column(default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )

    conversations = relationship("Conversation", back_populates="scenario")

    @property
    def events_pool(self) -> list[str]:
        import json

        try:
            return json.loads(self.events_json)
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def success_conditions(self) -> list[str]:
        import json

        try:
            return json.loads(self.success_conditions_json)
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def hidden_objectives(self) -> list[str]:
        import json

        try:
            return json.loads(self.hidden_objectives_json)
        except (json.JSONDecodeError, TypeError):
            return []