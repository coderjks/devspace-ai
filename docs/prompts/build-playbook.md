# DevSpace AI v2.2.1 — AI Coding Prompts and Build Guidelines

> **Canonical alignment:** `docs/prd/requirements.md` v2.2.1 controls product scope and acceptance criteria; `AGENTS.md` controls engineering guardrails; this playbook controls implementation sequence. P0 voice standup and Tech Lead voice discussion are mandatory MVP capabilities. Six seeded tickets (AI-001–AI-006), five AI teammates plus a separate Learning Assistant, shared orchestration, SHA-pinned GitHub evaluation, and deterministic unlocking are non-negotiable.

> Use this file in the same repository across all phases. Copy **one prompt at a time** into your AI coding IDE. Read `AGENTS.md` first. Keep the Word PRD under `docs/prd/` and its full Markdown equivalent at `docs/prd/requirements.md`. Do not assume model APIs or speech services exist until verified.

## Suggested coding IDE model per prompt

These are **development-time suggestions**, not runtime model bindings or verified comparative benchmarks. Use only models available in your IDE. Switching models never bypasses tests or security gates.

| Prompt | Recommended IDE model | Why |
|---|---|---|
| 00 | Muse Wonder | Project architecture and rules |
| API preflight | Muse Spark 1.3 | Small connectivity smoke test; verify actual API |
| 01 | Muse Wonder | Auth, schema, foundational architecture |
| 02 | Muse Spark 1.3 | Frontend and CRUD workflows |
| 03 | Muse Wonder | Shared orchestration and tool boundaries |
| 04 | Muse Wonder | Authorized actions and shared blocker state |
| 05 | Muse Wonder | GitHub signatures and webhook security |
| 06 | Muse Wonder | Sandboxing and evidence-based review |
| 07 | Muse Wonder | Transactional progression and idempotency |
| 08 | Muse Spark 1.3 | Speech adapters and push-to-talk UI |
| 09 | Muse Wonder | Cross-modal state and confirmed actions |
| 10 | Muse Spark 1.3 | Dashboard and UI polish |
| 11 | Muse Wonder | End-to-end security and reliability |
| 12 | Muse Spark 1.3 | Deployment/docs; escalate security issues to Wonder |

**Runtime routing:** configure model aliases by workload; verify IDs, access, capability, pricing and latency before enabling Wonder/Spark routes. STT and TTS require separately verified providers.

## How to use
1. Initialize the repository, add `AGENTS.md` and this playbook, and commit.
2. Run Prompt 00, then the API preflight, then Phase 01.
3. After each phase run the verification prompt and manually test its acceptance criteria.
4. Commit only verified, runnable work. Mark external integrations `LIVE`, `MOCK`, `BLOCKED`, or `UNTESTED` in `docs/progress.md`.
5. Do not give the IDE all phase prompts in one request.

## Prompt 00 — Repository orientation and guardrails
```text
Act as principal engineer for DevSpace AI. Read AGENTS.md, docs/prd/requirements.md, and docs/prompts/build-playbook.md. Inspect the repository and the canonical PRD (required). Summarize the architecture, existing implementation, open questions, and security boundaries. Create or update docs/progress.md with a phase checklist and integration status. Do not implement features yet. Do not assume an undocumented Meta endpoint or SDK. Propose Phase 01 implementation steps, then stop for approval.
```

## API preflight — Validate runtime model access
```text
Before implementing AI features, inspect the Meta model API documentation and credentials I provide. Verify actual base URL, authentication method, supported model IDs, structured output/tool calling, streaming, rate limits and pricing/quotas if documented. Create a minimal server-side smoke-test script using only verified APIs, with secrets from environment variables and sanitized errors. Distinguish the coding IDE from the runtime model API. If access cannot be verified, document a provider interface and mock mode without claiming connectivity. Do not put credentials in frontend code. Report the exact commands and observed results; stop.
```

## Phase 01 — Foundation, database, authentication
```text
Implement Phase 01 only. Follow AGENTS.md and inspect existing code. Create a monorepo with web/ (Next.js, TypeScript, Tailwind, shadcn/ui), api/ (FastAPI, Pydantic, SQLAlchemy 2, Alembic), worker/, curriculum/, infra/, docs/, tests/. Add Docker Compose for PostgreSQL and Redis, typed configuration, health checks, .env.example, README, migrations, and secure email/password authentication with logout and protected routes. Model User, Enrollment, Project, Sprint, Task, TaskDependency, Submission, Evaluation, AgentConversation, AgentMessage and ActivityEvent. Seed one demo Applied AI Engineering customer-support backend project and exactly six tickets AI-001 through AI-006 with dependencies as defined in the PRD. Add auth, migration and ownership tests. No AI, voice, or GitHub integration. Run tests and stop.
```
**Acceptance:** Sign in; retrieve authenticated student; fetch persisted seeded project; restart without losing data.

