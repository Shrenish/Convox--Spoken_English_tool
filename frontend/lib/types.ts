// Typed mirror of the CONVOX backend API (FastAPI / Pydantic shapes).

// --- Auth / User -----------------------------------------------------------------

export interface UserOut {
  id: string;
  display_name: string;
  email: string | null;
  auth_provider: string;
  country: string | null;
  communication_context: string | null;
  onboarding_completed: boolean;
  token?: string | null;
}

export interface Health {
  status: string;
  version: string;
  configured: { anthropic: boolean; groq: boolean; openai: boolean };
}

export interface ScenarioOut {
  scenario_key: string;
  title: string;
  environment: string;
  objective: string;
  difficulty: number;
  partner: string;
  category: string;
  stage_key?: string | null;
  events_pool: string[];
  success_conditions: string[];
  hidden_objectives: string[];
  description: string;
}

export interface ScenarioRecommendation {
  scenario_key: string;
  title: string;
  reason: string;
  difficulty: number;
  estimated_minutes: number;
}

export interface EventOut {
  event_type: string;
  description: string;
  resolved: boolean;
  trigger_turn: number;
}

export interface TurnResponse {
  conversation_id: string;
  sequence: number;
  user_transcript: string;
  ai_transcript: string;
  ai_audio_url?: string | null;
  event?: EventOut | null;
  conversation_complete: boolean;
  max_turns_reached: boolean;
}

export interface EvidenceItem {
  timestamp: string;
  quote: string;
  skill: string;
  impact: string;
  note: string;
  event_type?: string | null;
}

export interface EvaluationOut {
  conversation_id: string;
  language_scores: Record<string, number>;
  interaction_scores: Record<string, number>;
  readiness_score: number;
  recovery_index: number;
  vocab_recovery_index: number;
  intl_gap: number;
  confidence: string;
}

export interface AutopsyOut {
  conversation_id: string;
  evaluation?: EvaluationOut | null;
  evidence: EvidenceItem[];
  events: Array<{
    event_type: string;
    description: string;
    trigger_turn: number;
    resolved: boolean;
    resolution_turn?: number | null;
  }>;
  recommended_focus: string[];
}

export interface ProgressTrendPoint {
  label: string;
  readiness: number;
  recovery?: number | null;
  intl_gap?: number | null;
}

export interface ProgressSummary {
  readiness: number;
  language_scores: Record<string, number>;
  interaction_scores: Record<string, number>;
  recovery_index: number;
  intl_gap: number;
  sessions_completed: number;
  trend: ProgressTrendPoint[];
  weakest_dimensions: string[];
  recommended_focus: string;
}

export interface LearnerProfileOut {
  user_id: string;
  display_name: string;
  skill_dims: Record<string, number>;
  interests: string[];
  common_errors: Array<{ pattern: string; fix?: string; context?: string }>;
  readiness_score: number;
  intl_gap: number;
  sessions_completed: number;
}

export interface TravelStageOut {
  stage_key: string;
  stage_index: number;
  title: string;
  status: string; // locked | active | completed
  scenario_key?: string | null;
  score?: number | null;
}

export interface TravelJourneyOut {
  journey_id: string;
  destination: string;
  status: string;
  current_stage: number;
  stages: TravelStageOut[];
}

export interface TravelStageStartResponse {
  conversation_id: string;
  stage_key: string;
  scenario_key: string;
  title: string;
  ai_transcript: string;
  ai_audio_url?: string | null;
}

export interface TravelStageCompleteResponse {
  journey_id: string;
  stage_key: string;
  next_stage?: TravelStageOut | null;
  journey_completed: boolean;
  recommended_focus: string[];
}

// --- Gamification & Personas ----------------------------------------------------

export interface AchievementBadge {
  id: string;
  title: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  category: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string | null;
  progress: number;
}

export interface ExecutivePersona {
  id: string;
  name: string;
  title: string;
  role: string;
  avatar_color: string;
  voice_description: string;
  coaching_style: string;
  unlocked: boolean;
  requirement: string;
  recommended_scenario: string;
}

export interface GamificationState {
  xp: number;
  executive_level: number;
  title: string;
  streak_days: number;
  next_level_xp: number;
  badges: AchievementBadge[];
  personas: ExecutivePersona[];
  recent_rewards: string[];
}
