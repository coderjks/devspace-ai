# DevSpace AI — Progress Tracker

**Last updated:** 2026-10-29 (Phases 05–07 approved; trackers updated)
**Canonical PRD:** `docs/prd/requirements.md` v2.2.1
**Execution order:** `docs/prompts/build-playbook.md` v2.2.1
**Gate state:** Phases 05–07 DONE, verified and APPROVED (mock LLM path; live GitHub App + Meta preflight still need credentials). Committed on `feat/05-github` (`29109eb`), `feat/06-evaluation` (`e402287`), `feat/07-progression` (`e738d99`) — stacked, not pushed, not merged. Pointer at Phase 08 (voice infrastructure). Do not start Phase 08 without explicit instruction.
**Handoff:** New models/engineers start at [docs/handoff.md](/Users/jsaxena/Documents/devspace-ai/docs/handoff.md), then read this file.

---

## 0. Source-of-truth resolution

- `docs/prd/requirements.md` (v2.2.1) is the product and acceptance-criteria source of truth.
- `AGENTS.md` at repo root defines durable engineering constraints and modular-monolith structure.
- `docs/prompts/build-playbook.md` is the staged implementation sequence (Prompt 00 + API preflight + Phases 01–12 + verification prompt after every phase).
- `docs/prompts/DevSpace_AI_Build_Prompts_and_Guidelines.md` is the v2.2 companion draft (188 lines vs 146). It is **not** canonical and diverges in phasing wording; do not implement from it where it conflicts with the v2.2.1 playbook.
- `docs/prd/DevSpace_AI_Hackathon_PRD_v2_2_Voice_Enabled.docx` is the archived Word PRD; `requirements.md` is its Markdown equivalent and controls where they differ.
- Do not implement the legacy Section 18 one-shot prompt in `requirements.md`; it is superseded by the staged playbook.
- Section 21 voice P0 requirements supersede the earlier scope table (per PRD v2.2.1 synchronization block).

### 0.1 Path inconsistency — RESOLVED in Phase 01

- Renamed `docs/prompt/` → `docs/prompts/` so the on-disk path matches `AGENTS.md` and the PRD. `docs/architecture/README.md` created with ADR-001–005.

---

## 1. Architecture summary (Phase 01 foundation implemented; agents/GitHub/voice as designed)

### 1.1 Shape

Modular monolith in a monorepo. PostgreSQL is the source of truth. No microservices.

```
web/          Next.js + TypeScript + Tailwind CSS + shadcn/ui
api/          FastAPI + Pydantic + SQLAlchemy 2 + Alembic  (modular monolith)
worker/       Redis-backed async jobs (evaluation, model calls)
curriculum/   Versioned project / sprint / task definitions
infra/        Docker Compose (PostgreSQL, Redis, services)
tests/        API, integration, end-to-end tests
```

Logical modules (PRD §8): `auth, students, enrollment, curriculum, sprints, tasks, github, evaluations, agents, mentoring, skills, progress, audit`. Persona does not own independent truth; all six roles share PostgreSQL state and read the same authoritative project state.

### 1.2 Demo-critical journey (PRD §4, AGENTS.md § Demo-critical journey)

`Onboard → view sprint → talk to AI team (text) → voice standup → confirm blocker → Tech Lead sees blocker → submit real GitHub PR → sandbox tests + AI review → progressive hints → corrected PR → deterministic unlock → progress dashboard`

### 1.3 AI roles — one orchestrator, six configurations

| Persona | Responsibilities | Allowed tools (PRD §20.1) | Hard boundary |
|---|---|---|---|
| Engineering Manager | Onboarding, goals, progress check-ins, retrospectives | `read_progress`, `read_skill_summary`, `record_checkin` | Cannot approve PRs or change grades |
| Tech Lead | Architecture, task decomposition, planning | `read_project`, `read_tasks`, `propose_task_plan` | Cannot reveal reference implementations or bypass gates |
| Senior Software Engineer | Debugging, code-quality coaching, progressive hints | `read_pr_summary`, `read_review`, `propose_hint` | Cannot directly commit fixes or unilaterally approve |
| QA Engineer | Edge cases, acceptance-criteria coverage, test gaps | `read_test_results`, `read_acceptance_criteria`, `suggest_tests` | Cannot change trusted test outcomes |
| Scrum Master | Standups, blocker tracking, retrospectives | `read_sprint`, `record_standup`, `flag_blocker` | May update task status only via authorized backend rules |
| AI Learning Assistant (separate, not a coworker) | Concept explanations, Socratic hints, remediation | `read_skill_gaps`, `read_task_context`, `propose_hint` | No full solution, hidden tests, or reference code |

- One shared `AgentOrchestrator` loads versioned role config, student/task context, and conversation summary; calls one LLM provider adapter behind a typed `LLMProvider` interface (`review_code()`, `respond_as_teammate()`, `generate_hint()`, `propose_remediation()`).
- Frontend sends `persona_id`; backend validates enrollment and tool allowlist. Model text is never an authorization mechanism. Typed, validated tool requests + server-side permission checks; state changes audited.
- Separate persisted conversations per persona (`conversation_id`); shared facts in PostgreSQL. No autonomous background loops for hackathon.
- Prompt-injection defense: repository text, comments, diffs, transcripts are untrusted input; secrets, hidden tests, and credentials never enter prompts.

### 1.4 Voice — modality, not separate agents (PRD §21, AGENTS.md § Voice)

