# Architecture — DevSpace AI

Modular monolith. PostgreSQL is the source of truth. No microservices.

## Layout

- `web/` — Next.js + TypeScript + Tailwind + shadcn/ui
- `api/` — FastAPI + Pydantic + SQLAlchemy 2 + Alembic (modules: auth, users, enrollments, diagnostics, projects, tasks, progress, roadmap, team; agents/github/evaluations land in later phases)
- `worker/` — Redis-backed async jobs (Phase 01–02 stub; evaluation in Phase 06)
- `curriculum/` — Versioned project/sprint/task definitions (`sprint-01.json`) and roadmap (`roadmap-12wk.json`)
- `infra/` — Docker Compose (PostgreSQL, Redis, api, worker, web)
- `tests/` — API/integration tests

## Decisions (Phase 01)

- **ADR-001 Modular monolith:** One FastAPI app with router modules; shared PostgreSQL state is authoritative, personas never own truth.
- **ADR-002 Auth:** Email/password with PBKDF2-HMAC-SHA256 (600k iterations, per-user salt) and HS256 JWT in an httpOnly cookie (also accepted as Bearer for API clients/tests). Logout clears the cookie. Object-level checks via `get_current_user` on every protected route.
- **ADR-003 Migrations:** Alembic is the only schema path. Migrations use a **direct (non-pooled)** connection (`DATABASE_URL_UNPOOLED`); the app may use a pooled URL. Locally both point at the same Postgres.
- **ADR-004 Seed:** Idempotent seed from `curriculum/sprint-01.json`; exactly AI-001–AI-006 with PRD dependencies. Re-running seed is a no-op.
- **ADR-005 External adapters:** LLM/STT/TTS/GitHub/runner are not implemented in Phase 01. They will sit behind typed interfaces with explicit `MOCK` mode; nothing is claimed `LIVE` until the API preflight verifies it.

## Decisions (Phase 02)

- **ADR-006 Task transitions:** Student-driven status changes go through `POST /api/tasks/{id}/transitions` against a server-side allowlist (`todo↔in_progress` only). `approved` is rejected with 409 (approval belongs to the Phase 07 progression service), locked/in-review/blocked tasks reject with 409, and unknown targets with 422. Every transition writes an `ActivityEvent`.
- **ADR-007 Content boundaries:** Roadmap weeks live in versioned `curriculum/roadmap-12wk.json`; diagnostic answers stay in server-side code (`api/app/diagnostics_data.py`) and are never serialized; the team directory is static content until Phase 03 adds versioned role configs and the orchestrator. Progress metrics are derived from persisted rows, never fabricated.

## Data flow (Phase 02)

Browser → Next.js (`/onboarding`, `/board`, `/tasks/[id]`, `/team`, `/roadmap`, `/progress`) → FastAPI (enrollment, diagnostics, tasks, progress, roadmap, team) → PostgreSQL. Redis/worker idle until Phase 06.
