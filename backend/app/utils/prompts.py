"""Prompt construction for the conversation channel.

Every helper here builds a system prompt for the conversation model. The design
goal (PRD §13–§15): the persona and scenario state are controlled; the LLM only
fills in natural language inside that controlled envelope.

The output contract asks the model for a JSON envelope so the engine can parse
structured attributes (event injected, force_listen, turn_done) without fragile
string parsing. JSON is requested but not guaranteed; the engine has a fallback.
"""

import json
from typing import Any

# ---------------------------------------------------------------------------
# Personas (PRD §13)
# ---------------------------------------------------------------------------

PERSONAS: dict[str, dict[str, str]] = {
    "friend": {
        "name": "Friend",
        "voice": "Relaxed, curious, casual, warm. Short sentences, everyday words.",
        "formality": "casual",
        "speed": "normal",
    },
    "professor": {
        "name": "Professor",
        "voice": "Formal, academic, precise. Uses structured language and probing questions.",
        "formality": "formal",
        "speed": "steady",
    },
    "interviewer": {
        "name": "Recruiter",
        "voice": "Professional, structured, evaluative. Asks behavioral and situational questions.",
        "formality": "formal",
        "speed": "professional",
    },
    "colleague": {
        "name": "Colleague",
        "voice": "Professional but conversational. Warm, collaborative, task-focused.",
        "formality": "semi-formal",
        "speed": "normal",
    },
    "difficult_teammate": {
        "name": "Difficult Teammate",
        "voice": "Skeptical, occasionally disagreeable, but never cruel or mocking. Challenges the learner's reasoning.",
        "formality": "semi-formal",
        "speed": "normal",
    },
    "travel_companion": {
        "name": "Travel Companion",
        "voice": "Casual, exploratory, a little excited. Practical and helpful.",
        "formality": "casual",
        "speed": "normal",
    },
    "mentor": {
        "name": "Mentor",
        "voice": "Supportive initially, progressively more challenging. Encourages and guides.",
        "formality": "semi-formal",
        "speed": "steady",
    },
    "international_colleague": {
        "name": "International Colleague",
        "voice": "Uses a variety of international English. Speaks clearly but at a natural pace, and expects the learner to ask for clarification when needed.",
        "formality": "semi-formal",
        "speed": "slightly faster",
    },
}

# ---------------------------------------------------------------------------
# Controlled events (PRD §10, §14, §16)
# ---------------------------------------------------------------------------

EVENT_PROMPTS: dict[str, str] = {
    "misunderstanding": (
        "INTRODUCE a controlled misunderstanding: act as though you heard something "
        "slightly different from what the speaker actually said. Misinterpret one "
        "specific point. The learner should notice and correct you. Do not restate "
        "their words verbatim — twist the meaning subtly."
    ),
    "disagreement": (
        "INTRODUCE a respectful disagreement: push back on the learner's suggestion "
        "or opinion with a reasonable alternative. Believe what you say; do not "
        "mock them. The learner should defend their position or negotiate."
    ),
    "time_pressure": (
        "INTRODUCE time pressure: mention that you are short on time and need a "
        "quick, clear answer. Keep the urgency natural, not panicky. The learner "
        "should prioritize being concise and decisive."
    ),
    "topic_shift": (
        "INTRODUCE a topic shift: change the subject smoothly, as people do in real "
        "conversation. The learner should follow the change without losing the thread."
    ),
    "vocabulary_gap": (
        "INTRODUCE a vocabulary gap scenario: use or mention a word or concept the "
        "learner likely does not know, in a natural way. If they seem to not know it, "
        "do not explain immediately — see if they can work around it, paraphrase, "
        "or ask meaning. This tests vocabulary resilience."
    ),
    "interruption": (
        "INTRODUCE an interruption: gently cut off the learner once mid-sentence "
        "(do not let them finish), redirect, and then invite them to continue. "
        "The learner should handle being interrupted gracefully."
    ),
    "unfamiliar_context": (
        "INTRODUCE an unfamiliar context: bring up a topic or situation the learner "
        "could not have prepared for. This tests adaptability. Keep it plausible "
        "for the scenario."
    ),
    "new_information": (
        "INTRODUCE a change of circumstances: reveal new information that changes "
        "the situation (e.g., 'Actually, the presentation topic has already been "
        "assigned.'). The learner should adapt while preserving the goal."
    ),
}