## Phase 02 — Onboarding, dashboard, curriculum, sprint board
```text
Implement Phase 02 only. Build polished responsive shadcn/ui onboarding (profile, experience, goals, optional short Python/Git diagnostic), enrollment, dashboard, team directory, 12-week Applied AI Engineering roadmap with exactly one fully specified six-ticket sprint, Jira-style Kanban, task detail pages with acceptance criteria/dependencies, and progress view. Use real authenticated FastAPI endpoints and PostgreSQL persistence; no fake frontend success state. Enforce allowed task transitions; students cannot mark evaluated tasks Done manually. Add tests, docs and setup steps. Do not implement AI or GitHub yet. Stop.
```
**Acceptance:** Student enrolls, opens ticket, starts work, and sees persisted dashboard updates.

## Phase 03 — Runtime Meta provider and six-role orchestration
```text
Implement Phase 03 only. Create typed LLMProvider interface and Meta adapter using only documented, verified API details; provide explicit mock mode. Implement AgentOrchestrator with six role configurations: Engineering Manager, Tech Lead, Senior Software Engineer, QA Engineer, Scrum Master, and separate Learning Assistant. Add scoped tools, role-specific instructions, shared project context, separate persisted conversations, usage/error logging, chat endpoints, and team chat UI. Model text cannot directly mutate authorization or task approval. Test role separation, ownership, malformed outputs, and unavailable provider. Stop.
```
**Acceptance:** Tech Lead accurately discusses current task; Scrum Master knows sprint status; context is persisted.

## Phase 04 — Standups and role-specific tools
```text
Implement Phase 04 only. Add role-specific prompts and permitted tools for onboarding, architecture guidance, debugging, QA feedback, standups, and progressive hints. Implement daily standup flow: Scrum Master asks completed/planned/blocked questions; parse a typed summary; show proposed changes; student confirms; backend records standup and blocker with authorization, audit log, and idempotency. Share confirmed blocker context with Tech Lead. Add tests for missing context, invalid tool calls, repeated confirmations, and role boundaries. Text only for now. Stop.
```
**Acceptance:** Confirmed standup blocker appears on board and in Tech Lead conversation.

## Phase 05 — GitHub App and pull requests
```text
Implement Phase 05 only. Create least-privilege GitHub App installation and repository linking, installation token management, webhook endpoint verifying HMAC on raw body, and handlers for pull_request opened/synchronize/reopened/closed. Persist delivery ID, repository ID, PR number, head SHA, student/task association and submission history. Verify repo ownership, reject forged payloads, deduplicate/reorder safely, enqueue jobs, and show linked PR status in UI. Include GitHub App setup instructions and tests. Do not execute code or generate AI reviews yet. Stop.
```
**Acceptance:** Real PR maps to correct task; push updates stored SHA; duplicate webhook does not duplicate submission.

## Phase 06 — Secure evaluation and AI PR review
```text
Implement Phase 06 only. Build background evaluation pipeline pinned to exact PR head SHA. Fetch exact revision/diff, run task-specific tests only in a hardened resource-limited isolated runner or managed sandbox, collect structured test/static/security results, then request structured Meta AI review with evidence-based findings. Validate schema, persist immutable evaluation, and show feedback. Treat student code/comments as prompt-injection input; never send secrets to runner or model. If safe sandbox unavailable, disable live execution and provide clearly labeled mock adapter. Test stale SHA, timeouts, retries, duplicate jobs, malformed review and security failures. Never approve solely from LLM output. Stop.
```
**Acceptance:** Review is tied to a real commit, with explicit test evidence and actionable feedback.

## Phase 07 — Approval, unlocking, adaptive remediation
```text
Implement Phase 07 only. Add deterministic TaskProgressionService and transactional state machine. Require latest eligible SHA, required test pass, security gates, and no unresolved blocking findings. Unlock dependent tasks exactly once; reject stale, unauthorized or duplicate approval attempts. Track competencies (Python, APIs, testing, security, databases, LLM integration, engineering practices) using evaluation evidence. Generate targeted remediation and three levels of progressive Learning Assistant hints without full solution dumps. Add concurrency, stale-commit, authorization and idempotency tests. Stop.
```
**Acceptance:** Failing PR yields remediation; fixed PR passes and unlocks dependent task exactly once.

