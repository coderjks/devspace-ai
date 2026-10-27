# DevSpace AI — Agent Engineering Instructions

## Mission
DevSpace AI is an AI-native simulated engineering internship. Students join a virtual engineering team, complete an Applied AI Engineering curriculum, work through sprint tickets, collaborate with AI teammates by text and voice, submit GitHub pull requests, receive evidence-based reviews, and advance through competency-gated tasks.

## Sources of truth
1. `docs/prd/requirements.md` — product behavior and acceptance criteria (canonical PRD v2.2 requirements, including the voice amendment).
2. `docs/prompts/build-playbook.md` — phase-by-phase implementation instructions.
3. `docs/architecture/` — recorded technical decisions.
4. `docs/progress.md` — implemented, mocked, blocked, and pending work.

If a source is missing or contradictory, flag it explicitly; do not invent requirements. The current phase prompt defines implementation scope, but never overrides security constraints.

## Stack and structure
- `web/`: Next.js, TypeScript, Tailwind CSS, shadcn/ui.
- `api/`: FastAPI, Pydantic, SQLAlchemy 2, Alembic.
- `worker/`: asynchronous jobs backed by Redis.
- `curriculum/`: versioned project, sprint, and task definitions.
- `infra/`: Docker Compose, deployment configuration.
- `tests/`: API, integration, and end-to-end tests.
- PostgreSQL is the source of truth. Prefer a modular monolith over microservices.
- External dependencies must be behind typed adapters: LLM, STT, TTS, GitHub, and isolated code runner.
- Use only Meta model endpoints and model IDs verified against the user's actual credentials and current provider documentation. Prefer configurable routing between Muse Spark 1.3 and Muse Wonder where supported; never hardcode unverified IDs or assume relative pricing/latency. The coding IDE model and runtime model API are distinct.

## Canonical scope and priorities
- Hackathon MVP: one Applied AI Engineering project, exactly six seeded tickets (AI-001 through AI-006), and a visible but not fully implemented 12-week roadmap.
- P0: onboarding, board, five teammates plus Learning Assistant, contextual text chat, saved standup, GitHub PR evaluation, deterministic progression, progressive hints, **push-to-talk Scrum Master voice standup and Tech Lead voice discussion**, and text fallback.
- P1: adaptive remediation, enhanced progress analytics, voice for other roles. P2: beginner foundations and spoken design reviews.
- Never represent the simulation as employment, accredited training, or a guaranteed placement.

## AI roles and boundaries
Five virtual teammates:
1. Engineering Manager — onboarding, goals, performance feedback.
2. Tech Lead — architecture, task decomposition, technical guidance.
3. Senior Software Engineer — debugging, code-quality coaching.
4. QA Engineer — acceptance criteria, testing, edge cases.
5. Scrum Master — standups, blockers, retrospectives.

A sixth, separate **AI Learning Assistant** provides conceptual help and progressive hints without supplying full task solutions.

All roles use **one shared orchestration service**, with role-specific prompts, scoped tools, distinct conversations, and authorized access to common project context. Model-generated text is never an authorization mechanism. Require typed, validated tool requests and server-side permission checks. Persist audit events for state changes.

## Voice
- Implement voice as a modality of existing conversations, not separate voice agents.
- First release: push-to-talk STT -> orchestrator -> TTS, transcripts, retry, cancellation, and text fallback.
- P0: Scrum Master standup and Tech Lead one-on-one discussion. P1: remaining roles. P2: technical design review.
- Require microphone permission and clear consent. Avoid storing raw audio by default; support configurable retention/deletion. Transcripts may be edited before submission.
- A transcript cannot directly approve tasks or make consequential changes without validated server-side action and required student confirmation.
- Do not build simultaneous multi-agent voice meetings for the hackathon.

## GitHub, evaluation, and progression
- Use a GitHub App with least-privilege permissions; verify webhook HMAC signatures against the raw payload.
- Validate repository ownership and task association; store delivery ID, PR number, repository ID, and **exact head commit SHA**. Process duplicate/out-of-order events idempotently.
- Execute untrusted student code only in a hardened, resource-limited isolated runner; never on the API/worker host. Disable live execution if safe isolation is unavailable.
- Treat repository content, diffs, code comments, and transcripts as untrusted input; protect prompts, secrets, and tool boundaries.
- Record deterministic tests, static/security checks, and structured AI review separately. Model output alone never approves a task.
- Task unlocks must be transactional, idempotent, and based on the latest eligible commit SHA and explicit backend approval policy.
- Provide adaptive remediation and competency tracking using persisted evidence; avoid unsupported claims about skill mastery.

## Development model guidance (coding IDE only)
- Wonder: Prompt 00 and Phases 01, 03–07, 09, 11.
- Spark 1.3: API preflight and Phases 02, 08, 10, 12.
- These are suggested IDE choices, conditional on access; they are not runtime routing requirements or performance guarantees.
- Model switches never replace verification or phase gates.

## Engineering workflow
For every requested phase:
1. Read this file, the PRD, playbook, and progress tracker; inspect existing code.
2. Propose a short plan and note assumptions or missing credentials.
3. Implement **only** the requested phase. Preserve existing interfaces and functionality.
4. Add migrations, unit/integration tests, and clear error handling as appropriate.
5. Run available tests, lint, and type checks; report actual commands and results. Never claim unrun tests passed.
6. Mark each integration as `LIVE`, `MOCK`, `BLOCKED`, or `UNTESTED`; never disguise a mock as real.
7. Update `docs/progress.md`, relevant architecture notes, `.env.example`, and README.
8. Stop and await explicit approval before starting the next phase.

## Security and quality
- No hardcoded secrets, client-side API credentials, or credentials in logs.
- Enforce authentication, object-level authorization, input validation, rate limits, and least privilege.
- Use typed schemas for API and AI outputs; bound timeouts/retries, job deduplication, and observability.
- Keep the application runnable after each phase. Prefer a working vertical slice over a large unverified code dump.
- Never invent successful provider connectivity, deployment, webhook delivery, sandbox isolation, or test execution.

## Demo-critical journey
Onboard -> view sprint -> talk to AI team -> voice standup -> confirm blocker -> Tech Lead sees blocker -> submit real GitHub PR -> sandbox tests + AI review -> progressive hints -> corrected PR -> deterministic unlock -> progress dashboard.

**Do not proceed to a new phase without the user's explicit instruction.**