- Pipeline: Browser mic (explicit permission) → Voice Session API → STT adapter → existing Orchestrator → response text → TTS adapter → browser playback. Same `conversation_id` as text.
- P0: Scrum Master push-to-talk standup + Tech Lead one-on-one discussion (Section 21 supersedes earlier scope). P1: Manager, Senior Engineer, QA Engineer, Learning Assistant voice. P2/stretch: spoken design review. Simultaneous multi-agent voice meetings: out of scope.
- Push-to-talk first release: transcribe → editable transcript → propose structured actions → student confirmation card → dedicated backend tool executes authorized action. Transcript alone cannot approve or mutate consequential state.
- No raw audio retained by default; configurable retention/deletion. Visible recording indicator, stop control, text fallback for STT/TTS/timeout failures, transcript editing before submission, quotas/size/duration/rate limits, accessibility (captions, keyboard alternative, playback controls).

### 1.5 GitHub, evaluation, progression (PRD §§9–10, AGENTS.md § GitHub…)

- GitHub App, least-privilege permissions. Webhook: verify HMAC against raw body, store delivery ID, repo ID, PR number, exact head SHA, task association. Idempotent, reorder-safe.
- Evaluation pinned to exact SHA: worker checks out that commit in isolated runner → allowlisted lint/unit/hidden tests with CPU/memory/time/network limits → structured AI review (validated JSON: findings, severity, evidence, skill tags) → Policy engine.
- Approval is **not** an LLM tool call. Deterministic policy requires: (a) evaluated SHA == latest PR SHA, (b) required tests pass, (c) security checks pass, (d) no unresolved blocking findings, (e) rubric criteria satisfied, (f) no pending newer evaluation. Transactional + idempotency key. Human override needs reason + audit record. Stale SHA approvals rejected.
- Task unlocks transactional, idempotent, based on latest eligible SHA and explicit backend policy. Failed PR → targeted remediation + progressive hints (question → conceptual hint → targeted diagnostic; never full patch or hidden-test leak). Retries/appeals preserve prior attempts.

### 1.6 Curriculum invariant (PRD §§5, 9, AGENTS.md § Canonical scope)

Exactly one fully specified sprint, six tickets, plus a visible 12-week roadmap (not fully implemented):

| Ticket | Task | Depends on / assessment |
|---|---|---|
| AI-001 | Implement ticket creation REST API | Schema validation, tests |
| AI-002 | Add authorization to ticket access | AI-001; hidden negative-access tests |
| AI-003 | Integrate LLM ticket summarization | AI-001; structured output, error handling |
| AI-004 | Add retrieval over support knowledge base | AI-003; retrieval relevance fixture |
| AI-005 | Add safe order lookup tool | AI-002; tool permissions, audit |
| AI-006 | Evaluation and monitoring | AI-004; golden dataset, latency metrics |

Project: AI-powered customer-support backend (FastAPI, PostgreSQL, starter repo, pytest, Dockerfile, GitHub Actions).

### 1.7 Data model baseline (PRD §§11, 20.4, 21.6)

Core: `User, Enrollment, Project, Sprint, Task, TaskDependency, Submission, Evaluation, RepositoryLink, Conversation, SkillEvidence, AuditEvent`.
Additions: `agent_profiles, conversations, messages, standups, agent_tool_audit, hint_events`; `voice_sessions, voice_turns, voice_action_proposals`. Every evaluation persists model version, prompt template version, test suite version, SHA, policy version, decision reason.

### 1.8 Suggested API surface (PRD §§12, 20.4, 21.5 — to be confirmed in Phase 01)

Auth/enrollment/board: `POST /api/enrollments`, `GET /api/sprints/current`, `GET /api/tasks/{id}`.
Agents: `GET /api/team`, `POST /api/agents/{persona_id}/messages`, `GET /api/agents/{persona_id}/conversations`, `POST /api/standups`, `POST /api/tasks/{id}/hint`, `POST /api/learning/hints`.
GitHub/evaluation: `POST /api/github/webhook`, `GET /api/submissions/{id}/evaluations`, `POST /api/evaluations/{id}/appeal`, `GET /api/progress`.
Voice: `POST /api/voice/sessions`, `POST /api/voice/sessions/{id}/turns`, `POST /api/voice/sessions/{id}/confirm-action`, `GET /api/voice/sessions/{id}/turns`, `DELETE /api/voice/sessions/{id}`.

---

## 2. Existing implementation — inventory (Phase 01, verified 2026-10-27)

| Area | Implementation | Status |
|---|---|---|
| `web/` | Next.js 14 + TS + Tailwind + shadcn/ui: `/`, `/login`, `/onboarding`, `/dashboard`, `/board` (Kanban), `/tasks/[id]`, `/team`, `/roadmap`, `/progress` + shared `SiteHeader` | **DONE** — `npm run build` + `typecheck` pass |
| `api/` | FastAPI modular monolith: Phase 01 modules + routers `users/enrollments/diagnostics/tasks/progress/roadmap/team`, shared `task_view`; Alembic `20261027_0001` → `20261028_0002` | **DONE** |
| `worker/` | Redis ping stub (no jobs; Phase 06) | DONE (stub) |
| `curriculum/` | `sprint-01.json` + `roadmap-12wk.json` (12 weeks, week 1 active) | DONE |
| `infra/` | `docker-compose.yml`: postgres:16, redis:7, api, worker, web; `${POSTGRES_PORT:-5432}`/`${REDIS_PORT:-6379}`; `config` validates | DONE |
| `tests/` | `tests/api/` 32 tests (Phase 01 suite + enrollment/onboarding, transitions, workplace, onboarding columns) | DONE — 32 passed |
| `docs/architecture/` | `README.md` ADR-001–007 | DONE |
| `docs/handoff.md` | Model-switch handoff: read order, run commands, pitfalls, gate | DONE |
| `.env.example` / `README.md` | Typed template (direct vs pooled DB notes) + setup commands | DONE |
| Database / migrations | Alembic `0001`→`0002` upgrade verified on Postgres 16 (Docker, port 5433); enrollments carry `experience_level` + `diagnostic_result`; 11 tables | DONE |
| Auth | Register/login/logout, httpOnly cookie + Bearer, `GET /api/auth/me`, `PATCH /api/users/me`, owner-scoped enrollments; PBKDF2-SHA256 + HS256 JWT | DONE |
| Git history | `main` = `3e39603` (docs only); `feat/01-foundation` = `ac23eb3`; `feat/02-onboarding-board` = `5cc676e` (Phase 02) → `b0c9ba2` (landing) → `bfcb827` (auth) → `1c9efac` (theme) → `8541c86` (skill) + this docs update | COMMITTED (not pushed) |

