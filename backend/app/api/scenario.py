"""Scenario API — catalogue + adaptive recommendation."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas import ScenarioOut, ScenarioRecommendation
from ..services.learner_model import recommend_next_scenario
from ..services.scenarios_data import BY_KEY, ScenarioDef
from ..services.users import DEFAULT_USER_ID

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


def _to_out(defn: ScenarioDef) -> ScenarioOut:
    return ScenarioOut(
        scenario_key=defn.key,
        title=defn.title,
        environment=defn.environment,
        objective=defn.objective,
        difficulty=defn.difficulty,
        partner=defn.partner,
        category=defn.category,
        stage_key=defn.stage_key,
        events_pool=list(defn.events_pool),
        success_conditions=list(defn.success_conditions),
        hidden_objectives=list(defn.hidden_objectives),
        description=defn.context,
    )


@router.get("", response_model=list[ScenarioOut])
async def list_scenarios() -> list[ScenarioOut]:
    """Every scenario catalogue entry (core + core_test + travel)."""
    return [_to_out(d) for d in BY_KEY.values()]


@router.get("/recommend", response_model=ScenarioRecommendation)
async def recommend(
    session: AsyncSession = Depends(get_session),
) -> ScenarioRecommendation:
    """Adaptive next-scenario pick targeting the learner's weakest dimension."""
    result = await recommend_next_scenario(session, DEFAULT_USER_ID)
    await session.commit()
    return result