"""Professional Gamification & Executive Persona Service for CONVOX.

Combines executive workplace milestones, tiered credential badges,
and adaptive AI Executive Personas that evolve with learner goals.
"""

from typing import Any
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Badge & Tier Definitions
# ---------------------------------------------------------------------------

class AchievementBadge(BaseModel):
    id: str
    title: str
    tier: str  # Bronze, Silver, Gold, Platinum
    category: str  # "Milestone", "Accuracy", "Survival", "Executive"
    description: str
    icon: str
    unlocked: bool
    unlocked_at: str | None = None
    progress: float = 0.0  # 0.0 to 1.0


class ExecutivePersona(BaseModel):
    id: str
    name: str
    title: str
    role: str
    avatar_color: str
    voice_description: str
    coaching_style: str
    unlocked: bool
    requirement: str
    recommended_scenario: str


class GamificationState(BaseModel):
    xp: int
    executive_level: int
    title: str
    streak_days: int
    next_level_xp: int
    badges: list[AchievementBadge]
    personas: list[ExecutivePersona]
    recent_rewards: list[str] = Field(default_factory=list)


ALL_PERSONAS: list[dict[str, Any]] = [
    {
        "id": "mentor_priya",
        "name": "Dr. Priya Roy",
        "title": "Global Communications Architect",
        "role": "Executive Onboarding Mentor",
        "avatar_color": "#5b8cff",
        "voice_description": "Empathetic, structured, constructive Indian-International English",
        "coaching_style": "Focuses on clarity, confidence recovery, and structured thought framing.",
        "min_level": 1,
        "requirement": "Available from Baseline",
        "recommended_scenario": "introduce_classmate",
    },
    {
        "id": "director_marcus",
        "name": "Marcus Vance",
        "title": "VP of Global Product Strategy",
        "role": "High-Stakes Stakeholder",
        "avatar_color": "#ffb454",
        "voice_description": "Direct, time-conscious, pragmatic American executive English",
        "coaching_style": "Challenges ambiguity, pushes for concise bottom-line recommendations.",
        "min_level": 2,
        "requirement": "Complete 1 session or achieve Readiness 5.5+",
        "recommended_scenario": "opinion_time_pressure",
    },
    {
        "id": "consul_elena",
        "name": "Elena Rostova",
        "title": "International Relations Director",
        "role": "Diplomatic & Travel Specialist",
        "avatar_color": "#3dd68c",
        "voice_description": "Diplomatic, articulate, multi-cultural British & European cadence",
        "coaching_style": "Assesses adaptability, polite boundary negotiation, and cross-cultural nuance.",
        "min_level": 3,
        "requirement": "Complete 3 sessions or unlock Global Survival stage",
        "recommended_scenario": "travel_immigration",
    },
    {
        "id": "chair_alister",
        "name": "Alister Montgomery",
        "title": "Board Chairman & Investor",
        "role": "Executive Boardroom Inquisitor",
        "avatar_color": "#ff6b8b",
        "voice_description": "Formal, analytical, probing questions under pressure",
        "coaching_style": "Tests argument defense, rebuttal handling, and strategic composure.",
        "min_level": 4,
        "requirement": "Reach Readiness 7.0+ or complete 5 sessions",
        "recommended_scenario": "project_disagreement",
    },
]


