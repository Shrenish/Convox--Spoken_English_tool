"""CORE evaluation engine (PRD §17, §52): evidence-linked scoring + autopsy.

Runs on a completed (or on-demand) conversation. Two model calls:

1. `build_evaluation_prompt` — scores the 14 CORE dimensions, every score backed
   by a quoted transcript excerpt.
2. `build_objectives_eval_prompt` — judges the scenario's hidden objectives from
   the learner's own words.

Both are synchronous Anthropic calls; they are dispatched through the event-loop
threadpool (same pattern as conversation_engine) so FastAPI stays responsive.
The composite scores are derived deterministically *here*, keeping the model the
judge of dimensions and this code the judge of the aggregate — PRD's controlled
randomness: the LLM evaluates, the system computes.
"""

import asyncio
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import Evaluation
from ..models.conversation import Conversation
from ..schemas.evaluation import AutopsyOut, EvaluationOut, EvidenceItem
from ..utils.prompts import build_evaluation_prompt, build_objectives_eval_prompt
from .exceptions import ConversationNotFound, LLMResponseError
from .llm_service import llm_service

_CONFIDENCE_VALUES = {
    "HIGH CONFIDENCE",
    "MODERATE CONFIDENCE",
    "LOW CONFIDENCE",
    "UNABLE TO ASSESS",
}

_LANGUAGE_WEIGHT = 0.5
_INTERACTION_WEIGHT = 0.5


# ---------------------------------------------------------------------------
# Deterministic aggregates
# ---------------------------------------------------------------------------

def clean_scores(raw: dict[str, Any] | None) -> dict[str, float]:
    """Keep only numeric, non-null scores. The model may return null for a
    dimension it could not assess (e.g. pronunciation from text)."""
    if not isinstance(raw, dict):
        return {}
    out: dict[str, float] = {}
    for key, value in raw.items():
        if isinstance(value, (int, float)) and value is not None:
            out[str(key)] = round(float(value), 1)
    return out


def compute_readiness(language: dict[str, float | None], interaction: dict[str, float | None]) -> float:
    """Weighted composite: language block 50%, interaction block 50%.
    Computes only over assessed numeric scores."""
    lang_vals = [v for v in language.values() if isinstance(v, (int, float)) and v is not None]
    inter_vals = [v for v in interaction.values() if isinstance(v, (int, float)) and v is not None]

    parts: list[float] = []
    if lang_vals:
        parts.append((sum(lang_vals) / len(lang_vals)) * _LANGUAGE_WEIGHT)
    if inter_vals:
        parts.append((sum(inter_vals) / len(inter_vals)) * _INTERACTION_WEIGHT)

    if not parts:
        return 0.0
    total_weight = (0.5 if lang_vals else 0.0) + (0.5 if inter_vals else 0.0)
    scale = 1.0 / (total_weight or 1.0)
    return round(sum(parts) * scale, 1)


def _guard_ratio(numerator: int, denominator: int) -> float | None:
    """Honest recovery index: returns None if no opportunity existed rather than claiming 100%."""
    if denominator <= 0:
        return None  # No breakdown opportunity observed -> not applicable
    return round(numerator / denominator, 2)


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