# ---------------------------------------------------------------------------
# Base conversation system prompt
# ---------------------------------------------------------------------------

BASE_SAFETY = (
    "Never mock the learner, shame them, or imply their accent or English is inferior. "
    "Indian English is a valid form of English. Be kind, patient, and constructive. "
    "The goal is communication, not perfection."
)


def build_conversation_system_prompt(
    *,
    persona: str = "mentor",
    scenario_title: str,
    environment: str,
    objective: str,
    partner_name: str,
    scenario_context: str,
    events_remaining: list[str],
    accent: str | None = None,
) -> str:
    """Build the system prompt for a single conversation.

    `accent` is used by Global Ear Training to vary how the AI sounds; the
    conversation channel can't change audio, but we can ask for a slightly
    different lexical/rhythm pattern to emulate a variety.
    """
    persona_def = PERSONAS.get(persona, PERSONAS["mentor"])
    event_instructions = (
        "\n".join(EVENT_PROMPTS.get(e, e) for e in events_remaining)
        if events_remaining
        else "No scripted events remain; continue the conversation naturally."
    )

    accent_line = ""
    if accent:
        accent_line = (
            f"\nACCENT VARIATION: Speak with a detectable {accent} English "
            "rhythm and vocabulary. The learner is training their ear. Keep it "
            "intelligible but naturally accented."
        )

    return f"""
You are a voice conversation partner in CONVOX, a communication simulator.

PERSONA: name="{persona_def['name']}", {persona_def['voice']}
FORMALITY: {persona_def['formality']}
SPEAKING SPEED: {persona_def['speed']}

SCENARIO: {scenario_title}
ENVIRONMENT: {environment}
YOUR ROLE: {partner_name}
LEARNER OBJECTIVE (do not state it directly): {objective}
CONTEXT: {scenario_context}

CONTROLLED EVENTS SCHEDULED FOR THIS CONVERSATION (NO OTHERS):
{event_instructions}
{accent_line}

CONVERSATION RULES:
1. Speak naturally in full sentences — this is a voice conversation. Never output
   markdown, bullet lists, or stage directions.
2. Keep turns SHORT (1–3 sentences) unless the scenario demands more.
3. Do not state the learner's objective back to them. Do not lecture about what
   you are testing. Just be the person.
4. When a controlled event fires, deliver it naturally as part of the conversation.
5. If the learner asks for clarification or recovers from an event, accept it and
   move on. Reward recovery by continuing naturally.
6. If the learner says something unsafe, hurtful, or dangerous, respond firmly but
   calmly, decline to continue that topic, and steer back to the scenario.
7. Never claim a score, evaluation, or 'you passed/failed' during the conversation.
   Evaluation happens after the session.

{BASE_SAFETY}

OUTPUT CONTRACT — respond with a JSON object:
{{
  "reply": "your spoken turn, 1-3 sentences",
  "event_fired": null | "misunderstanding" | "disagreement" | "time_pressure" |
                 "topic_shift" | "vocabulary_gap" | "interruption" |
                 "unfamiliar_context" | "new_information",
  "force_listen": false,
  "conversation_done": false,
  "goal_met": false,
  "note": null | "brief internal note on learner behavior you observed"
}}
Rules:
- "event_fired" must be null unless you are executing the scheduled event THIS turn.
- "force_listen": true if you asked a direct question that needs an answer.
- "goal_met": true only when the learner has demonstrably achieved the scenario
  objective (e.g. reached agreement, got the information, resolved the issue).
- "conversation_done": true when the scenario has reached a natural conclusion.
- The "reply" is what the learner hears. Everything else is metadata.
"""


