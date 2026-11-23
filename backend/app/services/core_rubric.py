"""Phase 3: Typed CORE Rubric Registry and Evidence Validator.

Non-negotiable product rule: no score, recovery claim, pronunciation claim or progress
update without a valid observation and a clearly stated measurement basis.
"""

import re
from typing import Any, Literal
from pydantic import BaseModel, Field

# Group 1: 5 Language Competence Dimensions
LANGUAGE_DIMENSIONS = [
    "fluency",
    "grammar",
    "vocabulary",
    "pronunciation",
    "coherence",
]

# Group 2: 9 Interaction Competence Dimensions
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

ALL_CORE_DIMENSIONS = set(LANGUAGE_DIMENSIONS + INTERACTION_DIMENSIONS)

# Dimension metadata: description, requires_acoustic, eligibility
DIMENSION_REGISTRY: dict[str, dict[str, Any]] = {
    "fluency": {
        "group": "language",
        "description": "Speech flow, rate, pauses, disfluency, continuity",
        "requires_acoustic": False,
    },
    "grammar": {
        "group": "language",
        "description": "Accuracy, repeated grammatical patterns, error impact on meaning",
        "requires_acoustic": False,
    },
    "vocabulary": {
        "group": "language",
        "description": "Range, precision, word retrieval, contextual use",
        "requires_acoustic": False,
    },
    "pronunciation": {
        "group": "language",
        "description": "Intelligibility, stress, rhythm, problem sounds, prosody",
        "requires_acoustic": True,  # Cannot be evaluated from text transcript alone
    },
    "coherence": {
        "group": "language",
        "description": "Organization, logical progression, response structure",
        "requires_acoustic": False,
    },
    "listening_response": {
        "group": "interaction",
        "description": "Did the learner actually answer what was asked? Listening-response alignment",
        "requires_acoustic": False,
    },
    "clarification": {
        "group": "interaction",
        "description": "Asking when they do not understand or seeking necessary detail",
        "requires_acoustic": False,
    },
    "repair": {
        "group": "interaction",
        "description": "Fixing misunderstandings and conversational breakdowns",
        "requires_acoustic": False,
    },
    "turn_management": {
        "group": "interaction",
        "description": "Entering, maintaining, and releasing conversational turns gracefully",
        "requires_acoustic": False,
    },
    "adaptability": {
        "group": "interaction",
        "description": "Reacting well to changing topics, circumstances, and pressure",
        "requires_acoustic": False,
    },
    "register_switching": {
        "group": "interaction",
        "description": "Adjusting formality/politeness/directness to the person and situation",
        "requires_acoustic": False,
    },
    "goal_achievement": {
        "group": "interaction",
        "description": "Actually accomplishing the communication objective",
        "requires_acoustic": False,
    },
    "pressure_handling": {
        "group": "interaction",
        "description": "Communicating under time or social pressure",
        "requires_acoustic": False,
    },
    "vocab_recovery": {
        "group": "interaction",
        "description": "Continuing to communicate when a needed word is not available",
        "requires_acoustic": False,
    },
}


def normalize_text(text: str) -> str:
    """Conservative normalization for quote matching: collapse spaces, ignore punctuation and casing."""
    t = re.sub(r"[^\w\s]", "", text.lower())
    return " ".join(t.split())


def verify_quote_in_learner_turns(
    quote: str,
    turn_id: str | None,
    learner_turns: list[dict[str, Any]],
) -> tuple[bool, str | None, str | None]:
    """Verifies that the quote is an authentic span of a real learner turn.

    Returns (is_valid, matched_turn_id, server_timestamp).
    Rejects:
    - AI-authored quotes
    - Fabricated or hallucinated quotes
    - Paraphrases that don't match the actual learner turns
    """
    if not quote or not quote.strip():
        return False, None, None

    norm_quote = normalize_text(quote)
    if not norm_quote:
        return False, None, None

    # Check candidate turn first if turn_id provided
    if turn_id:
        target = next((t for t in learner_turns if t.get("id") == turn_id), None)
        if target:
            norm_target = normalize_text(target.get("transcript", ""))
            if norm_quote in norm_target:
                return True, target.get("id"), target.get("timestamp") or "00:00"

    # Search all learner turns
    for t in learner_turns:
        norm_t = normalize_text(t.get("transcript", ""))
        if norm_quote in norm_t:
            return True, t.get("id"), t.get("timestamp") or "00:00"

    return False, None, None


class ValidatedEvidenceItem(BaseModel):
    turn_id: str
    timestamp: str
    speaker: Literal["user"] = "user"
    quote: str
    skill: str
    impact: str = "Medium"
    note: str = ""


class ValidatedEvaluationResult(BaseModel):
    rubric_version: str = "core_v2.0"
    language_scores: dict[str, float | None]
    interaction_scores: dict[str, float | None]
    evidence: list[ValidatedEvidenceItem]
    coverage: dict[str, Any]
    readiness_score: float
    recovery_index: float | None
    vocab_recovery_index: float | None
    intl_gap: float | None
    confidence: str
    summary: str
    recommended_focus: list[str] = Field(default_factory=list)