---

## 3. Phase checklist

Status key: `DONE` verified · `IN PROGRESS` · `NOT STARTED` · `BLOCKED` (named blocker) · `DEFERRED`.

| Step | Scope (one-line) | Gate / acceptance | Status |
|---|---|---|---|
| **Prompt 00** — Orientation & guardrails | Read PRD/playbook/AGENTS.md, inventory repo, write this tracker, propose Phase 01, stop | This file exists; no features implemented | **DONE** (this pass) |
| **API preflight** — Validate runtime model access | Inspect Meta docs + credentials; server-side smoke test; verify base URL, auth, model IDs, structured output/tool calling, streaming, limits/pricing; mock mode if unverifiable; stop | Observed provider response or documented `BLOCKED` with exact missing config; no frontend keys | **NOT STARTED** — no credentials supplied |
| **Phase 01** — Foundation, DB, auth | Monorepo scaffold, Docker Compose PG+Redis, typed config, health checks, `.env.example`, Alembic models (User…ActivityEvent), seed demo project + AI-001–AI-006, email/password auth + logout + protected routes, auth/migration/ownership tests. No AI/voice/GitHub. | Sign in; fetch authenticated student; fetch persisted seeded project; restart retains data | **DONE** — verified §9 |
| **Phase 02** — Onboarding, dashboard, board | Onboarding (profile, experience, goals, diagnostic), enrollment, dashboard, team directory, 12-week roadmap (one full sprint), Kanban + task detail, progress view; backend-enforced transitions; students cannot mark evaluated tasks Done | Enroll → open ticket → start work → persisted dashboard updates | **DONE** — verified §10 |
| **Phase 03** — Runtime provider + six-role orchestration | Typed `LLMProvider` + Meta adapter (verified IDs only) with explicit mock; `AgentOrchestrator`, six role configs, scoped tools, shared context, separate conversations, usage logging, chat endpoints + UI | Tech Lead discusses current task; Scrum Master knows sprint status; context persists | **DONE** — approved 2026-10-29 (mock path; live preflight pending credentials) |
| **Phase 04** — Standups & role tools | Role-specific tools; standup flow (ask → typed summary → proposed changes → confirm → persist blocker + audit, idempotent); blocker visible to Tech Lead. Text only. | Confirmed blocker on board + in Tech Lead conversation | **DONE** — approved 2026-10-29: page-09 standup flow + page-10 feed (timeline, role comments, live-wired submissions), 61 tests green |
| **Phase 05** — GitHub App & PRs | Least-privilege App install, repo linking, short-lived tokens, HMAC webhook on raw body, PR opened/synchronize/reopened/closed, delivery/repo/PR/SHA/task persistence, dedupe, UI status. No code execution yet. | Real PR maps to correct task; push updates SHA; duplicate webhook is no-op | NOT STARTED |
| **Phase 06** — Secure evaluation & AI review | SHA-pinned pipeline: isolated runner (CPU/mem/time/network limits) or disabled live exec, structured test/static/security results, schema-validated AI review, immutable evaluation, injection-hardened | Review tied to real commit with explicit test evidence | NOT STARTED |
| **Phase 07** — Approval, unlocking, remediation | `TaskProgressionService`, transactional state machine (latest SHA + tests + security + no blockers), exactly-once unlock, competencies, bounded remediation, 3-level hints, concurrency/stale/idempotency tests | Failing PR → remediation; fixed PR → approve → unlock exactly once | NOT STARTED |
| **Phase 08** — Voice infrastructure | Push-to-talk (permission, cancel/retry, size/duration/MIME limits), `STTProvider`/`TTSProvider` adapters (verified APIs only) + mocks, editable transcript, orchestrator routing, session/turn persistence, no-raw-audio default, text fallback | Speak to Tech Lead, hear reply, continue same conversation by text | NOT STARTED |
| **Phase 09** — Voice standups & discussions | Voice Scrum Master standup (structured summary → confirmation → board) + voice Tech Lead 1:1, shared blocker context, accessibility, silence/repeat handling; stretch: PR-grounded design review (text-equivalent, no accent scoring) | Spoken blocker confirmed → on board; Tech Lead knows it | NOT STARTED |
| **Phase 10** — Progress & workplace polish | Evidence-backed progress dashboard, evaluation history, competencies, sprint summaries, Manager check-ins, Scrum retrospectives, notifications, team directory, a11y/empty/loading/error states | Dashboard and Manager feedback agree with evaluation records | NOT STARTED |
| **Phase 11** — E2E security & reliability | Full journey test; audit auth/ownership, webhook idempotency, SHA checks, injection, runner isolation, secrets, rate limits, voice consent/retention, retries, transactions, a11y; `docs/qa-report.md` with PASS/FAIL/BLOCKED/UNTESTED | Repeatable E2E without manual DB edits or disguised mocks | NOT STARTED |
| **Phase 12** — Deployment & submission | Production Dockerfiles, migrations, HTTPS/CORS/secrets, health/logging, real webhook/provider config, deployed E2E validation, demo seed/reset, 5-minute script, LIVE/MOCK/PARTIAL/DEFERRED matrix, go/no-go checklist | Deployed demo works; limitations explicit | NOT STARTED |
| **Verification prompt** (after every phase) | Audit phase vs AGENTS.md/PRD; run tests/lint/type/migration checks; report exact commands/exit codes; fix in-phase; update this file + README; stop | Required before any next phase | PENDING (applies Phase 01 onward) |

