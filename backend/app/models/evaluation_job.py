"""EvaluationJob model for durable background processing (Phase 6 / Architecture §4.3)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class EvaluationJob(Base):
    """Tracks a durable evaluation job per conversation.
    States: pending -> running -> completed / failed
    """

    __tablename__ = "evaluation_jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id"), unique=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(30), default="pending", index=True
    )  # pending, running, completed, failed
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    conversation = relationship("Conversation", backref="evaluation_job")