async def evaluate_conversation(
    session: AsyncSession, conversation_id: str
) -> Evaluation:
    """Run (or return the cached) evaluation for a conversation. Idempotent."""
    conv = await session.get(Conversation, conversation_id)
    if not conv:
        raise ConversationNotFound(conversation_id)

    if conv.status != "completed":
        raise ValueError(f"Conversation {conversation_id} is active and cannot be evaluated until completed.")

    existing = await session.scalar(
        select(Evaluation).where(Evaluation.conversation_id == conversation_id)
    )
    if existing:
        return existing

    # The instance may already be in the identity map (created earlier in this
    # session); a plain get() would then skip its eager options and the
    # relationships would lazy-load synchronously → MissingGreenlet. Reload the
    # relationships explicitly, which is async-safe in every case.
    await session.refresh(conv, attribute_names=["turns", "events", "scenario"])
    scenario = conv.scenario
    scenario_title = scenario.title if scenario else "Conversation"
    objective = (scenario.objective if scenario else "") or ""
    partner = scenario.partner if scenario else "partner"
    environment = scenario.environment if scenario else "college"

    transcript = [{"speaker": t.speaker, "text": t.transcript} for t in conv.turns]
    injected_events = [
        {"event_type": e.event_type, "trigger_turn": e.trigger_turn, "description": e.description}
        for e in conv.events
    ]

    main_prompt = build_evaluation_prompt(
        scenario_title=scenario_title,
        objective=objective,
        partner=partner,
        environment=environment,
        transcript=transcript,
        injected_events=injected_events,
        prompt_variation=_variation_for(environment),
    )

    loop = asyncio.get_running_loop()

    async def run_json(prompt: str) -> dict[str, Any] | None:
        return await loop.run_in_executor(
            None,
            lambda: llm_service.complete_json(
                system=prompt,
                messages=[{"role": "user", "content": "Evaluate the transcript above."}],
                model=settings.EVALUATION_MODEL,
                max_tokens=2800,
                temperature=0.2,
            ),
        )

    # Hidden-objective judgement runs in parallel when the scenario defines any.
    obj_task = None
    if scenario is not None and getattr(scenario, "hidden_objectives", None):
        obj_prompt = build_objectives_eval_prompt(
            objective=objective,
            success_conditions=getattr(scenario, "success_conditions", []),
            hidden_objectives=scenario.hidden_objectives,
            transcript=transcript,
        )
        obj_task = asyncio.create_task(run_json(obj_prompt))

    main = await run_json(main_prompt)
    if not isinstance(main, dict):
        raise LLMResponseError("Evaluation model returned malformed JSON")

    # Optional hidden-objective channel: never fail the evaluation over it.
    objective_result = None
    if obj_task is not None:
        try:
            objective_result = await obj_task
        except Exception:
            objective_result = None

    language = clean_scores(main.get("language_scores"))
    interaction = clean_scores(main.get("interaction_scores"))
    # Pronunciation is marked not assessed because text transcript lacks acoustic evidence
    language["pronunciation"] = None

    raw_evidence = main.get("evidence")
    learner_turns = [
        {"id": t.id, "transcript": t.transcript, "timestamp": "00:30"}
        for t in conv.turns
        if t.speaker == "user"
    ]

    from .core_rubric import verify_quote_in_learner_turns

    valid_evidence = []
    if isinstance(raw_evidence, list):
        for item in raw_evidence:
            if not isinstance(item, dict):
                continue
            quote = item.get("quote", "")
            turn_id = item.get("turn_id")
            is_valid, matched_turn_id, server_time = verify_quote_in_learner_turns(quote, turn_id, learner_turns)
            if is_valid:
                valid_evidence.append({
                    "turn_id": matched_turn_id,
                    "timestamp": server_time,
                    "speaker": "user",
                    "quote": quote,
                    "skill": item.get("skill", "general"),
                    "impact": item.get("impact", "Medium"),
                    "note": item.get("note", ""),
                })

    evidence = valid_evidence
    recovery = main.get("recovery") or {}
    vocab = main.get("vocab_recovery") or {}
    adaptation = main.get("adaptation_notes") or []
    recommended = main.get("recommended_focus") or []
    confidence = _clean_confidence(main.get("confidence"))
    summary = main.get("summary") or ""

    objective_met = _objective_met(objective_result)
    if isinstance(objective_result, dict):
        overall = objective_result.get("overall")
        _prepend_objective_evidence(
            evidence, overall if isinstance(overall, dict) else {"objective_met": objective_met}
        )

    breakdowns = _int(recovery.get("breakdowns"))
    recoveries = _int(recovery.get("recoveries"))
    gaps = _int(vocab.get("gaps"))
    preserved = _int(vocab.get("preserved"))

    readiness = compute_readiness(language, interaction)
    recovery_index = _guard_ratio(recoveries, breakdowns)
    vocab_recovery_index = _guard_ratio(preserved, gaps)
    intl_gap = None  # None until measured baseline exists

    coverage = {
        "assessed_dimensions": [k for k, v in {**language, **interaction}.items() if v is not None],
        "not_assessed_dimensions": [k for k, v in {**language, **interaction}.items() if v is None],
        "rubric_version": "core_v2.0",
    }

    transfer = {
        "adaptation_notes": adaptation,
        "recommended_focus": [str(f) for f in recommended],
        "summary": summary,
        "recovery": recovery,
        "vocab_recovery": vocab,
        "objective_met": objective_met,
    }

    evaluation = Evaluation(
        conversation_id=conversation_id,
        rubric_version="core_v2.0",
        language_scores_json=json.dumps(language),
        interaction_scores_json=json.dumps(interaction),
        evidence_json=json.dumps(evidence),
        transfer_json=json.dumps(transfer),
        coverage_json=json.dumps(coverage),
        readiness_score=readiness,
        recovery_index=recovery_index,
        vocab_recovery_index=vocab_recovery_index,
        intl_gap=intl_gap,
        confidence=confidence,
    )
    session.add(evaluation)
    await session.flush()
    return evaluation