Schedule pressure (playbook): 8-day aggressive target. If behind, protect the real PR evaluation, deterministic progression, and P0 voice standup/Tech Lead discussion with text fallback; defer P1 analytics, extra voice roles, P2 design reviews.

---

## 4. Integration status

Legend (AGENTS.md § Engineering workflow): `LIVE` real provider verified · `MOCK` explicit mock adapter · `BLOCKED` named blocker · `UNTESTED` not yet exercised.

| Integration | Phase introduced | Status | Evidence / blocker |
|---|---|---|---|
| Meta model runtime (LLM gateway, review/chat/hints) | API preflight, Phase 03 | **MOCK** (live UNTESTED) | Explicit mock adapter labeled in UI; Meta adapter fail-closed and unused. No credentials, base URL, or model IDs verified for this account. Do not assume endpoint/SDK. See §6 Q2. |
| GitHub App (install, tokens, webhook) | Phase 05 | **MOCK-path live** (real github.com UNTESTED) | HMAC/dedupe/mapping verified with synthetic signed deliveries + manual mode. No App created, no installation, no webhook secret configured. See `docs/github-app-setup.md`. |
| Isolated code runner / sandbox | Phase 06 | **Disabled by design** | Static non-executing checks only; no sandbox selected. Live execution stays off; mock review labeled advisory. |
| Muse Spark 1.3 / Muse Wonder routing | API preflight | **UNTESTED** | Optional configurable routes per PRD §13; coding-IDE model choice is distinct from runtime routing. Never hardcode unverified IDs. |
| Speech-to-text (STT) | Phase 08 | **UNTESTED** | No provider selected or verified. (Companion draft names `muse-voice-transcribe-1.0` for STT; v2.2.1 canonical text does not — treat as unverified until API preflight.) |
| Text-to-speech (TTS) | Phase 08 | **UNTESTED** | No provider selected. Muse Voice Transcribe does not synthesize speech; separate TTS provider required. |
| GitHub App (install, tokens, webhook) | Phase 05 | **UNTESTED** | No App created, no installation, no webhook secret configured. |
| Isolated code runner / sandbox | Phase 06 | **UNTESTED** | No runner chosen. If unavailable, live execution must stay disabled with a labeled mock adapter. Never run student code on API/worker host. |
| PostgreSQL | Phase 01 | **LIVE** (local Docker) | Postgres 16 via Compose verified: Alembic `20261027_0001` applied, seed + login + restart persistence checked (see §9). Production/Neon still `UNTESTED`. Migrations use direct `DATABASE_URL_UNPOOLED`. |
| Redis (worker queue) | Phase 01 | **LIVE** (local Docker, stub) | Redis 7 `PONG` verified; worker only pings in Phase 01. Job processing `UNTESTED` until Phase 06. |
| Auth (email/password session) | Phase 01 | **LIVE** (local) | Register/login/logout/`/me` verified by 14 tests + live curl; cookie + Bearer. |
| Deployment / hosting | Phase 12 | **UNTESTED** | No target selected. Local servers stopped after verification (macOS cannot detach; see §9). |

Meta/GitHub/STT/TTS/runner remain `UNTESTED`. Nothing external is mocked and disguised as real.

---

## 5. Security boundaries (must hold in every phase)

Source: PRD §§7, 10, 20–21; AGENTS.md §§ GitHub/evaluation/progression, Security and quality.

1. **Approval boundary** — LLM output never approves, unlocks, or mutates protected state. Deterministic server-side policy (latest SHA + tests + security + no blockers) in a transaction; model proposes, backend disposes. Human override requires reason + audit.
2. **Code execution boundary** — Untrusted student code only in a hardened, resource-limited isolated runner (CPU/memory/time, no outbound network by default, no production secrets). Never on API/worker host. Disable live execution if isolation is unavailable.
3. **Webhook boundary** — Verify GitHub HMAC against the raw payload; validate repo ownership + task association; persist delivery ID / repo ID / PR / exact head SHA; deduplicate and handle out-of-order events idempotently; reject forged payloads.
4. **Prompt-injection boundary** — Repo contents, diffs, comments, transcripts, and user messages are untrusted input. Never place secrets, hidden tests, model credentials, or system prompts where untrusted input can exfiltrate them. Agent tool calls validated against server-side allowlists + per-user permissions; audit all mutations (`agent_tool_audit`, `AuditEvent`).
5. **Authorization boundary** — Authentication + object-level authorization on every endpoint (student owns enrollment, conversations, voice sessions, submissions). Rate limits, input validation, typed schemas for API and AI outputs, bounded timeouts/retries, job deduplication.
6. **Secrets boundary** — Server-side only, via environment; `.env.example` with placeholders; never in frontend, logs, runner, or model prompts.
7. **Voice/privacy boundary** — Explicit mic permission + consent before recording; visible indicator; no raw audio by default; transcript retention/deletion policy; quotas and size/duration limits; transcript cannot directly authorize consequential actions (confirmation + server validation required); no scoring on accent/fluency/ASR confidence; no background recording.
8. **Auditability** — Persist model version, prompt template version, test suite version, SHA, policy version, and decision reason for every evaluation; competency claims must cite evaluation evidence, not model assertion.
9. **Honesty boundary** — Simulation, not employment/accreditation/placement guarantee. Every integration labeled `LIVE`/`MOCK`/`BLOCKED`/`UNTESTED`. Never invent provider connectivity, webhook delivery, sandbox isolation, or test passes.
10. **Cost boundary** — Per-student quotas, token budgets, capped evaluations per task; model routing only with verified pricing/limits.

