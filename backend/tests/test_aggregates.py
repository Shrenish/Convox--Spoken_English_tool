"""Pure aggregate functions — deterministic, no IO, no LLM."""

from app.services.evaluation_engine import (
    _clean_confidence,
    _guard_ratio,
    clean_scores,
    compute_readiness,
)


def test_compute_readiness_balanced():
    language = {d: 8.0 for d in ("fluency", "grammar", "vocabulary", "pronunciation", "coherence")}
    interaction = {d: 6.0 for d in ("repair", "clarification", "goal_achievement")}
    # language block avg 8.0 * 0.5, interaction avg 6.0 * 0.5 → 4.0 + 3.0
    assert compute_readiness(language, interaction) == 7.0


def test_compute_readiness_ignores_empty_block():
    assert compute_readiness({}, {"goal_achievement": 10.0}) == 5.0


def test_clean_scores_drops_nulls_and_junk():
    raw = {"fluency": 7.2, "grammar": None, "pronunciation": "n/a", "coherence": 6}
    out = clean_scores(raw)
    assert out == {"fluency": 7.2, "coherence": 6.0}
    assert clean_scores(None) == {}
    assert clean_scores("garbage") == {}


def test_guard_ratio_no_breakdowns_is_full_recovery():
    assert _guard_ratio(0, 0) == 1.0
    assert _guard_ratio(3, 4) == 0.75


def test_confidence_cleaned_to_known_set():
    assert _clean_confidence("HIGH CONFIDENCE") == "HIGH CONFIDENCE"
    assert _clean_confidence("high confidence") == "HIGH CONFIDENCE"
    assert _clean_confidence("whatever") == "MODERATE CONFIDENCE"