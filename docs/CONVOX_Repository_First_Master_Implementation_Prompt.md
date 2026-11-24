# MASTER IMPLEMENTATION PROMPT — CONVOX
## Repository-First Audit, Incremental Implementation, Product Experience & UI Redesign

**Product:** CONVOX — Speak. Learn. Conquer.  
**Project type:** Existing application improvement and completion — not a greenfield build.  
**Specification source:** The supplied `Convox.pdf`.  
**Execution model:** Inspect the complete repository → establish the real baseline → map PDF requirements to existing implementation → identify verified gaps → implement incrementally → test and report.

---

### 0. THE MOST IMPORTANT DIRECTIVE — UNDERSTAND BEFORE CHANGING
You are working inside the existing CONVOX repository (`c:\Users\shren\Convox V2`). Your task is to improve and complete that application according to `Convox.pdf`, not to create a new application that merely uses the CONVOX name.

The repository is the source of truth for what has actually been implemented. The PDF is the source of truth for the intended product behaviour, requirements and target experience. Do not assume that the repository matches the PDF, and do not assume that a feature is missing just because it is not obvious from the homepage.

You must inspect the complete repository and understand the existing implementation before editing, generating, replacing, moving or deleting project files.

The required sequence is:
1. Discover and map the complete repository.
2. Read the existing project documentation and implementation plan.
3. Inspect the actual frontend, backend, database, AI services, evaluation framework, learner model, scenarios, personas, progression logic, tests and configuration.
4. Establish what currently works and record the baseline.
5. Compare every applicable requirement in `Convox.pdf` against the actual code.
6. Produce an evidence-based implementation and migration plan that identifies what should be reused, repaired, extended or newly implemented.
7. Only then begin implementation, in small, verifiable stages.

Do not skip the audit and jump directly into UI creation.

#### 0.1 Non-negotiable preservation rules
- Do not scaffold a new Next.js application, FastAPI service, database, authentication system, CORE evaluator, learner model, persona catalogue, scenario catalogue or Global Survival journey if an equivalent implementation already exists.
- Do not replace working project architecture with a preferred stack or a newly generated architecture.
- Do not create duplicate pages, routes, API endpoints, components, models, services, schemas, tables, jobs or sources of truth.
- Do not discard existing business logic merely to make the requested UI easier to build.
- Do not replace real API data with mock data, hardcoded values or static demonstration cards.
- Do not remove existing product functionality unless the audit proves it is obsolete, broken, duplicated or explicitly contradicted by the PDF. Explain any such removal.
- Do not overwrite uncommitted user work, existing data, local configuration or secrets.
- Do not silently recreate, truncate or delete the existing SQLite database.
- Do not assume a documented file, route, service or feature exists. Verify it in the repository.
- Do not claim an existing feature works until you have traced its implementation and, where feasible, executed it or tested its behaviour.
- Do not introduce dependencies or infrastructure without a demonstrated need.

The goal is not maximum code creation. The goal is the smallest coherent set of changes that makes the existing CONVOX application satisfy the specification.

#### 0.2 Resolve the two scopes in the PDF correctly
`Convox.pdf` contains both a detailed Phase 3 specification (frontend foundation, authentication and onboarding) and a complete end-to-end CONVOX implementation specification.

For this master task, the complete end-to-end specification is the overall target. Use the detailed Phase 3 section as the authoritative, more specific description of the frontend foundation, account authentication, security and onboarding work. Its Phase 3-only exclusions apply only when executing that phase independently; they must not be misread as exclusions from the complete project rebuild described by the PDF.

Execute the complete project roadmap in this prompt. If the user later explicitly asks for only one phase, respect that phase's scope and do not silently expand it into the full rebuild.

#### 0.3 How to handle conflicts and uncertainty
When documentation and implementation disagree:
1. Record what the code currently does, with file and symbol references.
2. Record what the PDF requires.
3. Determine whether the implementation is intentionally different, incomplete, legacy or defective.
4. Prefer preserving the current working implementation and adapting it with minimal changes.
5. Do not invent missing business rules, CORE dimensions, persona data, scenario definitions, stage definitions, formulas or provider capabilities.
6. If a requirement cannot be implemented safely because the repository or configuration does not support it, implement the parts that are supported, clearly document the blocker and do not fake the feature.

Do not stop after producing the audit. Once the audit and safe implementation plan are complete, proceed with the justified work without waiting for an approval checkpoint. Pause only when an action could irreversibly destroy user data or when a decision genuinely requires unavailable credentials, external account access or explicit user input. Never invent credentials or data.

