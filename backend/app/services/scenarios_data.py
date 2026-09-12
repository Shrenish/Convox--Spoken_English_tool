"""Scenario definitions — the content backbone of CONVOX.

Each scenario is a *controlled template* (PRD §15): the LLM generates the words,
but the objective, events, difficulty and success conditions stay fixed so
assessment stays reproducible.

Structured as simple typed dataclasses defined in code (single source of truth)
and synced into the `scenarios` table at startup.
"""

from dataclasses import dataclass, field


@dataclass
class ScenarioDef:
    key: str
    title: str
    environment: str          # college / workplace / travel / international
    objective: str
    partner: str
    difficulty: float         # 1..10
    context: str              # situation brief given to the AI partner
    partner_name: str         # e.g. "Riya, your teammate"
    persona: str              # one of PERSONAS keys
    events_pool: list[str] = field(default_factory=list)
    success_conditions: list[str] = field(default_factory=list)
    hidden_objectives: list[str] = field(default_factory=list)
    opening_line: str = ""    # the AI's first line when session starts
    category: str = "core"
    stage_key: str | None = None  # for travel stages
    accent: str | None = None     # global ear training


# ---------------------------------------------------------------------------
# Core MVP scenarios (PRD §64)
# ---------------------------------------------------------------------------

CORE_SCENARIOS: list[ScenarioDef] = [
    ScenarioDef(
        key="introduce_classmate",
        title="Meet a New Classmate",
        environment="college",
        objective="introduce_yourself_and_find_common_ground",
        partner="classmate",
        partner_name="Aarav, a classmate you just met",
        persona="friend",
        difficulty=3,
        context=(
            "It's the first week of college. You just sat beside Aarav in a lecture "
            "and he has started a casual conversation. Be yourself — friendly and natural."
        ),
        events_pool=["time_pressure"],
        success_conditions=["introduce_name", "ask_a_question", "respond_naturally"],
        hidden_objectives=[
            "ask a follow-up question",
            "keep the conversation going for at least 3 exchanges",
        ],
        opening_line="Hey, you're in the Computer Science section too, right? I don't think we've met — I'm Aarav.",
    ),
    ScenarioDef(
        key="professor_clarification",
        title="Ask a Professor for Clarification",
        environment="college",
        objective="clarify_a_confusing_assignment",
        partner="professor",
        partner_name="Dr. Mehta, your professor",
        persona="professor",
        difficulty=5,
        context=(
            "Dr. Mehta just assigned a project. You didn't fully understand the "
            "submission format and the deadline. You meet them after class to ask."
        ),
        events_pool=["vocabulary_gap"],
        success_conditions=["ask_for_clarification", "confirm_understanding", "thank_professor"],
        hidden_objectives=[
            "ask a specific clarifying question",
            "repeat the answer back to confirm you understood",
        ],
        opening_line="Yes? I'm on my way to a meeting, but I can spare a moment. You had a question about the assignment?",
    ),
    ScenarioDef(
        key="project_disagreement",
        title="Resolve a Project Disagreement",
        environment="college",
        objective="agree_on_task_distribution",
        partner="teammate",
        partner_name="Sameer, your project teammate",
        persona="difficult_teammate",
        difficulty=6,
        context=(
            "You and Sameer are splitting the work for a group project. He wants you "
            "to take more of the work than is fair, and he's pushing back on your plan."
        ),
        events_pool=["misunderstanding", "disagreement"],
        success_conditions=["state_position", "propose_solution", "reach_agreement"],
        hidden_objectives=[
            "express your preference clearly",
            "handle one disagreement without backing down completely",
        ],
        opening_line="Look, I think I already do more than my share. If we split it how you said, I'm doing the whole backend. That's not fair.",
    ),
    ScenarioDef(
        key="placement_interview",
        title="Placement Interview",
        environment="workplace",
        objective="answer_interview_questions_confidently",
        partner="interviewer",
        partner_name="Ms. Kapoor, the recruiter",
        persona="interviewer",
        difficulty=6,
        context=(
            "A campus placement interview for a software engineer role. The recruiter "
            "is professional and wants to see how you think on your feet."
        ),
        events_pool=["unfamiliar_context", "time_pressure"],
        success_conditions=["answer_question", "give_example", "stay_composed"],
        hidden_objectives=[
            "structure an answer (point–reason–example)",
            "handle one unexpected question",
        ],
        opening_line="Good morning. Thank you for coming in. So — tell me about yourself and why you're applying for this role.",
    ),
    ScenarioDef(
        key="hotel_reception",
        title="Check-in at a Hotel",
        environment="travel",
        objective="check_in_successfully",
        partner="receptionist",
        partner_name="a hotel receptionist",
        persona="travel_companion",
        difficulty=4,
        context=(
            "You've arrived at a hotel in another city after a long journey. "
            "The receptionist is polite but busy. Check in, and handle one small problem."
        ),
        events_pool=["vocabulary_gap", "new_information"],
        success_conditions=["give_booking_details", "request_what_you_need", "handle_problem"],
        hidden_objectives=[
            "state your reservation name confidently",
            "ask one clarifying question",
        ],
        opening_line="Good evening, welcome to Hotel Meridian. Checking in? May I have the name on the reservation, please?",
    ),
    ScenarioDef(
        key="ask_directions",
        title="Ask for Directions",
        environment="travel",
        objective="find_your_way_to_a_destination",
        partner="local",
        partner_name="a local person on the street",
        persona="travel_companion",
        difficulty=3,
        context=(
            "You're in a new city. You need to find the metro station but you're lost. "
            "You stop a friendly local to ask."
        ),
        events_pool=["topic_shift"],
        success_conditions=["greet_and_ask", "confirm_understanding", "say_thanks"],
        hidden_objectives=[
            "ask a follow-up question about the directions",
            "repeat directions back to confirm",
        ],
        opening_line="Oh, hello! Yes, the metro station — it's a bit tricky from here actually. Are you visiting?",
    ),
    ScenarioDef(
        key="recover_misunderstanding",
        title="Recover from a Misunderstanding",
        environment="workplace",
        objective="repair_a_misunderstanding",
        partner="colleague",
        partner_name="Neha, your work colleague",
        persona="colleague",
        difficulty=6,
        context=(
            "You and Neha are coordinating. She believes you said you would do a task "
            "by Friday, but you meant next week. Clear it up without causing friction."
        ),
        events_pool=["misunderstanding", "misunderstanding"],
        success_conditions=["recognize_misunderstanding", "clear_it_up", "agree_on_new_plan"],
        hidden_objectives=[
            "correct the misunderstanding politely",
            "re-confirm the new understanding",
        ],
        opening_line="Oh good, you're here. So just to confirm — you'll have the report ready by Friday, right? I've told the manager already.",
    ),
    ScenarioDef(
        key="explain_unknown_word",
        title="Explain Something Without the Right Word",
        environment="college",
        objective="explain_a_concept_using_other_words",
        partner="classmate",
        partner_name="a classmate in your study group",
        persona="friend",
        difficulty=5,
        context=(
            "Your study group is discussing a concept you know well, but you've "
            "forgotten the exact technical term. Explain it in your own words."
        ),
        events_pool=["vocabulary_gap"],
        success_conditions=["explain_concept", "preserve_communication", "confirm_listener_understood"],
        hidden_objectives=[
            "paraphrase a concept",
            "handle not knowing an exact word",
        ],
        opening_line="Alright, so next: can anyone explain what that — what is it called — the thing that handles scheduling? You know, the part that decides which process runs first?",
    ),
    ScenarioDef(
        key="international_colleague_intro",
        title="First Call with an International Colleague",
        environment="international",
        objective="introduce_yourself_clearly",
        partner="international_colleague",
        partner_name="James, an international colleague",
        persona="international_colleague",
        difficulty=5,
        context=(
            "First video call with a colleague based overseas. They speak quickly and "
            "with an accent you're not used to. Introduce yourself and understand what "
            "they need from you."
        ),
        events_pool=["misunderstanding", "time_pressure"],
        success_conditions=["introduce_clearly", "ask_clarification_when_needed", "agree_next_step"],
        hidden_objectives=[
            "ask the colleague to repeat or slow down",
            "confirm what they asked you to do",
        ],
        accent="British",
        opening_line="Hi there! James speaking — great to finally connect. Apologies for the quick turnaround, but I've got a tight window. So, you're joining the integration project?",
    ),
    ScenarioDef(
        key="opinion_time_pressure",
        title="Give an Opinion Under Time Pressure",
        environment="workplace",
        objective="give_a_quick_clear_opinion",
        partner="manager",
        partner_name="your manager",
        persona="colleague",
        difficulty=7,
        context=(
            "Your manager drops into your desk with a decision that has to be made "
            "in the next few minutes. She wants your honest opinion and you have to "
            "deliver it fast and clearly."
        ),
        events_pool=["time_pressure", "disagreement"],
        success_conditions=["state_opinion", "justify_briefly", "commit_to_action"],
        hidden_objectives=[
            "give a clear recommendation, not a vague one",
            "handle being challenged on your view",
        ],
        opening_line="Quick one before your next meeting — we're deciding whether to ship the feature as-is or delay a week. You're the one who knows the code. Your call, and we have about two minutes.",
    ),
]