def calculate_gamification_state(
    sessions_completed: int,
    readiness_score: float,
    recovery_index: float,
    travel_stages_completed: int = 0,
) -> GamificationState:
    """Calculate professional badges, executive levels, and unlocked personas."""
    # XP calculation: base per session + readiness bonus
    base_xp = sessions_completed * 250
    readiness_bonus = int(readiness_score * 80)
    travel_bonus = travel_stages_completed * 300
    total_xp = base_xp + readiness_bonus + travel_bonus

    # Executive Level mapping
    if total_xp < 300:
        level = 1
        level_title = "Associate Communicator"
        next_xp = 300
    elif total_xp < 800:
        level = 2
        level_title = "Senior Professional"
        next_xp = 800
    elif total_xp < 1600:
        level = 3
        level_title = "Global Project Lead"
        next_xp = 1600
    elif total_xp < 2600:
        level = 4
        level_title = "Executive Strategist"
        next_xp = 2600
    else:
        level = 5
        level_title = "Master Diplomat & Keynote Speaker"
        next_xp = 4000

    # Badges with progress
    badges: list[AchievementBadge] = [
        AchievementBadge(
            id="first_step",
            title="First Contact",
            tier="Bronze",
            category="Milestone",
            description="Complete your first live conversational session.",
            icon="🎯",
            unlocked=sessions_completed >= 1,
            progress=min(1.0, sessions_completed / 1.0),
        ),
        AchievementBadge(
            id="clarity_adept",
            title="Strategic Articulator",
            tier="Silver",
            category="Accuracy",
            description="Achieve an overall communication readiness of 6.0 or higher.",
            icon="💎",
            unlocked=readiness_score >= 6.0,
            progress=min(1.0, readiness_score / 6.0),
        ),
        AchievementBadge(
            id="resilience_shield",
            title="Composure Under Fire",
            tier="Silver",
            category="Executive",
            description="Demonstrate a recovery index above 0.60 when interrupted or challenged.",
            icon="🛡️",
            unlocked=recovery_index >= 0.60 or sessions_completed >= 2,
            progress=min(1.0, max(recovery_index / 0.60, sessions_completed / 2.0)),
        ),
        AchievementBadge(
            id="global_traveler",
            title="Global Survivalist",
            tier="Gold",
            category="Survival",
            description="Successfully complete at least 2 Global Survival stages.",
            icon="✈️",
            unlocked=travel_stages_completed >= 2,
            progress=min(1.0, travel_stages_completed / 2.0),
        ),
        AchievementBadge(
            id="executive_presence",
            title="Boardroom Presence",
            tier="Platinum",
            category="Executive",
            description="Reach Readiness score 7.5+ and 4+ completed sessions.",
            icon="👑",
            unlocked=readiness_score >= 7.5 and sessions_completed >= 4,
            progress=min(1.0, ((readiness_score / 7.5) + (sessions_completed / 4.0)) / 2.0),
        ),
    ]

    # Personas unlocking
    personas: list[ExecutivePersona] = []
    for p in ALL_PERSONAS:
        unlocked = False
        if p["min_level"] == 1:
            unlocked = True
        elif p["min_level"] == 2:
            unlocked = sessions_completed >= 1 or readiness_score >= 5.5
        elif p["min_level"] == 3:
            unlocked = sessions_completed >= 3 or travel_stages_completed >= 1
        elif p["min_level"] == 4:
            unlocked = sessions_completed >= 5 or readiness_score >= 7.0

        personas.append(
            ExecutivePersona(
                id=p["id"],
                name=p["name"],
                title=p["title"],
                role=p["role"],
                avatar_color=p["avatar_color"],
                voice_description=p["voice_description"],
                coaching_style=p["coaching_style"],
                unlocked=unlocked,
                requirement=p["requirement"],
                recommended_scenario=p["recommended_scenario"],
            )
        )

    # Determine recent milestone rewards
    recent_rewards = []
    if sessions_completed >= 1:
        recent_rewards.append("Unlocked: Strategic Articulator Badge Challenge")
    if level >= 2:
        recent_rewards.append("Promoted to Senior Professional Tier")
    if any(p.unlocked and p.id == "director_marcus" for p in personas):
        recent_rewards.append("Unlocked Executive Persona: Marcus Vance (VP Global Product)")

    return GamificationState(
        xp=total_xp,
        executive_level=level,
        title=level_title,
        streak_days=max(1, min(7, sessions_completed + 1)),
        next_level_xp=next_xp,
        badges=badges,
        personas=personas,
        recent_rewards=recent_rewards,
    )
