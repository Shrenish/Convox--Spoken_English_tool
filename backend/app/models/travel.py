"""Travel journey and stage models for Global Survival mode."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class TravelJourney(Base):
    __tablename__ = "travel_journeys"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    destination: Mapped[str] = mapped_column(String(80), default="UK")
    current_stage: Mapped[int] = mapped_column(Integer, default=0)  # index into stage order
    status: Mapped[str] = mapped_column(String(20), default="active")  # active / completed
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="journeys")
    stages = relationship(
        "TravelStage", back_populates="journey",
        order_by="TravelStage.stage_index", cascade="all, delete-orphan",
    )


class TravelStage(Base):
    __tablename__ = "travel_stages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    journey_id: Mapped[str] = mapped_column(ForeignKey("travel_journeys.id"), index=True)
    stage_key: Mapped[str] = mapped_column(String(40))     # airport / immigration / ...
    stage_index: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="locked")  # locked / active / completed
    scenario_id: Mapped[str | None] = mapped_column(ForeignKey("scenarios.id"), nullable=True)
    conversation_id: Mapped[str | None] = mapped_column(ForeignKey("conversations.id"), nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)  # stage readiness, e.g. 7.1
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    journey = relationship("TravelJourney", back_populates="stages")