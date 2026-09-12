"""Learner model — the personalized layer (PRD §26–§30).

Owns:
* skill dimension updates after each evaluated session (exponentially-weighted)
* common-errors accumulation from the evaluation's adaptation notes
* adaptive next-scenario recommendation (targets the weakest dimension)
* progress summary for the dashboard

All calculations are deterministic once the CORE evaluation exists; nothing here
calls an LLM.
"""

import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import Conversation, Evaluation, LearnerProfile, User
from ..schemas.evaluation import ProgressSummary, ProgressTrendPoint
from ..schemas.profile import LearnerProfileOut, ScenarioRecommendation
from .evaluation_engine import evaluate_conversation
from .scenarios_data import BY_KEY

# Weight on the *new* session when blending into the running profile.
# 0.4 → a single session moves the profile 40% of the way, typical for
# voice-training progress curves where recent behaviour should dominate.
_NEW_SESSION_WEIGHT = 0.4

_MAX_COMMON_ERRORS = 12

# Each CORE dimension maps to the core scenario that stresses it most. This is
# the adaptive difficulty engine (PRD §28): the next session targets the gap.
DIMENSION_SCENARIOS: dict[str, str] = {
    "fluency": "introduce_classmate",
    "grammar": "professor_clarification",
    "vocabulary": "explain_unknown_word",
    "pronunciation": "international_colleague_intro",
    "coherence": "professor_clarification",
    "listening_response": "ask_directions",
    "clarification": "professor_clarification",
    "repair": "recover_misunderstanding",
    "turn_management": "introduce_classmate",
    "adaptability": "core_unexpected_change",
    "register_switching": "core_register_switch",
    "goal_achievement": "project_disagreement",
    "pressure_handling": "opinion_time_pressure",
    "vocab_recovery": "explain_unknown_word",
}

_CANONICAL_DIMS = tuple(DIMENSION_SCENARIOS.keys())


# ---------------------------------------------------------------------------
# Profile persistence
# ---------------------------------------------------------------------------

async def get_or_create_profile(session: AsyncSession, user_id: str) -> LearnerProfile:
    profile = await session.scalar(
        select(LearnerProfile).where(LearnerProfile.user_id == user_id)
    )
    if profile is None:
        profile = LearnerProfile(user_id=user_id, readiness_score=5.0)
        session.add(profile)
        await session.flush()
    return profile


async def apply_evaluation(
    session: AsyncSession, conversation_id: str
) -> LearnerProfile:
    """Fold one evaluated conversation into the learner profile. Idempotent: a
    conversation is applied at most once (guarded in the user's preferences)."""
    evaluation = await evaluate_conversation(session, conversation_id)
    conv = await session.get(Conversation, conversation_id)
    if not conv:
        return await get_or_create_profile(session, getattr(evaluation, "user_id", "") or "local-user")

    user = await session.get(User, conv.user_id)
    if not user:
        user = await session.scalar(select(User).where(User.id == conv.user_id))
    if not user:
        return await get_or_create_profile(session, conv.user_id)

    prefs = dict(user.preferences)
    applied = list(prefs.get("applied_eval_convos") or [])
    if conversation_id in applied:
        return await get_or_create_profile(session, conv.user_id)

    profile = await get_or_create_profile(session, conv.user_id)
    merged = {**(_jsonobj(evaluation.language_scores_json)), **(_jsonobj(evaluation.interaction_scores_json))}

    updated: dict[str, float] = dict(profile.skill_dims)
    for dim, score in merged.items():
        previous = updated.get(dim)
        if previous is None:
            updated[dim] = float(score)
        else:
            updated[dim] = round(
                _NEW_SESSION_WEIGHT * float(score)
                + (1 - _NEW_SESSION_WEIGHT) * float(previous),
                1,
            )
    profile.set_skill_dims(updated)

    profile.readiness_score = round(
        _NEW_SESSION_WEIGHT * evaluation.readiness_score
        + (1 - _NEW_SESSION_WEIGHT) * profile.readiness_score,
        1,
    )
    profile.sessions_completed = (profile.sessions_completed or 0) + 1

    # Common errors from adaptation notes, deduped by pattern. Copy to a local
    # list first — the JSON property re-parses from the column on every access,
    # so mutating it directly would silently drop the new entries.
    transfer = _jsonobj(evaluation.transfer_json)
    errors = list(profile.common_errors)
    for note in (transfer.get("adaptation_notes") or []):
        if not isinstance(note, dict):
            continue
        pattern = str(note.get("indian_pattern", "")).strip()
        if not pattern:
            continue
        entry = {
            "pattern": pattern,
            "fix": str(note.get("international_alternative", "") or ""),
            "context": str(note.get("context", "") or ""),
        }
        existing = [e for e in errors if e.get("pattern") == pattern]
        if existing:
            existing[0].update(entry)
        else:
            errors.append(entry)
    if len(errors) > _MAX_COMMON_ERRORS:
        errors = errors[-_MAX_COMMON_ERRORS:]
    profile.set_common_errors(errors)

    # Recovery profile for the breakdown/repair view.
    recovery = transfer.get("recovery") or {}
    profile.recovery_profile_json = json.dumps(
        {
            "repair_rate": evaluation.recovery_index,
            "avg_recovery_time_sec": recovery.get("avg_recovery_time_sec"),
        }
    )

    profile.updated_at = datetime.now(timezone.utc)

    applied.append(conversation_id)
    prefs["applied_eval_convos"] = applied
    user.set_preferences(prefs)
    await session.flush()
    return profile


