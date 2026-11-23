"""Travel / Global Survival: journey bootstrap, stage locking, progression."""

from app.services.learner_model import get_progress_summary
from app.services.llm_service import llm_service
from app.services.scenarios_data import TRAVEL_STAGES
from app.services.travel_service import (
    complete_stage,
    journey_out,
    start_journey,
    start_stage,
)
from app.services.users import DEFAULT_USER_ID


def _stub_eval_model(monkeypatch):
    payload = {
        "language_scores": {
            "fluency": 6.0, "grammar": 6.0, "vocabulary": 6.0,
            "pronunciation": None, "coherence": 7.0,
        },
        "interaction_scores": {
            "listening_response": 6.0, "clarification": 7.0, "repair": 6.0,
            "turn_management": 6.0, "adaptability": 6.0, "register_switching": 6.0,
            "goal_achievement": 7.0, "pressure_handling": 6.0, "vocab_recovery": 6.0,
        },
        "evidence": [{"timestamp": "00:20", "speaker": "user",
                      "quote": "I'd like to confirm the boarding gate, please.",
                      "skill": "goal_achievement", "impact": "High", "note": "clear request"}],
        "recovery": {"breakdowns": 1, "recoveries": 1, "avg_recovery_time_sec": 3.0},
        "vocab_recovery": {"gaps": 0, "preserved": 0, "note": "no gaps"},
        "adaptation_notes": [],
        "recommended_focus": ["grammar", "fluency"],
        "confidence": "MODERATE CONFIDENCE",
        "summary": "Solid basics; request achieved.",
    }

    def _fake(*, system, messages, model=None, max_tokens=None, temperature=None):
        if "SCORE EACH DIMENSION" in system:
            return payload
        return {"condition_scores": {}, "overall": {"objective_met": True, "reason": "goal reached"}}

    monkeypatch.setattr(llm_service, "complete_json", _fake)


async def test_journey_bootstraps_eight_stages(seeded_session):
    journey = await start_journey(seeded_session, DEFAULT_USER_ID, destination="UK")
    assert len(journey.stages) == len(TRAVEL_STAGES) == 8
    assert [s.stage_key for s in journey.stages] == [
        "airport", "immigration", "transport", "hotel",
        "restaurant", "shopping", "social", "emergency",
    ]
    assert journey.stages[0].status == "active"
    assert all(s.status == "locked" for s in journey.stages[1:])

    out = await journey_out(seeded_session, journey.id)
    assert out.current_stage == 0
    assert out.stages[0].scenario_key == "travel_airport"
    assert out.stages[-1].title == "Unexpected Problem"


async def test_stage_starts_conversation(seeded_session):
    journey = await start_journey(seeded_session, DEFAULT_USER_ID)
    start = await start_stage(seeded_session, journey.id, "airport")
    assert start.conversation_id
    assert start.scenario_key == "travel_airport"
    assert "passport" in start.ai_transcript  # opening_line of the airport stage
    assert start.stage_key == "airport"


async def test_completing_stage_scores_and_unlocks_next(seeded_session, monkeypatch):
    _stub_eval_model(monkeypatch)
    journey = await start_journey(seeded_session, DEFAULT_USER_ID)
    start = await start_stage(seeded_session, journey.id, "airport")

    # Add a real user turn to satisfy minimum participation policy
    from app.models import Turn
    seeded_session.add(
        Turn(
            conversation_id=start.conversation_id,
            speaker="user",
            sequence=1,
            transcript="I'd like to confirm the boarding gate, please.",
        )
    )
    await seeded_session.flush()

    result = await complete_stage(seeded_session, journey.id, "airport")
    assert result.stage_key == "airport"
    assert result.journey_completed is False
    assert result.next_stage is not None and result.next_stage.stage_key == "immigration"
    assert result.next_stage.status == "active"
    assert result.recommended_focus == ["grammar", "fluency"]

    stage = next(s for s in journey.stages if s.stage_key == "airport")
    assert stage.status == "completed" and stage.score is not None

    # Learner model records the travel session too.
    summary = await get_progress_summary(seeded_session, DEFAULT_USER_ID)
    assert summary.sessions_completed == 1
    assert summary.trend[0].readiness == stage.score

    # Stage completion is idempotent-guarded: it refuses a second completion.
    try:
        await complete_stage(seeded_session, journey.id, "airport")
        raise AssertionError("expected StageNotActive for a completed stage")
    except Exception as exc:
        assert getattr(exc, "code", "") == "stage_not_active"


async def test_full_journey_completion(seeded_session, monkeypatch):
    _stub_eval_model(monkeypatch)
    journey = await start_journey(seeded_session, DEFAULT_USER_ID)

    last = None
    for stage_def in TRAVEL_STAGES:
        start_res = await start_stage(seeded_session, journey.id, stage_def.stage_key)
        from app.models import Turn
        seeded_session.add(
            Turn(
                conversation_id=start_res.conversation_id,
                speaker="user",
                sequence=1,
                transcript="I'd like to confirm the boarding gate, please.",
            )
        )
        await seeded_session.flush()
        result = await complete_stage(seeded_session, journey.id, stage_def.stage_key)
        last = result

    assert last.journey_completed is True
    assert last.next_stage is None
    assert journey.status == "completed"
    assert journey.completed_at is not None

    out = await journey_out(seeded_session, journey.id)
    assert all(s.status == "completed" for s in out.stages)
    # mean language 6.2 * 0.5 + mean interaction 6.22 * 0.5 ≈ 6.2 → stored score
    assert 5.0 < out.stages[0].score <= 7.0
    assert out.stages[-1].score == out.stages[0].score  # same stub payload per run