## Phase 08 — Voice infrastructure
```text
Implement Phase 08 only. Add browser push-to-talk with permission handling, cancel/retry, audio validation, size/duration limits, and accessible transcripts. Create STTProvider and TTSProvider adapters using only verified provider APIs; support explicit mocks and text fallback. Route transcribed text through the existing AgentOrchestrator and play synthesized responses. Persist voice sessions/turn metadata and text transcripts with ownership checks, configurable retention and default no raw audio storage. Permit editing transcript before submission; preserve text/voice conversation continuity. Test permission denial, silence, timeout, authorization and fallback. No group meetings. Stop.
```
**Acceptance:** Student speaks to Tech Lead, hears response, then continues same conversation by text.

## Phase 09 — Voice standups and technical conversations
```text
Implement Phase 09 only. Build voice-led Scrum Master standup and Tech Lead one-on-one discussion using existing voice pipeline. Ask yesterday/today/blocker questions, extract structured summary, require student confirmation before updating sprint state, and share confirmed blocker with Tech Lead. Add transcripts, accessibility, silence/interrupt/repeat handling, and optional Hindi-English recognition where provider supports it. As stretch only, add PR-grounded technical design review with equivalent text option; do not score accents or verbal fluency as technical competence. Test full voice blocker-to-Tech-Lead flow. Stop.
```
**Acceptance:** Spoken blocker becomes a confirmed task blocker; Tech Lead knows it.

## Phase 10 — Progress and workplace polish
```text
Implement Phase 10 only. Build evidence-backed progress dashboard, task/evaluation history, skill competencies, sprint summaries, Engineering Manager check-ins, Scrum Master retrospective, notifications, team directory and accessible responsive empty/loading/error states. Derive metrics from persisted events; never fabricate progress or feedback. Add API and UI tests. Stop.
```
**Acceptance:** Dashboard and Engineering Manager feedback agree with actual evaluation records.

## Phase 11 — End-to-end security and reliability
```text
Implement Phase 11 only. Do not add major features. Test: onboarding -> task -> team chat -> voice standup -> confirmed blocker -> Tech Lead -> real GitHub PR -> sandbox tests -> AI review -> hints -> fix -> reevaluation -> unlock -> dashboard. Audit auth/ownership, webhook signatures/idempotency, exact SHA checks, prompt injection, runner isolation, secrets, rate limits, voice consent/retention, retries, transactions and accessibility. Run actual tests, fix critical issues, and create docs/qa-report.md listing PASS/FAIL/BLOCKED/UNTESTED with evidence. Stop.
```
**Acceptance:** Repeatable end-to-end flow without manual DB edits or disguised mocks.

## Phase 12 — Deployment and hackathon submission
```text
Implement Phase 12 only. Prepare production Dockerfiles, migrations, HTTPS/CORS/secrets, health checks, logging and deployment docs. Configure real GitHub webhook/callback and verified Meta provider. Deploy frontend, API, worker, PostgreSQL and Redis to chosen infrastructure; validate end-to-end against deployed URLs. Prepare demo seed/reset procedure, 5-minute script (voice standup -> shared context -> PR review -> hints -> unlock), architecture overview, and honest LIVE/MOCK/PARTIAL/DEFERRED feature list. Verify official hackathon rules from supplied source; do not invent requirements. Produce go/no-go checklist and stop.
```
**Acceptance:** Deployed demo works, submission artifacts are ready, limitations are explicit.

## Reusable verification prompt — run after every phase
```text
Audit the just-completed phase against AGENTS.md and the PRD. Run all available unit/integration tests, lint, type checks and migration checks; report exact commands, exit statuses and failures. Manually describe verification for external integrations. Fix issues within the phase scope. Mark dependencies LIVE/MOCK/BLOCKED/UNTESTED, update docs/progress.md and README, and stop. Do not start the next phase.
```

## Eight-day hackathon target (aggressive)
| Day | Work |
|---|---|
| 1 | Phases 01–02: foundation and UI |
| 2 | Phases 03–04: Meta model and team collaboration |
| 3 | Phase 05: GitHub App |
| 4 | Phase 06: evaluation pipeline |
| 5 | Phase 07: approval and remediation |
| 6 | Phases 08–09: voice and standups |
| 7 | Phases 10–11: polish and QA |
| 8 | Phase 12: deployment, demo, submission |

If behind schedule, protect the real PR evaluation, deterministic progression, and P0 voice standup/Tech Lead discussion with accessible text fallback. Defer P1 analytics, additional voice roles, and P2 design reviews.

## Recommended first commands
```bash
mkdir -p devspace-ai/docs/{prd,prompts,architecture,decisions}
cd devspace-ai
git init
# Place AGENTS.md at repository root and this file at docs/prompts/build-playbook.md
# Add the complete v2.2 PRD in docs/prd/requirements.md
# Then run Prompt 00 in your AI coding IDE.
```