# ---------------------------------------------------------------------------
# Adaptive recommendation
# ---------------------------------------------------------------------------

async def recommend_next_scenario(session: AsyncSession, user_id: str) -> ScenarioRecommendation:
    """Pick the scenario that stresses the learner's weakest measured dimension."""
    profile = await get_or_create_profile(session, user_id)
    dims = profile.skill_dims

    def score_of(dim: str) -> float:
        value = dims.get(dim)
        return float(value) if isinstance(value, (int, float)) else 5.0

    weakest = min(_CANONICAL_DIMS, key=score_of)
    key = DIMENSION_SCENARIOS[weakest]

    # Avoid back-to-back repeats of the same scenario when possible.
    user = await session.get(User, user_id)
    if user is not None:
        last = (user.preferences or {}).get("last_recommended")
        if last == key:
            candidates = [k for k in DIMENSION_SCENARIOS.values() if k != key]
            if candidates:
                key = candidates[0]

    defn = BY_KEY.get(key) or BY_KEY["introduce_classmate"]
    if user is not None:
        prefs = dict(user.preferences)
        prefs["last_recommended"] = key
        user.set_preferences(prefs)
        await session.flush()

    weakest_value = score_of(weakest)
    reason = (
        f"Your weakest CORE dimension is **{_dim_label(weakest)}** "
        f"(score {weakest_value:.1f}/10). This scenario strains exactly that — "
        f"{defn.objective.replace('_', ' ')}."
    )
    return ScenarioRecommendation(
        scenario_key=defn.key,
        title=defn.title,
        reason=reason,
        difficulty=defn.difficulty,
        estimated_minutes=4,
    )


# ---------------------------------------------------------------------------
# Progress dashboard
# ---------------------------------------------------------------------------

async def get_progress_summary(session: AsyncSession, user_id: str) -> ProgressSummary:
    profile = await get_or_create_profile(session, user_id)
    dims = profile.skill_dims

    language = {d: float(v) for d, v in dims.items() if d in _LANG_SET}
    interaction = {d: float(v) for d, v in dims.items() if d in _INTL_SET}

    rows = (
        await session.execute(
            select(Evaluation)
            .order_by(Evaluation.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    trend = [
        ProgressTrendPoint(
            label=e.created_at.strftime("%b %d") if e.created_at else "session",
            readiness=e.readiness_score,
            recovery=e.recovery_index,
            intl_gap=e.intl_gap,
        )
        for e in reversed(rows)
    ]

    measured = {d: float(v) for d, v in dims.items() if isinstance(v, (int, float))}
    weakest = sorted(measured, key=measured.get)[:3] if measured else _CANONICAL_DIMS[:3]

    recovery_profile = _jsonobj(profile.recovery_profile_json)
    return ProgressSummary(
        readiness=profile.readiness_score,
        language_scores=language,
        interaction_scores=interaction,
        recovery_index=float(recovery_profile.get("repair_rate", 0.0)),
        intl_gap=profile.intl_gap,
        sessions_completed=profile.sessions_completed,
        trend=trend,
        weakest_dimensions=list(weakest),
        recommended_focus=", ".join(f"Work on **{_dim_label(d)}**" for d in weakest),
    )


async def get_profile_out(session: AsyncSession, user_id: str) -> LearnerProfileOut:
    profile = await get_or_create_profile(session, user_id)
    user = await session.get(User, user_id)
    return LearnerProfileOut(
        user_id=user_id,
        display_name=(user.display_name if user else "Learner"),
        skill_dims=profile.skill_dims,
        interests=profile.interests,
        mentor_prefs=profile.mentor_prefs,
        common_errors=profile.common_errors,
        readiness_score=profile.readiness_score,
        intl_gap=profile.intl_gap,
        sessions_completed=profile.sessions_completed,
    )


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

_LANG_SET = {"fluency", "grammar", "vocabulary", "pronunciation", "coherence"}
_INTL_SET = set(_CANONICAL_DIMS) - _LANG_SET

_DIM_LABELS = {
    "fluency": "Fluency",
    "grammar": "Grammar",
    "vocabulary": "Vocabulary",
    "pronunciation": "Pronunciation",
    "coherence": "Coherence",
    "listening_response": "Listening & Response",
    "clarification": "Clarification",
    "repair": "Repair",
    "turn_management": "Turn Management",
    "adaptability": "Adaptability",
    "register_switching": "Register Switching",
    "goal_achievement": "Goal Achievement",
    "pressure_handling": "Pressure Handling",
    "vocab_recovery": "Vocab Recovery",
}


def _dim_label(dim: str) -> str:
    return _DIM_LABELS.get(dim, dim.replace("_", " ").title())


def _jsonobj(raw: str):
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}