// Typed client for the CONVOX backend (FastAPI at BACKEND_BASE).
//
// Every call returns parsed JSON and throws an Error with a human-readable
// message on failure (the backend surfaces `detail.message` for service errors).
// Audio turns upload as multipart/form-data (audio file + optional transcript).

import type {
  AutopsyOut,
  EvaluationOut,
  Health,
  LearnerProfileOut,
  ProgressSummary,
  ScenarioOut,
  ScenarioRecommendation,
  TravelJourneyOut,
  TravelStageCompleteResponse,
  TravelStageStartResponse,
  TurnResponse,
} from "./types";

export const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

/** Backend audio URLs are relative ("/audio/…"); the browser runs on another
 * origin (Next.js on :3000), so resolve them against the backend base. */
export function resolveAudioUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BACKEND_BASE}${url}`;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`${BACKEND_BASE}${path}`, {
    ...init,
    headers: isForm ? undefined : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      detail?: string | { code?: string; message?: string };
    };
    const raw = body?.detail;
    const message =
      (typeof raw === "string" ? raw : raw?.message) ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// --- system / scenarios / profile -------------------------------------------------

export const getHealth = () => http<Health>("/api/health");
export const listScenarios = () => http<ScenarioOut[]>("/api/scenarios");
export const recommendScenario = () =>
  http<ScenarioRecommendation>("/api/scenarios/recommend");
export const getProfile = () => http<LearnerProfileOut>("/api/profile");
export const getProgress = () => http<ProgressSummary>("/api/progress/summary");

// --- conversation ----------------------------------------------------------------

export function startConversation(scenarioKey: string, mode = "conversation") {
  return http<TurnResponse>("/api/conversation/start", {
    method: "POST",
    body: JSON.stringify({ scenario_key: scenarioKey, mode }),
  });
}

export interface SendTurnInput {
  audio?: Blob;
  filename?: string;
  transcript?: string;
}

export async function sendTurn(
  conversationId: string,
  input: SendTurnInput,
): Promise<TurnResponse> {
  const form = new FormData();
  if (input.audio) form.append("audio", input.audio, input.filename ?? "recording.webm");
  if (input.transcript) form.append("transcript", input.transcript);
  return http<TurnResponse>(`/api/conversation/${conversationId}/turn`, {
    method: "POST",
    body: form,
  });
}

export const endConversation = (id: string) =>
  http<{ conversation_id: string; status: string }>(
    `/api/conversation/${id}/end`,
    { method: "POST" },
  );
export const getTurns = (id: string) =>
  http<{ speaker: string; transcript: string; sequence: number }[]>(
    `/api/conversation/${id}/turns`,
  );
export const getAutopsy = (id: string) =>
  http<AutopsyOut>(`/api/conversation/${id}/autopsy`);
export const getEvaluation = (id: string) =>
  http<EvaluationOut>(`/api/evaluation/${id}`);

// --- travel ----------------------------------------------------------------------

export const startTravel = (destination = "UK") =>
  http<TravelJourneyOut>("/api/travel/start", {
    method: "POST",
    body: JSON.stringify({ destination }),
  });
export const getTravel = (journeyId: string) =>
  http<TravelJourneyOut>(`/api/travel/${journeyId}`);
export const startStage = (journeyId: string, stageKey: string) =>
  http<TravelStageStartResponse>(
    `/api/travel/${journeyId}/stage/${stageKey}/start`,
    { method: "POST" },
  );
export const completeStage = (journeyId: string, stageKey: string) =>
  http<TravelStageCompleteResponse>(
    `/api/travel/${journeyId}/stage/${stageKey}/complete`,
    { method: "POST" },
  );