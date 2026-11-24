# CONVOX Repository Audit & Architectural Baseline
**Date:** November 2026  
**Repository:** `c:\Users\shren\Convox V2`  
**Branch:** `rebuild/phase-3-foundation-auth`  
**Specification Source:** `Convox.pdf` / `CONVOX_Repository_First_Master_Implementation_Prompt.md`

---

## 1. Executive Summary & Repository Map

CONVOX is an existing voice-first adaptive communication simulator built on a **two-channel architecture**:
1. **Conversation Channel (Fast / Live):** Turn-based interaction, LLM character generation, STT via Groq Whisper, optional TTS via OpenAI.
2. **Evaluation Channel (Background / Forensic):** Asynchronous evaluation worker assessing 14 evidence-cited CORE dimensions, strictly validating quotations against frozen transcripts, calculating an idempotent learner profile update, and producing conversation autopsies.

### Top-Level Layout
- `backend/`: FastAPI application, async SQLAlchemy 2 + SQLite (WAL mode).
  - `app/api/`: API routers (`auth`, `conversation`, `evaluation`, `profile`, `scenario`, `travel`).
  - `app/models/`: Models for User, LearnerProfile, Conversation, Turn, Evaluation, EvaluationJob, Scenario, Travel.
  - `app/services/`: Core engines (`auth_service`, `conversation_engine`, `core_rubric`, `evaluation_engine`, `evaluation_worker`, `learner_model`, `scenario_engine`, `travel_service`).
  - `tests/`: Pytest suite (27 passing tests covering aggregates, lifecycle, rubric, security, travel).
- `frontend/`: Next.js 14 (App Router) + React 18 + Tailwind CSS.
  - `app/`: Routes for `/` (Welcome & Auth), `/onboarding` (Country & Context), `/dashboard` (Learner Home), `/conversation` (Speaking Arena), `/autopsy/[id]` (Forensic Autopsy), `/travel` (Global Survival Journey), `/progress` (Historical Scorecard).
  - `components/`: Modular UI, voice recording & playback, radar charts, trendlines, journey maps.
  - `contexts/`: `AuthContext.tsx` providing reactive session state.
  - `lib/`: `api.ts`, `auth.ts`, `audio.ts`, `types.ts`.
  - `middleware.ts`: Next.js Edge route guard protecting authenticated routes.
- `docs/`: Master implementation prompt and repository audit.

---

## 2. Feature Inventory & Current Status

| Feature / Subsystem | Current Status | Code Location | Verified Behaviour / Evidence |
|---|---|---|---|
| **Two-Channel Architecture** | **Working** | `backend/app/services/evaluation_worker.py`, `conversation_engine.py` | Turn exchange does not block on evaluation; evaluation queue runs asynchronously. |
| **Authentication & Sessions** | **Working** | `backend/app/api/auth.py`, `frontend/contexts/AuthContext.tsx` | Password hashing with `bcrypt`, JWT cookies (`HttpOnly`), session restoration. |
| **Learner Onboarding** | **Working** | `frontend/app/onboarding/page.tsx`, `backend/app/api/auth.py` | Country selection (India/Other), context selection (Indian/US/UK/International English), separate from proficiency. |
| **Route Protection** | **Working** | `frontend/middleware.ts` | Redirects unauthenticated users to `/` on protected paths. |
| **Conversation Lifecycle** | **Working** | `backend/app/services/conversation_engine.py`, `finalization_service.py` | Frozen transcripts upon completion; turn sequencing checks; duplicate prevention. |
| **CORE Rubric (14 Dims)** | **Working** | `backend/app/services/core_rubric.py` | 5 language + 9 interaction dimensions registered and tested. |
| **Evidence Validation** | **Working** | `backend/app/services/core_rubric.py` | Quotations must match verbatim in learner turns; AI turns rejected as learner evidence. |
| **Learner Model Idempotency**| **Working** | `backend/app/services/learner_model.py` | Applied exactly once per valid evaluation using ledger mechanism. |
| **Travel / Global Survival** | **Working** | `backend/app/services/travel_service.py`, `frontend/app/travel/page.tsx` | 8-stage communication journey with progression gates. |
| **Pronunciation Acoustic Gate**| **Working** | `backend/app/services/core_rubric.py` | Explicitly marked "Not Assessed" rather than faked from transcript. |
| **Intl Gap Suppression** | **Working** | `backend/app/services/core_rubric.py` | Hardcoded 1.2 removed/suppressed. |
| **Initial Speaking Assessment**| **Partially Implemented** | `backend/app/services/scenarios_data.py` | Needs dedicated onboarding trial scenario ("Meet a Classmate") and explicit baseline report UX. |
| **Full Scorecard Redesign** | **Partially Implemented** | `frontend/app/progress/page.tsx` | Needs side-by-side comparable session contrast, directly readable metric cards without hover/radar reliance, and explicit evidence correction cards. |
| **Google OAuth Integration** | **Blocked by External Config** | `frontend/app/page.tsx`, `backend/app/config.py` | Safe UI placeholder present; requires `GOOGLE_CLIENT_ID` to be supplied. |

---

## 3. Requirement-to-Repository Traceability Matrix

| Master Prompt / PDF Requirement | Target Code File(s) | Implementation Action |
|---|---|---|
| **Phase 3: Trial Speaking Assessment** | `backend/app/services/scenarios_data.py`, `frontend/app/onboarding/page.tsx` | Register dedicated trial scenario `initial_assessment` ("Let's understand how you communicate"). Link completed onboarding directly into this trial session. |
| **Phase 3: Baseline Scorecard** | `frontend/app/progress/page.tsx`, `frontend/app/autopsy/[id]/page.tsx` | Add explicit "Initial Baseline" label when `sessions_completed == 1`, with provisional CEFR estimate (e.g. "B1 — Intermediate"). |
| **Phase 9: Scorecard UX Redesign** | `frontend/app/progress/page.tsx` | Replace solitary radar chart with directly readable horizontal skill bars, previous vs. current session delta indicators, and top-3 evidence corrections. |
| **Phase 9: Dashboard Benchmark** | `frontend/app/dashboard/page.tsx` | Connect provisional benchmark, today's practice card with rationale, and recent activity history. |

---

## 4. Next Implementation Actions (Phases 3 & 9 Focus)

1. **Trial Assessment Integration:**
   - Seed `trial_speaking_assessment` scenario ("Meet a Classmate") into `scenarios_data.py`.
   - Update `onboarding/page.tsx` so completion offers an immediate button: "Start Initial Assessment (4-5 mins)".
2. **Scorecard & Baseline Enhancement:**
   - Enhance `frontend/app/progress/page.tsx` to render directly readable skill-by-skill cards (current vs. previous comparable session).
   - Display evidence quotes with suggested alternatives in "What needs improvement?".
   - Label CEFR as "Provisional" based on evaluated performance.
3. **Run Full Verification:**
   - Verify all 27 backend tests remain passing.
   - Run Next.js typecheck and production build.
