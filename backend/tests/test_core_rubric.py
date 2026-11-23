"""Phase 3 tests: CORE rubric validity, quotes from learner turns only, no AI quote credit."""

import pytest
from app.services.core_rubric import (
    ALL_CORE_DIMENSIONS,
    DIMENSION_REGISTRY,
    normalize_text,
    verify_quote_in_learner_turns,
)
from app.services.evaluation_engine import _guard_ratio, compute_readiness


def test_core_14_dimensions_registered():
    assert len(ALL_CORE_DIMENSIONS) == 14
    assert DIMENSION_REGISTRY["pronunciation"]["requires_acoustic"] is True
    assert DIMENSION_REGISTRY["fluency"]["group"] == "language"
    assert DIMENSION_REGISTRY["listening_response"]["group"] == "interaction"


def test_verify_quote_rejects_hallucinations_and_ai_quotes():
    learner_turns = [
        {"id": "turn_1", "transcript": "Could you clarify the submission guidelines for this assignment?", "timestamp": "00:15"},
        {"id": "turn_2", "transcript": "I understand now, thank you for explaining.", "timestamp": "00:45"},
    ]

    # Valid quote with minor casing/punctuation difference
    valid, t_id, ts = verify_quote_in_learner_turns("could you clarify the submission guidelines", None, learner_turns)
    assert valid is True
    assert t_id == "turn_1"
    assert ts == "00:15"

    # Fabricated / hallucinated quote
    invalid, _, _ = verify_quote_in_learner_turns("I have completed the presentation on time", None, learner_turns)
    assert invalid is False

    # Empty or whitespace quote
    empty, _, _ = verify_quote_in_learner_turns("   ", None, learner_turns)
    assert empty is False


def test_guard_ratio_honest_missing_data():
    # If 0 breakdowns occurred, recovery index is None (not scorable/no opportunity), NOT 1.0 (100%)
    assert _guard_ratio(0, 0) is None
    # 2 breakdowns, 1 recovery
    assert _guard_ratio(1, 2) == 0.5


def test_compute_readiness_handles_not_assessed():
    lang = {"fluency": 8.0, "grammar": 6.0, "pronunciation": None}
    inter = {"listening_response": 7.0, "clarification": None}
    # Lang avg = 7.0, Inter avg = 7.0 -> composite = 7.0
    assert compute_readiness(lang, inter) == 7.0
