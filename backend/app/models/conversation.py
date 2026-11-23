"""Conversation, Turn, and injected ScenarioEvent models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    request_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    scenario_id: Mapped[str] = mapped_column(ForeignKey("scenarios.id"), index=True)
    mode: Mapped[str] = mapped_column(String(20), default="conversation")  # conversation / travel / exam
    status: Mapped[str] = mapped_column(String(30), default="active")       # active / completed / aborted
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    frozen_transcript_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    frozen_transcript_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="conversations")
    scenario = relationship("Scenario", back_populates="conversations")
    turns = relationship(
        "Turn", back_populates="conversation", order_by="Turn.sequence", cascade="all, delete-orphan"
    )
    events = relationship(
        "ScenarioEvent", back_populates="conversation", cascade="all, delete-orphan"
    )
    evaluation = relationship(
        "Evaluation", back_populates="conversation", uselist=False, cascade="all, delete-orphan"
    )


class Turn(Base):
    __tablename__ = "turns"
    __table_args__ = (
        UniqueConstraint("conversation_id", "sequence", name="uq_turns_conversation_sequence"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    request_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    speaker: Mapped[str] = mapped_column(String(20))               # ai / user
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    transcript: Mapped[str] = mapped_column(Text, default="")
    audio_path: Mapped[str | None] = mapped_column(String(300), nullable=True)  # relative path to audio file
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    conversation = relationship("Conversation", back_populates="turns")


class ScenarioEvent(Base):
    """A controlled conversational event injected mid-session: misunderstanding,
    disagreement, time_pressure, topic_shift, vocabulary_gap, interruption..."""

    __tablename__ = "scenario_events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(40))
    # Sequence index of the AI turn during which the event was injected.
    trigger_turn: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(Text, default="")
    # Lifecycle status: injected, opportunity_observed, recovered, not_recovered, not_assessable
    status: Mapped[str] = mapped_column(String(30), default="injected")
    resolved: Mapped[bool] = mapped_column(default=False)          # whether learner recovered
    resolution_turn: Mapped[int | None] = mapped_column(Integer, nullable=True)
    evidence_turn_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    evidence_quote: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    conversation = relationship("Conversation", back_populates="events")