---

## 6. Open questions / decisions needed before or during Phase 01

| # | Question | Why it blocks | Proposed default if unanswered |
|---|---|---|---|
| Q1 | ~~Fix the `docs/prompt/` vs `docs/prompts/` inconsistency~~ | RESOLVED | Renamed to `docs/prompts/` in Phase 01 |
| Q2 | Runtime Meta access: base URL, auth method, model IDs (Wonder/Spark), structured-output/tool-calling support, rate limits/pricing for this account? Which credentials will be supplied and when? | API preflight cannot proceed; runtime routing and mock boundary depend on it | Implement typed `LLMProvider` + explicit `MOCK` mode; claim nothing live until smoke test passes |
| Q3 | STT and TTS providers: which verified services (Meta or third-party), with what terms/latency/pricing? Does the account have STT access? | Phase 08 provider adapters and Phase 09 P0 voice depend on it; Muse Spark access does not imply STT/TTS | Defer provider choice to Phase 08; design adapter interfaces in Phase 03–04 so voice can land later without rework |
| Q4 | ~~Auth shape~~ | RESOLVED (Phase 01) | Email/password, PBKDF2-HMAC-SHA256 (600k) + HS256 JWT in httpOnly cookie (Bearer also accepted), seeded `demo@devspace.ai` |
| Q5 | Sandbox strategy: managed ephemeral CI vs self-hosted hardened runner (Docker/gVisor/Firecracker), network policy, allowlisted commands? | Phase 06 gate; if unavailable, live execution stays disabled | Adapter + labeled mock in Phase 06; decide runner before Phase 05 completes |
| Q6 | GitHub App: who creates it, which permissions (contents/pull_requests/checks read + webhook), which starter repo, installation model? | Phase 05 real-PR gate; permissions delays are PRD-listed risk | Preinstalled App + seeded repo fallback noted in PRD §16; create during Phase 05 |
| Q7 | Deployment target for Phase 12 (host, domain, HTTPS)? | Phase 12 only; not blocking Phases 01–07 | Decide at Phase 11; keep Docker Compose portable |
| Q8 | ~~`docs/architecture/` contents~~ | RESOLVED | `docs/architecture/README.md` ADR-001–005 |
| Q9 | ~~Curriculum versioning~~ | RESOLVED | `curriculum/sprint-01.json` loaded by seed; rubric/criteria as JSON columns |
| Q10 | Test strategy | PARTIAL | Pytest+TestClient (14 tests) done; web covered by `typecheck`+`build` (no Vitest yet); Playwright from Phase 11 |

---

## 7. Phase 01 — implemented (approved with `go`)

Scope exclusions honored: no AI, voice, or GitHub code. Delivered: monorepo scaffold, Docker Compose, typed config, health endpoints, `.env.example`, Alembic models + migration `20261027_0001`, idempotent seed (demo user + AI-001–AI-006), email/password auth with logout/protected routes, auth/migration/ownership tests, README + architecture ADRs.

**Acceptance:** Sign in; fetch authenticated student; fetch persisted seeded project; restart retains data — all verified (§9).

---

## 8. Change log

