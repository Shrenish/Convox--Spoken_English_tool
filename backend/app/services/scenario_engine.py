"""Scenario engine: syncs scenario definitions into the DB and provides
retrieval. The controlled-event injection itself lives in conversation_engine.py;
this module is the persistence/scoping layer.
"""

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .exceptions import ScenarioNotFound
from .scenarios_data import BY_KEY

__all__ = ["sync_scenarios", "get_scenario_def", "BY_KEY"]


async def sync_scenarios(session: AsyncSession) -> None:
    """Upsert all scenario defs into the scenarios table. Idempotent."""
    from ..models import Scenario

    for key, defn in BY_KEY.items():
        existing = await session.scalar(
            select(Scenario).where(Scenario.scenario_key == key)
        )
        payload = {
            "title": defn.title,
            "environment": defn.environment,
            "objective": defn.objective,
            "difficulty": defn.difficulty,
            "partner": defn.partner,
            "category": defn.category,
            "stage_key": defn.stage_key,
            "events_json": json.dumps(defn.events_pool),
            "success_conditions_json": json.dumps(defn.success_conditions),
            "hidden_objectives_json": json.dumps(defn.hidden_objectives),
        }
        if existing:
            for field, value in payload.items():
                setattr(existing, field, value)
        else:
            session.add(Scenario(scenario_key=key, **payload))
    await session.flush()


async def get_scenario_def(session: AsyncSession, scenario_key: str):
    """Return the in-memory ScenarioDef, raising if unknown."""
    from .scenarios_data import BY_KEY as DEFS

    defn = DEFS.get(scenario_key)
    if defn is None:
        raise ScenarioNotFound(scenario_key)
    # Lazy-persist the row so the FK from conversations resolves.
    from ..models import Scenario

    row = await session.scalar(
        select(Scenario).where(Scenario.scenario_key == scenario_key)
    )
    if row is None:
        await sync_scenarios(session)
    return defn