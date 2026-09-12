"""HTTP surface: health, scenario catalogue, recommendation."""

import pytest

from app.services.scenarios_data import BY_KEY


async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["configured"]["anthropic"] is False  # no keys in tests


async def test_scenario_catalogue(client):
    resp = await client.get("/api/scenarios")
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == len(BY_KEY)
    keys = {r["scenario_key"] for r in rows}
    assert {"introduce_classmate", "travel_immigration", "core_stress_test"} <= keys
    sample = next(r for r in rows if r["scenario_key"] == "travel_immigration")
    assert sample["environment"] == "travel"
    assert "purpose of your visit" not in sample["description"]  # description is the brief
    assert isinstance(sample["difficulty"], (int, float))


async def test_recommend_requires_no_keys(client):
    # Seed path runs without any provider key — recommendation is purely local.
    resp = await client.get("/api/scenarios/recommend")
    assert resp.status_code == 200
    body = resp.json()
    assert body["scenario_key"] in BY_KEY
    assert body["title"]
    assert body["reason"]


@pytest.mark.parametrize("path", ["/api/profile", "/api/progress/summary"])
async def test_profile_and_progress_bootstrap(client, path):
    resp = await client.get(path)
    assert resp.status_code == 200
    body = resp.json()
    assert body["sessions_completed"] == 0
    # /api/profile exposes readiness_score; /api/progress/summary exposes readiness.
    readiness = body.get("readiness", body.get("readiness_score"))
    assert readiness is not None and readiness >= 0