# ---------------------------------------------------------------------------
# Hidden objectives evaluator (PRD §19)
# ---------------------------------------------------------------------------

def build_objectives_eval_prompt(
    *,
    objective: str,
    success_conditions: list[str],
    hidden_objectives: list[str],
    transcript: list[dict[str, str]],  # [{"speaker": "ai"/"user", "text": ...}, ...]
) -> str:
    """Ask the evaluation model to judge whether hidden objectives were met."""
    t_lines = "\n".join(
        f"{t['speaker'].upper()}: {t['text']}" for t in transcript
    )
    return f"""
You are the CORE evaluation engine. Score whether the learner met each condition,
based ONLY on the transcript below. Be strict but fair.

SCENARIO OBJECTIVE: {objective}
SUCCESS CONDITIONS: {json.dumps(success_conditions)}
HIDDEN OBJECTIVES: {json.dumps(hidden_objectives)}

TRANSCRIPT:
{t_lines}

Respond with JSON:
{{
  "condition_scores": {{
     "condition_or_objective_name": {{"met": true/false, "evidence": "quoted words from the learner", "confidence": "high/moderate/low"}}
  }},
  "overall": {{"objective_met": true/false, "reason": "one sentence"}}
}}
Only count a condition met if the learner's own words demonstrate it. Do not credit the AI.
"""


# ---------------------------------------------------------------------------
# CORE conversation evaluator (PRD §17, §52)
# ---------------------------------------------------------------------------

CORE_DIMENSIONS = [
    # Language competence
    "fluency",
    "grammar",
    "vocabulary",
    "pronunciation",
    "coherence",
    # Interaction competence
    "listening_response",
    "clarification",
    "repair",
    "turn_management",
    "adaptability",
    "register_switching",
    "goal_achievement",
    "pressure_handling",
    "vocab_recovery",
]

DIMENSION_PROMPTS: dict[str, str] = {
    "fluency": "speech flow, rate, pauses, disfluency, continuity",
    "grammar": "accuracy, repeated grammatical patterns, error impact on meaning",
    "vocabulary": "range, precision, word retrieval, contextual use",
    "pronunciation": "intelligibility, stress, rhythm, problem sounds, prosody (judge from transcript patterns as a proxy)",
    "coherence": "organization, logical progression, response structure",
    "listening_response": "Did the learner actually answer what was asked? Listening-response alignment.",
    "clarification": "Asking when they do not understand",
    "repair": "Fixing misunderstandings and communication breakdowns",
    "turn_management": "Entering, maintaining, and releasing conversational turns gracefully",
    "adaptability": "Reacting well to changing topics, circumstances, and pressure",
    "register_switching": "Adjusting formality/politeness/directness to the person and situation",
    "goal_achievement": "Actually accomplishing the communication objective",
    "pressure_handling": "Communicating under time or social pressure",
    "vocab_recovery": "Continuing to communicate when a needed word is not available (paraphrase, explanation)",
}

# Indian-English patterns to note contextually (PRD §28), NOT to penalize.
INDIC_PATTERNS: list[str] = [
    '"I have a doubt" instead of "I have a question"',
    '"Yesterday only" / "today only" for emphasis',
    '"Do the needful"',
    '"Tell me one thing"',
    '"Actually" used as a filler',
    '"Please revert" instead of "please reply"',
    'Reported/repetition of subject ("My brother he is...")',
    '"What to do" / "How to do" constructions',
]