# ---------------------------------------------------------------------------
# Autopsy
# ---------------------------------------------------------------------------

async def get_autopsy(session: AsyncSession, conversation_id: str) -> AutopsyOut:
    """Full autopsy: evaluation + timeline evidence + event resolutions."""
    evaluation = await evaluate_conversation(session, conversation_id)
    conv = await session.get(Conversation, conversation_id)
    if conv is not None:
        await session.refresh(conv, attribute_names=["events"])

    transfer = _jsonobj(evaluation.transfer_json)
    recommended = [str(f) for f in transfer.get("recommended_focus", [])]

    evidence = [_coerce_evidence(item) for item in (_jsonobj(evaluation.evidence_json) or [])]

    events = [
        {
            "event_type": e.event_type,
            "description": e.description,
            "trigger_turn": e.trigger_turn,
            "resolved": e.resolved,
            "resolution_turn": e.resolution_turn,
        }
        for e in (conv.events if conv else [])
    ]

    return AutopsyOut(
        conversation_id=conversation_id,
        evaluation=EvaluationOut(
            conversation_id=conversation_id,
            language_scores=_jsonobj(evaluation.language_scores_json),
            interaction_scores=_jsonobj(evaluation.interaction_scores_json),
            readiness_score=evaluation.readiness_score,
            recovery_index=evaluation.recovery_index,
            vocab_recovery_index=evaluation.vocab_recovery_index,
            intl_gap=evaluation.intl_gap,
            confidence=evaluation.confidence,
        ),
        evidence=evidence,
        events=events,
        recommended_focus=recommended,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _variation_for(environment: str) -> str | None:
    if environment == "international":
        return (
            "This is an international / Global-Ear context. Pay attention to "
            "comprehension, clarification requests, and register. Note any accent "
            "discomfort or recovery — without penalising the learner's own variety."
        )
    return None


def _clean_evidence(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "timestamp": str(item.get("timestamp", "")),
                "speaker": str(item.get("speaker", "user")),
                "quote": str(item.get("quote", "")),
                "skill": str(item.get("skill", "")),
                "impact": str(item.get("impact", "Medium")),
                "note": str(item.get("note", "")),
                "event_type": item.get("event_type"),
            }
        )
    return out


def _clean_confidence(value: Any) -> str:
    text = str(value or "").strip().upper()
    for known in _CONFIDENCE_VALUES:
        if text == known:
            return known
    return "MODERATE CONFIDENCE"


def _objective_met(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    overall = obj.get("overall") or {}
    return bool(overall.get("objective_met"))


def _prepend_objective_evidence(
    evidence: list[dict[str, Any]], overall: dict[str, Any]
) -> None:
    met = bool(overall.get("objective_met"))
    evidence.insert(
        0,
        {
            "timestamp": "",
            "speaker": "system",
            "quote": "(hidden objectives)",
            "skill": "goal_achievement",
            "impact": "High" if met else "Low",
            "note": overall.get("reason")
            or ("Hidden objectives met" if met else "Hidden objectives not met"),
            "event_type": None,
        },
    )


def _int(value: Any) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _jsonobj(raw: str) -> Any:
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}


def _coerce_evidence(item: dict[str, Any]) -> EvidenceItem:
    return EvidenceItem(
        timestamp=str(item.get("timestamp", "")),
        quote=str(item.get("quote", "")),
        skill=str(item.get("skill", "")),
        impact=str(item.get("impact", "Medium")),
        note=str(item.get("note", "")),
        event_type=item.get("event_type"),
    )