# ---------------------------------------------------------------------------
# CORE assessment scenarios (PRD §18–§26) — a compact set to power the loop
# ---------------------------------------------------------------------------

CORE_TEST_SCENARIOS: list[ScenarioDef] = [
    ScenarioDef(
        key="core_stress_test",
        title="CORE — Conversation Stress Test",
        environment="college",
        objective="maintain_communication_as_difficulty_rises",
        partner="mentor",
        partner_name="your communication mentor",
        persona="mentor",
        difficulty=6,
        context=(
            "A deliberately escalating conversation. Each stage adds a new challenge "
            "— unfamiliar topic, misunderstanding, interruption, disagreement, topic "
            "shift, then time pressure. The system records how long you keep it working."
        ),
        events_pool=[
            "unfamiliar_context",
            "misunderstanding",
            "interruption",
            "disagreement",
            "topic_shift",
            "time_pressure",
        ],
        success_conditions=["keep_communicating", "recover_each_event", "reach_natural_end"],
        hidden_objectives=["survive_all_stages", "recover_without_prompt"],
        opening_line="Let's just talk — how's your week been? Any project you're working on?",
        category="core_test",
    ),
    ScenarioDef(
        key="core_hidden_objective",
        title="CORE — Hidden Objective Conversation",
        environment="workplace",
        objective="plan_a_team_offsite",
        partner="colleague",
        partner_name="Priya, a colleague",
        persona="colleague",
        difficulty=5,
        context=(
            "Priya wants to plan the team offsite. Seemingly a normal planning chat — "
            "but behind the scenes five specific behaviors are being measured. You'll "
            "see them after the session."
        ),
        events_pool=["disagreement"],
        success_conditions=["ask_followup", "clarify_information", "express_preference"],
        hidden_objectives=[
            "ask a follow-up question",
            "clarify information",
            "express your preference",
            "handle disagreement",
            "reach agreement",
        ],
        opening_line="So, about the offsite — I was thinking Goa, but the budget's tight. What do you think we should prioritise?",
        category="core_test",
    ),
    ScenarioDef(
        key="core_unknown_word",
        title="CORE — Unknown Word Test",
        environment="workplace",
        objective="resolve_an_unfamiliar_term_in_conversation",
        partner="colleague",
        partner_name="a colleague from another team",
        persona="colleague",
        difficulty=5,
        context=(
            "A colleague uses a term from another domain you plausibly don't know. "
            "Keep the conversation moving — ask, guess, or work around it."
        ),
        events_pool=["vocabulary_gap"],
        success_conditions=["keep_communication_going", "resolve_or_bypass_gap"],
        hidden_objectives=["paraphrase", "ask_meaning", "confirm_understanding"],
        opening_line="Hey — before the sync, can you sanity-check the buffer pool sizing on the ingest cluster? I keep hitting eviction issues.",
        category="core_test",
    ),
    ScenarioDef(
        key="core_register_switch",
        title="CORE — Register Switching",
        environment="international",
        objective="same_objective,_different_partners",
        partner="international_colleague",
        partner_name="three different people in one scenario",
        persona="international_colleague",
        difficulty=6,
        context=(
            "One objective — scheduling a meeting — but you must do it with a friend "
            "first, then a professor, then an international colleague. Watch how you "
            "adjust your language for each person."
        ),
        success_conditions=["adjust_formality", "stay_clear", "achieve_objective_each_time"],
        hidden_objectives=[
            "change register between partners",
            "maintain politeness",
            "keep the goal clear",
        ],
        opening_line="Friend first: hey, are you free Thursday? I need thirty minutes to run something by you.",
        category="core_test",
    ),
    ScenarioDef(
        key="core_unexpected_change",
        title="CORE — Unexpected Change",
        environment="college",
        objective="adapt_when_plan_changes_midway",
        partner="professor",
        partner_name="your project supervisor",
        persona="professor",
        difficulty=6,
        context=(
            "You're presenting your project plan when your supervisor drops new "
            "information that changes everything. Adapt, propose a new option, and "
            "keep the goal alive."
        ),
        events_pool=["new_information", "time_pressure"],
        success_conditions=["understand_change", "propose_new_plan", "continue_interaction"],
        hidden_objectives=["propose_an_alternative", "preserve_the_goal"],
        opening_line="Before you continue — I should tell you, the topic you've been assigned has already been given to another group this semester.",
        category="core_test",
    ),
]