---

### 1. YOUR ROLE
Operate as a coordinated product engineering team with the responsibilities of:
- Senior full-stack engineer
- Frontend architect
- Backend architect
- UI/UX and product designer
- AI evaluation engineer
- Data and analytics engineer
- Database engineer
- Authentication and security engineer
- QA and testing engineer

Balance implementation correctness and learner experience. A visually impressive interface with fabricated scores or inert controls is unacceptable. A technically functional application with a confusing learner journey is also unacceptable.

Every important UI element must be connected to real application behaviour and a trustworthy data source.

---

### 2. STAGE A — COMPLETE REPOSITORY DISCOVERY (AUDIT ONLY)
Do not modify source files during this stage. First create an accurate map of the project.

#### 2.1 Discover the repository root and complete structure
- Confirm repository root and current working directory.
- Identify all top-level folders and files.
- Generate a useful recursive file/folder inventory, excluding bulky generated folders (`node_modules`, `.next`, `.venv`, `venv`, `__pycache__`, build outputs, and `.git`).
- Identify monorepo/workspace boundaries, frontend, backend, shared packages, static assets, tests, scripts, database files, migrations, deployment files, and documentation.
- Identify generated files, ignored files, local-only files and user-owned changes.
- Identify all existing application entry points and startup commands.

#### 2.2 Read project documentation completely
Inspect:
- `CONVOX_Implementation_Plan.md`
- README and setup guides
- Architecture documentation, API docs, CORE rubric/evaluator docs, learner model docs, persona & scenario catalogue docs, Global Survival journey docs, database/migration notes, design system notes, and `.env.example`.

#### 2.3 Inspect the frontend in depth
- Framework and runtime versions (Next.js, React).
- Application routes and route groups (`app/` structure).
- Pages, layouts, navigation, and components.
- Design tokens, CSS (`globals.css`, Tailwind config).
- Forms, validation, API clients (`lib/api.ts`, `lib/auth.ts`, `lib/types.ts`).
- Authentication/session handling (`contexts/AuthContext.tsx`, `middleware.ts`).
- Dashboard, scorecard, conversation, audio components, autopsy, travel, progress views.
- Loading, empty, error, and success states.

#### 2.4 Inspect the backend and AI services in depth
- FastAPI entry point (`app/main.py`) and config (`app/config.py`).
- API routes and schemas (`app/api/*`, `app/schemas/*`).
- Services and domain logic (`app/services/*`).
- Authentication and authorization (`auth_service.py`, `auth_deps.py`).
- Conversation lifecycle, turn submission, and audio upload handling.
- LLM, STT, and TTS adapters (`llm_service.py`, `audio_service.py`).
- CORE evaluator and all 14 registered dimensions (`core_rubric.py`, `evaluation_engine.py`, `evidence_validator.py`).
- Learner-model update formula and statistics (`learner_model.py`).
- Scenario recommendation logic (`scenario_engine.py`).
- Global Survival stage definitions and progression rules (`travel.py`, `travel_engine.py`).
- Background worker and evaluation durability (`evaluation_worker.py`).
- Existing tests (`backend/tests/*`).

#### 2.5 Inspect persistence and data integrity
- SQLAlchemy models and relationships (`app/models/*`).
- Database engine, session setup, and SQLite schema (`app/database.py`).
- Uniqueness, foreign keys, and idempotency constraints.
- Conversation / transcript / evaluation relationships.
- Rubric version storage and job status tracking.

#### 2.6 Inspect environment, dependency, and developer tooling
- Check real manifests: `package.json`, `package-lock.json`, `backend/requirements.txt`.
- Python virtual environment and active libraries.
- TypeScript configuration (`tsconfig.json`).
- Development commands and test commands.

#### 2.7 Establish and record a baseline
Run existing verification commands before making changes:
- Frontend: `npm run typecheck`, `npm run build`.
- Backend: `pytest backend -v`.
- Record baseline status.

---

### 3. REQUIRED AUDIT OUTPUT — BEFORE IMPLEMENTATION
Create a concise but sufficiently detailed audit document in `docs/CONVOX_REPOSITORY_AUDIT.md`.
The audit must include:
1. **Repository map** with descriptions of key files and directories.
2. **Existing architecture map** describing data flow across conversation and evaluation channels.
3. **Feature inventory** classifying features as:
   - *Working*
   - *Partially implemented*
   - *Present but unverified*
   - *Missing*
   - *Broken*
   - *Not applicable*
   - *Blocked by external configuration*
