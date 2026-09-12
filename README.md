# CONVOX — Speak. Learn. Conquer. 🎧

A **voice-first adaptive communication simulator** for Indian college students moving
from everyday Indian English to confident global communication. You speak to AI
partners (a classmate, a professor, an interviewer, an immigration officer…);
the system listens, responds, and after every session produces a **CORE evaluation** —
a forensic, evidence-cited autopsy of your conversation, not a vague score.

Built on the two-channel idea (PRD §50): a **fast conversation channel** for the
live dialogue, and a **thorough background evaluation channel** that produces the
autopsy and updates your personal learner model.

---

## Quick start

### 1 · Backend (FastAPI + SQLite)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Put your API keys in `backend/.env` (see `.env.example` — never commit real keys):

```env
ANTHROPIC_API_KEY=sk-ant-...   # conversation + evaluation models
GROQ_API_KEY=gsk_...           # Groq Whisper (voice → text)
OPENAI_API_KEY=sk-proj-...     # OpenAI TTS (text → voice)
```

Run it:

```bash
uvicorn app.main:app --reload --port 8000
```

Health check: <http://127.0.0.1:8000/api/health> · API docs: <http://127.0.0.1:8000/docs>

### 2 · Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev          # → http://localhost:3000
```

The app **degrades gracefully**: without a Groq key you can still *type* replies;
without key providers the AI still generates conversation text (no voice).

### 3 · Tests

```bash
cd backend
.venv\Scripts\activate
python -m pytest
```

Tests stub the evaluation model, so the whole CORE pipeline — conversation →
scores → autopsy → learner model → travel journey → progress — is verified with
**zero API keys required**.

---

## What's in v1

| Block | What it does |
|---|---|
| **Conversation engine** | Turn-based state machine. Personas, controlled events (misunderstanding, disagreement, time pressure, topic shift, vocabulary gap, interruption, unfamiliar context, new information), max-turn cap, graceful TTS/STT degradation. |
| **CORE evaluation** | 14 evidence-cited dimensions (5 language + 9 interaction), readiness composite, recovery index, vocab recovery index, quoted evidence, hidden-objective check. |
| **Conversation autopsy** | Timeline of injected events + resolutions, per-dimension radar, evidence cards. |
| **Learner model** | Exponentially-weighted skill dims, common-error transfer queue, recovery profile, **adaptive difficulty** (next scenario targets your weakest dimension). |
| **Progress dashboard** | Readiness trend, language/interaction radar, weakest dimensions, Indian→international alternatives. |
| **Travel / Global Survival** | 8-stage journey (airport → … → emergency), each stage scored and carried into your profile. |

### Tech stack

- **Backend:** Python 3.12+ · FastAPI · SQLAlchemy 2 (async) · SQLite via aiosqlite
- **LLM:** Anthropic API (`claude-sonnet-5` conversation, `claude-sonnet-5` evaluation)
- **Voice:** Groq Whisper (STT) + OpenAI TTS — **turn-based**, not streaming
- **Frontend:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind, hand-rolled SVG charts

---

## Architecture at a glance

```
frontend (Next.js)          backend (FastAPI)
┌───────────┐               ┌────────────────────────────┐
│ Voice UI  │── POST audio ─▶│ conversation_engine        │  live channel
│ (mediaRec)=▶              │  persona prompts + events    ├──▶ STT → LLM → TTS
└─────┬─────┘               └──────────────┬─────────────┘
      │ GET autopsy / progress             │ evaluate on demand
      ▼                                    ▼
  /autopsy  ◀─────────────  evaluation_engine + learner_model
                                 (evidence-linked CORE + trends)
                                    │ SQLAlchemy (SQLite — WAL)
                                    ▼
                            conversations · scenarios · evaluations
                            learner_profiles · travel_journeys/stages
```

Key design constraints (from the PRD, honored in v1):

- **Controlled randomness (PRD §15):** the LLM generates the natural language;
  the scenario objective, event pool and difficulty stay fixed so assessment stays
  reproducible.
- **Evidence-linked scoring (PRD §52):** no score without a quote.
- **Indian English is valid English (PRD Principle 3):** patterns like *"I have a
  doubt"* are flagged as contextually useful *alternatives*, never penalised.

---

## API surface (excerpt)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/conversation/start` | open a session, get the AI's first line (+ audio URL) |
| POST | `/api/conversation/{id}/turn` | send audio (multipart) or text → AI reply + TTS |
| POST | `/api/conversation/{id}/end` | close a session |
| GET  | `/api/conversation/{id}/autopsy` | full CORE autopsy (lazy evaluation) |
| GET  | `/api/scenarios/recommend` | adaptive next-scenario pick |
| GET  | `/api/progress/summary` | dashboard data |
| POST | `/api/travel/start` · `…/stage/{key}/start` · `…/complete` | the survival journey |

Full contract: OpenAPI at `/docs`.

---

## Security notes

- **API keys live only in `backend/.env`** (git-ignored). Never paste them into
  the terminal/chat — that leaks them into shell history and session transcripts.
  If one leaks, **rotate it** at the provider and update `.env`.
- Audio uploads are capped at 10 MB; filenames are re-written server-side to a
  time-stamped safe form. v1 is single-user local — no auth, by design.

## What's intentionally deferred (Phase 2+)

Streaming voice (WebRTC) · PostgreSQL + pgvector semantic scenario matching ·
IELTS/TOEFL exam mode · multi-user / auth · phoneme-level pronunciation ·
Hinglish code-switching · teacher dashboards.

## Project structure

```
convox/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, lifespan, static /audio
│   │   ├── config.py          # pydantic-settings (.env)
│   │   ├── database.py        # async SQLAlchemy engine + session
│   │   ├── api/               # HTTP routers (conversation, scenario, evaluation, profile, travel)
│   │   ├── models/            # ORM: users, conversations, scenarios, evaluations, profiles, travel
│   │   ├── schemas/           # Pydantic request/response
│   │   ├── services/          # conversation_engine, evaluation_engine, learner_model,
│   │   │                      # travel_service, llm/stt/tts, scenario_engine, scenarios_data
│   │   └── utils/             # audio, prompts (personas + events + CORE rubric)
│   ├── tests/                 # zero-key end-to-end suite (model stubbed)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/                   # Home · Conversation · Autopsy · Progress · Travel
    ├── components/            # ui · voice · conversation · autopsy · progress · travel
    └── lib/                   # api client · audio (MediaRecorder) · types
```