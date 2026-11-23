"""Per-conversation evaluation: CORE dimension scores + evidence."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), unique=True, index=True)
    rubric_version: Mapped[str] = mapped_column(String(20), default="core_v2.0")
    # JSON: { fluency: 7.8, grammar: 7.4, ... }
    language_scores_json: Mapped[str] = mapped_column(default="{}")
    # JSON: { listening_response: 6.2, clarification: 5.7, ... }
    interaction_scores_json: Mapped[str] = mapped_column(default="{}")
    # JSON: list of evidence objects { timestamp, quote, skill, impact, note, turn_id }
    evidence_json: Mapped[str] = mapped_column(default="[]")
    # JSON: { recognition, guided_production, controlled_use, spontaneous_use, flexible_transfer }
    transfer_json: Mapped[str] = mapped_column(default="{}")
    # JSON: coverage tracking { assessed_count, not_assessed_count, dimensions }
    coverage_json: Mapped[str] = mapped_column(default="{}")
    readiness_score: Mapped[float] = mapped_column(Float, default=0.0)
    recovery_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    vocab_recovery_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    intl_gap: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[str] = mapped_column(String(24), default="HIGH CONFIDENCE")  # HIGH/MODERATE/LOW/UNABLE
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    conversation = relationship("Conversation", back_populates="evaluation")