| Date | Entry |
|---|---|
| 2026-10-27 | Prompt 00 orientation: repo inventoried as greenfield (no commits, no code); architecture, security boundaries, open questions documented; Phase 01 proposed; awaiting approval. Integrations all `UNTESTED`. |
| 2026-10-27 | Phase 01 implemented on `go`: `docs/prompt/`→`docs/prompts/`, monorepo + auth + seed + migrations + tests. Verified (§9). Awaiting approval for API preflight / Phase 02. |
| 2026-10-27 | Added [docs/handoff.md](/Users/jsaxena/Documents/devspace-ai/docs/handoff.md) for model switching (read order, verified run/test commands, integration status, pitfalls, security boundaries, next-gate rules). No feature changes; no commits. |
| 2026-10-28 | First commits created: `main` `3e39603` docs-only (`docs:`), then branch `feat/01-foundation` `97290ee` (`feat(foundation):`, 51 Phase 01 files; 14 tests re-verified before commit). Working tree clean. Not pushed. Prepared for Muse Spark 1.3 model switch — see handoff §3/§12 for the starter prompt. |
| 2026-10-28 | Branch `feat/02-onboarding-board` created from `feat/01-foundation`; Phase 02 implemented (enrollment/onboarding API, transitions, progress, roadmap, team; 6 new pages) and verified (§10). Committed as `5cc676e` (`feat(onboarding):`, 31 files). API preflight still pending. |
| 2026-10-28 | Local setup run for user review (Docker Postgres/Redis, migrated + seeded, API :8000, web :3000). Fixed browser login failure by allowing both `localhost:3000` and `127.0.0.1:3000` CORS origins; demo login verified live. |
| 2026-10-28 | Landing page redesigned on `feat/02-onboarding-board` (dark, `components/landing/` ×11 + `app/page.tsx`; CTAs → `/login`, `/onboarding`; no legal links — those pages don't exist). `typecheck` + `build` pass; served HTML verified (1 h1, all anchors, disclaimer). No browser visual test performed. Uncommitted; no phase advanced. |
| 2026-10-28 | Landing page rebuilt against the supplied reference image on `feat/02-onboarding-board`: tokens `#09090F/#14141F/#8B5CF6/#38BDF8`, two-column hero with dashboard preview, journey/AI-team/workflows/FAQ/CTA/footer; roadmap+comparison sections removed; “Trusted by” logos omitted (fabricated endorsements banned). `typecheck` + `build` pass; served HTML + stylesheet verified. No browser visual test performed. Uncommitted; no phase advanced. |
| 2026-10-28 | Auth page rebuilt against the Page 02 reference on `feat/02-onboarding-board`: split-screen (`components/auth/` ×7 + `app/login/page.tsx`), brand panel with Kanban/chat preview, tabbed Sign In/Sign Up wired to the existing email/password contract. Omitted per brief+contract: OAuth buttons (no provider configured), forgot-password link (no endpoint), Terms/Privacy links (no pages), testimonial and trust logos (unverified). `typecheck` + `build` pass; served HTML verified. No browser visual test performed. Uncommitted; no phase advanced. |
| 2026-10-28 | Fixed “signup not working”: the long-running dev server was serving HTML but 404ing all JS chunks (stale incremental cache), leaving the page non-interactive; the register API itself verified 201 throughout. Restarted dev with cleared `.next`; all chunks + CSS now 200. If interactivity ever dies again while HTML still loads, check chunk URLs before touching code. |
| 2026-10-28 | Dual-theme design system implemented on `feat/02-onboarding-board` (uncommitted): var-driven Tailwind (`darkMode: class`) + `next-themes` (Light default, Dark, System, persisted), tokens for bg/fg/card/popover/primary/secondary/muted/accent/border/input/ring/destructive/success/warning/info/chart×5/sidebar, radius 12/10/8, 16px base, global focus ring + reduced-motion kill-switch, ThemeToggle in landing nav + app header, landing + auth migrated off hardcoded colors, new `docs/design/design-system.md`. `typecheck` + `build` + 32 pytest pass; served CSS contains both themes; SSR defaults to light. Theme switching/persistence code-verified via next-themes, not browser-tested. No backend changes; no phase advanced. |
| 2026-10-28 | Theme toggle replaced the confusing Light→Dark→System cycle button with an explicit menu (Light/Dark/System + checkmark, Escape/outside-click close). A transient `next build` failure (`Cannot find module for page: /board`) was stale `.next` contention with the running dev server, not code — clean rebuild passes 11/11. Served HTML + CSS re-verified. |
| 2026-10-28 | Committed the UI work on `feat/02-onboarding-board` as reviewed units: `b0c9ba2` feat(landing, 11 files), `bfcb827` feat(auth, 8 files), `1c9efac` feat(theme incl. design-system.md, 15 files), `8541c86` feat(skills, token-efficient-research). `reference_images/` (3.3MB supplied PNGs) deliberately left untracked. Not pushed. |
| 2026-10-28 | Premium UI polish pass on `feat/02-onboarding-board` (uncommitted): CSS-only motion system (Reveal + keyframes, no new deps), elevation tokens, display typography, bento workflows with PR showcase, 12-week roadmap strip, animated FAQ, sticky blurred nav/headers, shared StatusBadge/Skeleton/EmptyState, skeleton loading on board/dashboard/task, auth transitions + spinner buttons. Palette unchanged. No backend changes; no phase advanced. |
| 2026-10-28 | Committed the polish pass as `feat(polish)` (37 files, incl. `.gitignore` for `reference_images/`); fixed a stale-`.next` unstyled-page incident by restarting the user dev server with a cleared cache (CSS 404 → 200). `typecheck` + `build` (11/11) + 32 pytest pass. Not pushed. |
| 2026-10-28 | Orchestration setup on `feat/02-onboarding-board` (uncommitted): `automation/orchestrator.md`, `automation/subagent-contracts.md`, `automation/orchestration-state.json`, `automation/README.md`, `.agents/skills/build-screen/SKILL.md` (+ worktree caveat). Page-03 smoke test: manifest/prompt/image/skill-discovery/subagent-roundtrip/worktree-cycle/stop-clean all PASS; no app code changed. Pages 01–03 marked `done-prior` in state. Not pushed. |
| 2026-10-28 | Phase-aware execution added (uncommitted): `automation/execution-plan.yaml` (12 phases, plan order, 08/11/12 manual gates), skill §§5–6 (selection + intents), state extended compatibly (phase/active/approved/blocked/non-UI), orchestrator §6 pointer. Read-only validation 10/10 PASS; next eligible = page-01 (done-prior, needs validation + approval, not rebuild). No implementation agents invoked; no app logic changed. Not pushed. |
| 2026-10-28 | Workflow ran `Build next screen` → page-01 (uncommitted): selection per plan, no FE/BE builders (already implemented, no rebuild), `qa-page-01` validation only — typecheck PASS, build 11/11 PASS, all routes/anchors 200, reference fidelity confirmed, visual QA UNTESTED. State `awaiting_approval`. No app code changed. Not pushed. |
| 2026-10-28 | Approved page-01 (explicit instruction). `qa-page-02` validation only — /login 200 themed, OAuth/forgot/legal correctly absent, spinner/alert/409 states PASS, 4 auth tests PASS, live register+login returned token, visual UNTESTED. Page-02 approved (explicit instruction + clean QA). Next eligible: page-03 (depends on approved page-02). No app code changed. Not pushed. |
| 2026-10-28 | Workflow ran `Build next screen` → page-03 (uncommitted): `qa-page-03` validation only — route/states/typecheck/6 backend tests/live E2E PASS, visual UNTESTED, but DEVIATIONS vs prompt: 3-step not 4-step, no review step, no completion guard, no back-nav, wizard state lost on reload, step-2 load-failure nit. State `awaiting_approval`; needs approve-as-is or fix decision. Also repaired `orchestration-state.json` duplicate keys from successive edits (single clean object, phase 02). No app code changed. Not pushed. |
| 2026-10-28 | Fixed page-03 gaps via `fe-page-03` (uncommitted, `web/app/onboarding/page.tsx` only): 4-step wizard + review/confirm, enrollment completion guard, Back on steps 2–4, sessionStorage restore, gated question load; `qa-page-03-reverify` all PASS (typecheck 0, 6/6 backend tests, live E2E; live reload UNTESTED). Lead added one-line guard disabling Submit with zero questions; typecheck clean, /onboarding 200. State `awaiting_approval`. Not pushed. |
| 2026-10-28 | Page-03 APPROVED (explicit instruction, gaps fixed + re-verified). Phase 02 screens done (01–03 approved; page-18 optional skipped). Next eligible: page-04 (depends on approved page-03). Changed, uncommitted: `web/app/onboarding/page.tsx`. Not pushed. |
| 2026-10-28 | Autonomous Phase 02 completion (uncommitted): page-04 QA→`fe-page-04` (next-action, activity, teammates, disabled Phase 04/05 strip) re-verified PASS; page-05 QA→`fe-page-05` (search + board/list toggle) re-verified PASS; page-06 root-caused (Next15 `use(params)` 500 on Next14) + fixed + verified PASS. Journey E2E green (register→detail→transition 200s, approve 409, unauth 401, 8/8 routes 200); 32 pytest + typecheck clean. Phase 02 `awaiting_approval`, pages 04–06 NOT approved. Changed: dashboard, board, task-detail pages. Not pushed. |
| 2026-10-28 | Pages 04–06 APPROVED (explicit instruction). Phase 02 complete: screens 01–06 approved (page-18 optional skipped). State pointer advanced to page-07; Phase 03 needs API preflight first. Not pushed. |
| 2026-10-28 | Phase 03 chat done on mock path (uncommitted, branch `feat/03-ai-orchestrator`): typed LLMProvider + Meta adapter (fail-closed, unused) + Mock adapter, 6 versioned roles, orchestrator with enrollment/ownership/persistence/audit, 3 chat endpoints, team chat UI with mock badge. 45 pytest + ruff + mypy + typecheck + build (12/12) green; `qa-team-chat` PASS; live E2E (context, status, persistence, enum-repr fix verified). Meta preflight still pending credentials. State `awaiting_approval`. Not pushed. |
| 2026-10-29 | Phase 03 APPROVED (explicit instruction, mock path). Screens 01–08 approved. Pointer at page-09 (Phase 04 standups). Meta preflight still pending credentials. Not committed, not pushed. |
| 2026-10-28 | Post-approval shell rework via `fe-app-shell` (uncommitted): new `web/components/app-shell.tsx` (sidebar + slim topbar + full-width, mobile drawer), 6 routes migrated off deleted SiteHeader, new `/profile` (read-only email/enrollment + PATCH name). `qa-app-shell` regression PASS, typecheck 0, all routes 200, visually confirmed via headless screenshots. Not pushed. |
| 2026-10-28 | Headless Chrome pass (Playwright-core + installed Chrome, throwaway enrolled user): login→dashboard→board(search/clear/list)→task all render correctly — screenshots confirm next-action, activity, teammates, coming-next, StatusBadges, review card; search filters to AI-001 and clears to 6; list toggle flips aria-pressed; mobile landing zero h-overflow. Remaining script-side (not app) issues: dashboard regex was case-sensitive (kicker is uppercase — visually confirmed present), dark test used media emulation but theme is class-based (needs toggle click), transition step assumed todo but task was already in_progress (API-proven separately). Dark-theme pixels + live reload-restore still unverified. Screenshots in /tmp/verify/shots (not committed). |
| 2026-10-29 | Phase 03 APPROVED (explicit instruction, mock path). Branch `feat/03-ai-orchestrator` pushed (`a2929c7` orchestration + mock-first provider, `3da05c1` chat UI, `aa9648c` tooling/trackers). Screens 01–08 approved. Meta preflight still pending credentials. |
| 2026-10-29 | Phase 04 page-09 built on stacked `feat/04-standups`: Standup model + migration, idempotent propose/confirm, blocker on task + audit + Tech Lead system message, tool registry, `/standup` wizard + `/activity` history + sidebar links + board/task badges. Live E2E green; 54 pytest + mypy + build clean. Committed as `4e59883`. |
| 2026-10-29 | Phase 04 page-10 built: `GET /api/activity` composes system events + role comments + live-wired submissions via swappable source adapters (no mock rows); `/activity` UI adds timeline, teammate comments, submissions sections. 7 new tests (61 total) + ruff + mypy + build green; live feed verified. Committed as `88cb2e5`. Phase 04 APPROVED (explicit instruction). Pointer at Phase 05. |
| 2026-10-29 | Phase 05 built on `feat/05-github`: HMAC webhook + delivery dedupe + PR→task mapping, repo linking, manual PR-URL submit, Redis eval queue, `/github` page + per-ticket submit card, setup docs + delivery simulator. 11 API tests; live synthetic-delivery E2E green. Committed as `29109eb`. |
| 2026-10-29 | Phase 06 built on `feat/06-evaluation`: SHA-pinned pipeline (idempotent, stale detection), safe static checks + secret redaction, schema-validated review with mock-label fix, Redis worker with retries, `/submissions/[id]` report. 12 API tests; real worker run green. Committed as `e402287`. |
| 2026-10-29 | Phase 07 built on `feat/07-progression`: deterministic policy (checks approve, review only vetoes), exactly-once approval + unlock transaction, rubric-grounded competencies, template remediation with 3 hints, `/progression` page. 7 API tests (90 total); live denied→remediation→approved→unlock E2E green. Committed as `e738d99`. Phases 05–07 APPROVED (explicit instruction). Pointer at Phase 08. |

---

## 9. Phase 01 verification evidence (2026-10-27)

Commands run in this session; exit statuses observed, not assumed.

| Check | Command | Result |
|---|---|---|
| API tests | `DATABASE_URL=sqlite… .venv/bin/python -m pytest tests/ -q` | **14 passed** (health, auth, projects/ownership, seed/migrations) |
| Lint | `.venv/bin/ruff check api/app/ tests/` | All checks passed (after `--fix` import sort) |
| Types (API) | `.venv/bin/mypy api/app/ --ignore-missing-imports` | Success, 13 files |
| Alembic (SQLite) | `alembic upgrade head → downgrade base → upgrade head` (from `api/`) | Clean cycle; 11 app tables + `alembic_version`; downgrade enum-drop guarded to Postgres |
| Alembic (Postgres) | Compose Postgres 16 on `POSTGRES_PORT=5433` (host 5432 occupied by another stack; left untouched) + `alembic upgrade head` | `20261027_0001 (head)` |
| Seed | `python -m app.seed` ×2 against Postgres | Idempotent: 6 tasks each run |
| Live API | `uvicorn` on :8000 + `curl /health`, `/health/db`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/projects/current` | Health OK; demo login OK; project returns AI-001 `todo` + AI-002…006 `locked` with correct dependencies; unauthenticated project = 401 |
| Restart persistence | Kill + restart API, re-login | Same user id, 6 tasks retained |
| Redis | Compose Redis 7 `redis-cli ping` | `PONG` |
| Web types/build | `npm run typecheck`, `npm run build` (in `web/`) | Both pass; routes `/`, `/login`, `/dashboard` |
| Web+API smoke | Next `start` :3000 + API :8000, `curl` both | Web `/` 200, `/login` 200, API health 200 |
| Compose | `docker compose config` | Valid |

**Known limitations:** Docker full-stack (`up --build` for api/web/worker images) was not run end-to-end (only Postgres/Redis containers + host API/Web were exercised). Host Postgres on :5432 belongs to another stack and was not touched; our Compose defaults remain :5432/:6379 with port overrides. Local servers were stopped after verification — this macOS host cannot detach a durable server (`setsid` unavailable), so nothing is left running. Browser interaction (click-through login) was verified via HTTP + build, not a real browser. (Commits were created afterwards — see change log 2026-10-28.)

---

## 10. Phase 02 verification evidence (2026-10-28, branch `feat/02-onboarding-board`)

Commands run in this session; exit statuses observed, not assumed.

| Check | Command | Result |
|---|---|---|
| API tests | `DATABASE_URL=sqlite… .venv/bin/python -m pytest tests/ -q` | **32 passed** (Phase 01 suite + enrollment/onboarding, transitions, workplace, onboarding columns) |
| Lint | `.venv/bin/ruff check api/app/ tests/` | All checks passed (after `--fix` import sort) |
| Types (API) | `.venv/bin/mypy api/app/ --ignore-missing-imports` | Success, 22 files |
| Alembic (Postgres) | Compose Postgres 16 on `POSTGRES_PORT=5433` + `alembic upgrade head` | `20261027_0001 → 20261028_0002` clean; seed ×2 idempotent |
| Live E2E | Fresh user: register → enroll → diagnostic (4 questions) → task detail → `todo→in_progress` → progress/roadmap/team | Enroll OK; 3 criteria shown; transition `in_progress`; progress `total 6, started 1`; 12 weeks; 6 members; `→approved` rejected 409 |
| Transition guards | Live + tests: locked task, `approved` target, unknown status, unauthenticated | 409 / 409 / 422 / 401 as designed; `approved` error names evaluation |
| Restart persistence | Kill + restart API, re-login as demo | Enrollments 1, tasks 6 retained; AI-001 restored to `todo` |
| Web types/build | `npm run typecheck`, `npm run build` (in `web/`) | Both pass; routes `/`, `/login`, `/onboarding`, `/dashboard`, `/board`, `/team`, `/roadmap`, `/progress`, `/tasks/[id]` |
| Web+API smoke | Next `start` :3000 + API :8000, `curl` all routes | All 8 routes 200 |
| Compose | `docker compose config` | Valid |

**Acceptance:** Enroll → open ticket → start work → persisted dashboard updates ✓ (verified live with a fresh user).

**Known limitations:** Diagnostic answers are a fixed server-side set (calibration only, not proctored). Team directory is static content (chat arrives in Phase 03). No Vitest suite yet — web covered by `typecheck` + `build` (Q10 partial). Full-Compose image stack still `UNTESTED`. Servers stopped after verification; nothing running. Phase 02 uncommitted on `feat/02-onboarding-board`.