# ---------------------------------------------------------------------------
# Travel / Global Survival stages (PRD §46)
# ---------------------------------------------------------------------------

TRAVEL_STAGES: list[ScenarioDef] = [
    ScenarioDef(
        key="travel_airport",
        title="At the Airport",
        environment="travel",
        objective="get_boarding_information",
        partner="checkin_agent",
        partner_name="an airline check-in agent",
        persona="travel_companion",
        difficulty=3,
        context=(
            "You're at the airport for an international flight. You need to check in "
            "and confirm your boarding gate and timing."
        ),
        events_pool=["time_pressure"],
        success_conditions=["provide_booking_details", "ask_for_gate_info", "confirm_boarding_time"],
        hidden_objectives=["ask_one_clear_question", "confirm_what_you_heard"],
        opening_line="Good morning! Checking in for a flight today? Can I see your passport and booking reference, please?",
        category="travel",
        stage_key="airport",
    ),
    ScenarioDef(
        key="travel_immigration",
        title="At Immigration",
        environment="travel",
        objective="pass_immigration_questions",
        partner="immigration_officer",
        partner_name="an immigration officer",
        persona="travel_companion",
        difficulty=4,
        context=(
            "You're at passport control. The officer asks you questions about your "
            "visit. Answer clearly and confidently."
        ),
        events_pool=["unfamiliar_context"],
        success_conditions=["answer_purpose_question", "state_duration", "give_clear_responses"],
        hidden_objectives=["answer_directly", "handle_a_detail_question"],
        opening_line="Good afternoon. Purpose of your visit to the UK, please?",
        category="travel",
        stage_key="immigration",
    ),
    ScenarioDef(
        key="travel_transport",
        title="Getting Around",
        environment="travel",
        objective="navigate_public_transport",
        partner="station_attendant",
        partner_name="a station attendant",
        persona="travel_companion",
        difficulty=4,
        context=(
            "You need to use the local transport system. You're not sure which line "
            "or where to buy a ticket. Ask for help and get exactly what you need."
        ),
        events_pool=["misunderstanding"],
        success_conditions=["ask_for_ticket_help", "confirm_direction", "understand_payment"],
        hidden_objectives=["ask_for_clarification", "repeat_instructions_to_confirm"],
        opening_line="Next! Where are you headed today? Need a ticket, or topping up a card?",
        category="travel",
        stage_key="transport",
    ),
    ScenarioDef(
        key="travel_hotel_issue",
        title="Hotel Reservation Problem",
        environment="travel",
        objective="resolve_a_booking_issue",
        partner="receptionist",
        partner_name="a hotel receptionist",
        persona="travel_companion",
        difficulty=5,
        context=(
            "You arrive at your hotel but they can't find your reservation — it was "
            "made through a third-party site. Sort it out."
        ),
        events_pool=["vocabulary_gap", "new_information"],
        success_conditions=["explain_booking", "provide_proof", "reach_a_solution"],
        hidden_objectives=["explain_without_the_exact_jargon", "ask_for_a_concrete_resolution"],
        opening_line="Hmm, I'm sorry, but I don't see any reservation under that name for tonight. When did you book, and through which channel?",
        category="travel",
        stage_key="hotel",
    ),
    ScenarioDef(
        key="travel_restaurant",
        title="At the Restaurant",
        environment="travel",
        objective="order_and_clarify_ingredients",
        partner="waiter",
        partner_name="a restaurant waiter",
        persona="travel_companion",
        difficulty=3,
        context=(
            "You're at a restaurant and the menu has things you don't recognise. "
            "Order something you can eat and check one detail (spice, allergy, price)."
        ),
        events_pool=["vocabulary_gap"],
        success_conditions=["ask_about_a_dish", "place_an_order", "clarify_one_detail"],
        hidden_objectives=["ask_meaning_of_an_item", "check_for_allergen_or_spice"],
        opening_line="Good evening! Are you ready to order, or would you like a couple more minutes with the menu?",
        category="travel",
        stage_key="restaurant",
    ),
    ScenarioDef(
        key="travel_shopping",
        title="Shopping",
        environment="travel",
        objective="buy_an_item_and_handle_returns",
        partner="shop_assistant",
        partner_name="a shop assistant",
        persona="travel_companion",
        difficulty=3,
        context=(
            "You want to buy something (a jacket), ask about price and sizes, and "
            "understand the return policy."
        ),
        events_pool=["topic_shift"],
        success_conditions=["ask_price", "ask_size", "ask_return_policy"],
        hidden_objectives=["bargain_or_ask_about_discount", "understand_a_policy"],
        opening_line="Hi! Looking for anything specific today?",
        category="travel",
        stage_key="shopping",
    ),
    ScenarioDef(
        key="travel_social",
        title="Social Interaction",
        environment="travel",
        objective="small_talk_with_a_local",
        partner="local",
        partner_name="a local you meet at a cafe",
        persona="travel_companion",
        difficulty=4,
        context=(
            "You're at a cafe and a friendly local strikes up a conversation about "
            "where you're from. Enjoy the chat and keep it going naturally."
        ),
        events_pool=["topic_shift", "misunderstanding"],
        success_conditions=["respond_naturally", "ask_questions_back", "keep_conversation_going"],
        hidden_objectives=["ask_about_local_culture", "recover_from_one_confusion"],
        opening_line="You're not from around here, are you? Where are you visiting from?",
        category="travel",
        stage_key="social",
    ),
    ScenarioDef(
        key="travel_unexpected_problem",
        title="Unexpected Problem",
        environment="travel",
        objective="handle_an_emergency_situation",
        partner="staff",
        partner_name="a transport staff member",
        persona="travel_companion",
        difficulty=7,
        context=(
            "Your flight/train connection has been cancelled and you have to get "
            "somewhere urgently. Communicate clearly under pressure and find a solution."
        ),
        events_pool=["new_information", "time_pressure", "vocabulary_gap"],
        success_conditions=["understand_the_problem", "state_what_you_need", "secure_an_alternative"],
        hidden_objectives=["ask_for_a_specific_alternative", "calmly_state_deadline"],
        opening_line="I'm sorry, but the 6:15 to Birmingham is cancelled — signal issue further up the line.",
        category="travel",
        stage_key="emergency",
    ),
]

ALL_SCENARIOS: list[ScenarioDef] = CORE_SCENARIOS + CORE_TEST_SCENARIOS + TRAVEL_STAGES
BY_KEY: dict[str, ScenarioDef] = {s.key: s for s in ALL_SCENARIOS}

TRAVEL_STAGE_ORDER = [s.stage_key for s in TRAVEL_STAGES]
# Keyed by stage_key, not an inferred key suffix: the final stage is
# key="travel_unexpected_problem" but stage_key="emergency".
TRAVEL_STAGE_TITLES = {s.stage_key: s.title for s in TRAVEL_STAGES}