4. **Requirement-to-repository traceability matrix** mapping PDF requirements to code files, status, gaps, and minimal implementation actions.
5. **Verification of known audit points**:
   - `loaId` vs `loadId` in `page.tsx`
   - Manifest / lockfile consistency
   - Next.js / React version compatibility
   - Normal conversation evaluations updating learner model
   - Evidence validation (quotes and timestamps)
   - Event recovery persistence
   - Evaluation queue durability
   - Pronunciation assessed without acoustics (must remain unassessed)
   - Missing data displayed as zero/perfect (must remain null/unassessed)
   - Hardcoded `intl_gap` (must be suppressed/removed from valid metrics)
   - Audio resource cleanup & recording race conditions
   - Provider availability claims in UI
   - React Strict Mode duplicate session creation
6. **Risk and implementation plan** specifying the exact order of work.

---

### 4. CORE ARCHITECTURE AND PRODUCT PRINCIPLES
Preserve the separation between the **Conversation Channel** and the **Evaluation Channel**:
- **Conversation Channel:** Prioritize responsiveness, real-time voice/text turn submission, LLM reply, STT, and TTS.
- **Evaluation Channel:** Durable background worker processing frozen transcripts, evaluating 14 CORE dimensions, validating quote evidence, updating learner profile idempotently, and generating conversation autopsies.

Do not introduce WebRTC, distributed workers, PostgreSQL, pgvector, Redis/Celery unless a documented requirement strictly mandates it.

---

### 5. IMPLEMENTATION ROADMAP — 10 PHASES
Execute in strict order. Validate each phase before proceeding.

- **Phase 0 — Repository preservation and baseline:** Establish baseline test pass rates and build status.
- **Phase 1 — Frontend foundation and stability:** Fix build, lockfile, and UI state defects.
- **Phase 2 — Authentication and learner onboarding:** Google OAuth handling, email/password bcrypt auth, JWT cookies, country & communication context selection, protected routes.
- **Phase 3 — Initial speaking assessment:** Trial conversation ("Meet a Classmate" / initial trial), baseline report, unassessed dimensions flagged honestly.
- **Phase 4 — Conversation lifecycle and persistence:** Turn sequencing, transcript freezing upon completion, duplicate prevention.
- **Phase 5 — CORE evidence integrity:** 14-dimension rubric verification, strict quote matching against transcript, server timestamps, honest missing-data representation.
- **Phase 6 — Learner model and adaptation:** Idempotent single-application profile updates, traceable recommendation rationale, CEFR labelled as provisional.
- **Phase 7 — Durable background evaluation:** SQLite-backed job queue, restart recovery, worker idempotency, UI status display.
- **Phase 8 — Voice reliability and privacy:** Recorder lifecycle management, cleanup on unmount/navigation, upload limits, safe STT/TTS fallbacks.
- **Phase 9 — Complete learner-facing redesign:**
  - Welcome & Auth views
  - Onboarding flow
  - Initial Assessment & Baseline Report
  - Main Dashboard (Current benchmark, today's activity, recent progress)
  - Full Scorecard Redesign (Directly readable metrics, no hidden tooltips, previous vs current session comparison, 14 CORE breakdown, evidence-backed corrections)
  - Persona Progression Pathways
  - Live Speaking Environment
  - Conversation Autopsy Report
  - Eight-Stage Global Survival Progression Map
- **Phase 10 — Release and quality assurance:** Full test execution, typecheck, production build, cross-user isolation checks, and documentation.

---

### 6. ACCEPTANCE AND EVIDENCE RULES
1. Every score must come from a stored, valid evaluation.
2. Quoted learner mistakes must match the frozen transcript verbatim.
3. Unsupported or unmeasured dimensions (like acoustic pronunciation) must show as "Not Assessed", never 0 or 10.
4. Indian English must be treated as valid English, not defective English.
5. All 27+ backend tests must pass; frontend typecheck and build must succeed without errors.

---

### 7. FINAL IMPLEMENTATION REPORT
Upon completion, document:
- Executive summary (what was reused, repaired, extended, implemented)
- Requirement traceability matrix
- List of modified, created, and deleted files
- Test execution results table (Pass/Fail/Blocked)
- External configuration requirements (`.env.example` keys)
- Remaining limitations and verification status