def build_evaluation_prompt(
    *,
    scenario_title: str,
    objective: str,
    partner: str,
    environment: str,
    transcript: list[dict[str, str]],
    injected_events: list[dict[str, Any]],
    prompt_variation: str | None = None,  # e.g. an internationalization angle
) -> str:
    """Build the CORE scoring prompt. Evidence-driven: every score needs a quote."""
    t_lines = "\n".join(
        f"{t['speaker'].upper()}: {t['text']}" for t in transcript
    )
    events_desc = "\n".join(
        f"- {e.get('event_type')} (turn {e.get('trigger_turn')}): {e.get('description', '')}"
        for e in injected_events
    ) or "- none"

    dims_block = "\n".join(
        f'  "{d}": {DIMENSION_PROMPTS[d]}' for d in CORE_DIMENSIONS
    )
    var_line = (
        f"\nEVALUATION ANGLE: {prompt_variation}" if prompt_variation else ""
    )

    return f"""
You are the CORE evaluation engine for CONVOX — Conversational Operational Readiness Evaluation.
Your job: produce an evidence-based interaction diagnosis from a real conversation transcript.

SCENARIO: {scenario_title}
ENVIRONMENT: {environment}
PARTNER: {partner}
OBJECTIVE: {objective}
CONTROLLED EVENTS INJECTED: {events_desc}
{var_line}

TRANSCRIPT:
{t_lines}

SCORE EACH DIMENSION 0.0–10.0 using THESE definitions:
{dims_block}

SCORING POLICY:
1. Every dimension score MUST have at least one piece of quoted evidence from the
   transcript. Never give a number without a quote.
2. Pronunciation cannot be fully judged from text. If the transcript gives no
   evidence, score it None and set confidence accordingly.
3. Indian English is valid English. Note contextually useful alternatives WITHOUT
   penalizing the learner (PRD Principle 3). See INDIC considerations.
4. If a dimension could not be assessed (e.g. no applicable turns, poor audio),
   return null for it — never fabricate a number.
5. Identify the learner's 3 weakest dimensions and the highest-impact 2.

INDIC PATTERNS (do not count as errors; flag as adaptation opportunities):
{', '.join(INDIC_PATTERNS)}

Respond with STRICT JSON (no markdown, no prose):
{{
  "language_scores": {{
    "fluency": <float|null>,
    "grammar": <float|null>,
    "vocabulary": <float|null>,
    "pronunciation": <float|null>,
    "coherence": <float|null>
  }},
  "interaction_scores": {{
    "listening_response": <float|null>,
    "clarification": <float|null>,
    "repair": <float|null>,
    "turn_management": <float|null>,
    "adaptability": <float|null>,
    "register_switching": <float|null>,
    "goal_achievement": <float|null>,
    "pressure_handling": <float|null>,
    "vocab_recovery": <float|null>
  }},
  "evidence": [
    {{
      "timestamp": "MM:SS in conversation",
      "speaker": "user" | "ai",
      "quote": "exact words from transcript",
      "skill": "dimension name",
      "impact": "Low" | "Medium" | "High",
      "note": "what this shows"
    }}
  ],
  "recovery": {{
    "breakdowns": <count of communication breakdowns>,
    "recoveries": <count successfully recovered>,
    "avg_recovery_time_sec": <float|null>
  }},
  "vocab_recovery": {{
    "gaps": <int>,
    "preserved": <int>,
    "note": "explanation"
  }},
  "adaptation_notes": [
    {{"indian_pattern": "phrase", "context": "where heard", "international_alternative": "suggestion"}}
  ],
  "recommended_focus": ["skill_1", "skill_2", "skill_3"],
  "confidence": "HIGH CONFIDENCE" | "MODERATE CONFIDENCE" | "LOW CONFIDENCE" | "UNABLE TO ASSESS",
  "summary": "2-3 sentence overall diagnosis"
}}
"""


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

def parse_json_or_fallback(raw: str) -> dict | None:
    """Parse model JSON output robustly; returns None on failure."""
    if not raw:
        return None
    text = raw.strip()
    # Strip markdown fences if present.
    if text.startswith("```"):
        text = text.strip("`")
        # handle "```json" header
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find the first '{' to last '}'.
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return None
        return None