"""End-to-end CORE pipeline with a stubbed evaluation model: conversation →
CORE scores → autopsy → learner model update → progress trend."""

from sqlalchemy import select

from app.models import Conversation, Scenario as DbScenario, ScenarioEvent, Turn
from app.services.evaluation_engine import evaluate_conversation, get_autopsy
from app.services.learner_model import (
    apply_evaluation,
    get_progress_summary,
)
from app.services.llm_service import llm_service
from app.services.users import get_or_create_default_user

MAIN_PAYLOAD = {
    "language_scores": {
        "fluency": 7.5,
        "grammar": 6.5,
        "vocabulary": 7.0,
        "pronunciation": None,
        "coherence": 8.0,
    },
    "interaction_scores": {
        "listening_response": 7.0,
        "clarification": 8.5,
        "repair": 6.0,
        "turn_management": 7.5,
        "adaptability": 6.5,
        "register_switching": 7.0,
        "goal_achievement": 8.0,
        "pressure_handling": 6.0,
        "vocab_recovery": 7.5,
    },
    "evidence": [
        {
            "timestamp": "00:40",
            "speaker": "user",
            "quote": "Could you explain the submission format once more?",
            "skill": "clarification",
            "impact": "High",
            "note": "asked a targeted clarifying question",
        }
    ],
    "recovery": {"breakdowns": 2, "recoveries": 1, "avg_recovery_time_sec": 4.0},
    "vocab_recovery": {"gaps": 2, "preserved": 2, "note": "paraphrased around a gap"},
    "adaptation_notes": [
        {
            "indian_pattern": "I have a doubt",
            "context": "asking about the deadline",
            "international_alternative": "I have a question",
        }
    ],
    "recommended_focus": ["repair", "grammar", "pressure_handling"],
    "confidence": "HIGH CONFIDENCE",
    "summary": "Clear, structured turns; one breakdown recovered promptly.",
}

OBJ_PAYLOAD = {
    "condition_scores": {"ask_for_clarification": {"met": True, "evidence": "ask...", "confidence": "high"}},
    "overall": {"objective_met": True, "reason": "learner asked a targeted clarifying question"},
}


def _stub_eval_model(monkeypatch):
    def _fake(*, system, messages, model=None, max_tokens=None, temperature=None):
        if "SCORE EACH DIMENSION" in system:
            return MAIN_PAYLOAD
        return OBJ_PAYLOAD

    monkeypatch.setattr(llm_service, "complete_json", _fake)


async def _make_conversation(session):
    user = await get_or_create_default_user(session)
    scenario = await session.scalar(
        select(DbScenario).where(DbScenario.scenario_key == "professor_clarification")
    )
    conv = Conversation(
        user_id=user.id,
        scenario_id=scenario.id,
        mode="conversation",
        status="active",
    )
    session.add(conv)
    await session.flush()

    session.add_all(
        [
            Turn(conversation_id=conv.id, speaker="ai", sequence=0,
                 transcript="Yes? You had a question about the assignment?"),
            Turn(conversation_id=conv.id, speaker="user", sequence=1,
                 transcript="Could you explain the submission format once more? And is Friday the deadline?"),
            Turn(conversation_id=conv.id, speaker="ai", sequence=2,
                 transcript="Friday is for the draft. The final is next Wednesday."),
        ]
    )
    session.add(
        ScenarioEvent(
            conversation_id=conv.id,
            event_type="misunderstanding",
            trigger_turn=2,
            description="acted as if the draft were the final",
            resolved=False,
        )
    )
    await session.flush()
    return conv


async def test_eval_to_autopsy_to_learner(seeded_session, monkeypatch):
    session = seeded_session
    _stub_eval_model(monkeypatch)
    conv = await _make_conversation(session)

    # 1) Finalize and then CORE evaluation
    conv.status = "completed"
    await session.flush()
    evaluation = await evaluate_conversation(session, conv.id)
    import json

    language = json.loads(evaluation.language_scores_json)
    interaction = json.loads(evaluation.interaction_scores_json)
    assert language["fluency"] == 7.5
    assert "pronunciation" not in language  # null → dropped
    assert interaction["goal_achievement"] == 8.0
    assert evaluation.confidence == "HIGH CONFIDENCE"
    assert evaluation.recovery_index == 0.5
    assert evaluation.vocab_recovery_index == 1.0

    # readiness = 0.5*(mean lang) + 0.5*(mean intl)
    mean_lang = (7.5 + 6.5 + 7.0 + 8.0) / 4  # pronunciation excluded
    mean_intl = sum(interaction.values()) / len(interaction)
    assert evaluation.readiness_score == round(0.5 * mean_lang + 0.5 * mean_intl, 1)

    # 2) Autopsy surfaces evidence + const event + objective check
    autopsy = await get_autopsy(session, conv.id)
    assert autopsy.recommended_focus == ["repair", "grammar", "pressure_handling"]
    assert any(e.skill == "clarification" and "submission format" in e.quote for e in autopsy.evidence)
    assert any(e.skill == "goal_achievement" and e.impact == "High" for e in autopsy.evidence)
    assert autopsy.events and autopsy.events[0]["event_type"] == "misunderstanding"
    assert autopsy.events[0]["resolved"] is False

    # 3) Learner model absorbs the session (idempotently)
    profile = await apply_evaluation(session, conv.id)
    assert profile.sessions_completed == 1
    assert profile.skill_dims["clarification"] == 8.5
    assert profile.skill_dims["fluency"] == 7.5
    assert profile.common_errors[0]["pattern"] == "I have a doubt"

    again = await apply_evaluation(session, conv.id)
    assert again.sessions_completed == 1  # guard: same conversation not double-counted

    # 4) Progress summary trend reflects the session
    summary = await get_progress_summary(session, conv.user_id)
    assert summary.sessions_completed == 1
    assert len(summary.trend) == 1
    assert summary.trend[0].readiness == evaluation.readiness_score
    assert "clarification" in summary.language_scores or "clarification" in summary.interaction_scores