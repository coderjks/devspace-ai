# DevSpace AI — Model-Switch Handoff

**Purpose:** Everything a new model (or engineer) needs to continue without re-deriving context. Read this first, then the sources below. If this file and the code disagree, the code and the canonical PRD win — flag the drift in [docs/progress.md](/Users/jsaxena/Documents/devspace-ai/docs/progress.md).

**Last updated:** 2026-10-29, after Phase 08–10 approval.
**Workspace:** `/Users/jsaxena/Documents/devspace-ai` · **Branch:** `feat/10-learning` (stacked on `feat/09-voice-flows` ← `feat/08-voice-infra` ← `feat/07-progression`)

---

## 1. Read in this order (do not skip)

1. This file — current state, gate, and pitfalls.
2. [AGENTS.md](/Users/jsaxena/Documents/devspace-ai/AGENTS.md) — durable engineering constraints. Binding in every phase.
3. [docs/prd/requirements.md](/Users/jsaxena/Documents/devspace-ai/docs/prd/requirements.md) v2.2.1 — canonical product + acceptance criteria. Later amendments supersede older sections; Section 21 voice P0 supersedes the early scope table.
4. [docs/prompts/build-playbook.md](/Users/jsaxena/Documents/devspace-ai/docs/prompts/build-playbook.md) v2.2.1 — phase sequence and exact phase prompts. Implement **one phase at a time**, then stop.
5. [docs/progress.md](/Users/jsaxena/Documents/devspace-ai/docs/progress.md) — phase checklist, integration status (`LIVE`/`MOCK`/`BLOCKED`/`UNTESTED`), and §9 verification evidence.
6. [docs/architecture/README.md](/Users/jsaxena/Documents/devspace-ai/docs/architecture/README.md) — ADR-001–005.
7. [README.md](/Users/jsaxena/Documents/devspace-ai/README.md) — setup commands.

Not canonical: [docs/prompts/DevSpace_AI_Build_Prompts_and_Guidelines.md](/Users/jsaxena/Documents/devspace-ai/docs/prompts/DevSpace_AI_Build_Prompts_and_Guidelines.md) (v2.2 companion draft) and the `.docx` under `docs/prd/`. Do not implement from them where they conflict with v2.2.1. Ignore the legacy one-shot prompt in PRD Section 18.

## 2. What this product is

AI-native **simulated** engineering internship (Applied AI Engineering). A student onboards, works one six-ticket sprint (AI-001–AI-006) on a customer-support backend, collaborates with five AI teammates plus a separate Learning Assistant through **one** shared orchestrator, does push-to-talk voice standups (P0: Scrum Master + Tech Lead), submits real GitHub PRs, gets SHA-pinned sandbox tests + structured AI review, receives progressive hints, and unlocks dependent tickets only via a deterministic server-side policy. Always frame it as a simulation — never employment, accreditation, or placement guarantee.

Demo journey: `Onboard → sprint → text chat → voice standup → confirm blocker → Tech Lead sees blocker → GitHub PR → sandbox tests + AI review → hints → corrected PR → deterministic unlock → progress dashboard`.

## 3. Current gate — read before doing anything

| Item | State |
|---|---|
| Prompt 00 (orientation) | DONE |
| **Phase 01 (foundation, DB, auth)** | **DONE and verified** (see §7) |
| **Phase 02 (onboarding, board)** | **DONE, verified and committed** (`5cc676e`; see progress §10) |
| **Phase 03 (AI orchestration, mock path)** | **DONE, verified, APPROVED 2026-10-29** — pushed on `feat/03-ai-orchestrator` (`a2929c7`, `3da05c1`, `aa9648c`). Screens 07–08 approved. |
| **Phase 04 (standups + activity)** | **DONE, verified, APPROVED 2026-10-29** — committed on `feat/04-standups` (`4e59883` page-09, `88cb2e5` page-10, `11365d4` trackers). Screens 09–10 approved. Not pushed, not merged. |
| API preflight (live Meta runtime check) | NOT STARTED — needs user-supplied credentials/docs; mock adapter is explicit and labeled |
| **Phase 05 (GitHub + PRs)** | **DONE, verified, APPROVED 2026-10-29** — `29109eb` on `feat/05-github`. Screens 11–12 approved. Real github.com delivery UNTESTED. |
| **Phase 06 (evaluation)** | **DONE, verified, APPROVED 2026-10-29** — `e402287` on `feat/06-evaluation`. Screen 13 approved. No sandbox (static checks only, by design). |
| **Phase 07 (approval/unlock)** | **DONE, verified, APPROVED 2026-10-29** — `e738d99` on `feat/07-progression`. Screen 14 approved. Live denied→approved→unlock E2E green. |
| **Phase 08 (voice infra)** | **DONE, verified, APPROVED 2026-10-29** — `7fcc731` on `feat/08-voice-infra`. Mock STT/TTS, consent, continuity. Live providers UNTESTED (Q3 open). |
| **Phase 09 (voice flows)** | **DONE, verified, APPROVED 2026-10-29** — `8ada3f5` on `feat/09-voice-flows`. Screen 16 approved. Real mic transcription UNTESTED (needs live STT). |
| **Phase 10 (learning)** | **DONE, verified, APPROVED 2026-10-29** — `b4b6b0c` on `feat/10-learning`. Screen 17 approved. |
| Phases 11–12 | NOT STARTED — pointer at Phase 11 (integration & QA) |
| Git | `main` includes Phases 01–02 (merged PRs #1, #2). `feat/03-ai-orchestrator` pushed (Phase 03). All phase branches pushed 2026-10-29 (`feat/03`–`feat/07` in sync with origin). Stack not merged to `main`. `reference_images/` + `screens-library/` gitignored (never commit). Screens 01–10 APPROVED; Phases 01–04 COMPLETE (03–04 on mock LLM path). Pointer at page-11 (Phase 05 GitHub App). Live Meta preflight still pending credentials — flip via LLM_PROVIDER + key when available. Commands: `Show roadmap`, `Show current progress`, `Build next screen`, `Build page-XX`, `Resume/Validate/Approve current screen`. Do not push unless the user asks. |
| Running servers | Local review stack was running (API :8000, web :3000, Docker Postgres/Redis) for user verification; CORS fixed to allow both `localhost:3000` and `127.0.0.1:3000` origins. Servers live only for this session (see §9 pitfall on macOS). |

**Rule:** Do not start Phase 11 until the user explicitly instructs it. Each phase ends with the playbook verification prompt, a progress update, and a stop. Never implement two phases in one turn.

## 4. What Phase 01 delivered

Monorepo, runnable end to end locally. No AI, voice, or GitHub code (scope exclusions honored).

- `docs/prompt/` renamed to `docs/prompts/` to match `AGENTS.md`/PRD (Q1 resolved).
- **API** ([api/app/main.py](/Users/jsaxena/Documents/devspace-ai/api/app/main.py)): FastAPI modular monolith. Typed settings ([api/app/config.py](/Users/jsaxena/Documents/devspace-ai/api/app/config.py)), SQLAlchemy 2 engine ([api/app/database.py](/Users/jsaxena/Documents/devspace-ai/api/app/database.py)), 11 models ([api/app/models.py](/Users/jsaxena/Documents/devspace-ai/api/app/models.py)): `User, Enrollment, Project, Sprint, Task, TaskDependency, Submission, Evaluation, AgentConversation, AgentMessage, ActivityEvent`. Routers: `health` (`/health`, `/health/db`), `auth`, `projects` (`/api/projects/current`, `/api/sprints/current`, `/api/enrollments/me`).
- **Auth** ([api/app/routers/auth.py](/Users/jsaxena/Documents/devspace-ai/api/app/routers/auth.py), [api/app/security.py](/Users/jsaxena/Documents/devspace-ai/api/app/security.py)): email/password register/login/logout, `GET /api/auth/me`. PBKDF2-HMAC-SHA256 (600k iterations, per-user salt) + HS256 JWT in httpOnly cookie `devspace_session`; Bearer token also accepted (web + tests use it). Ownership via `get_current_user` ([api/app/dependencies.py](/Users/jsaxena/Documents/devspace-ai/api/app/dependencies.py)); enrollments are owner-scoped.
- **Migrations:** Alembic [api/alembic/versions/20261027_0001_initial.py](/Users/jsaxena/Documents/devspace-ai/api/alembic/versions/20261027_0001_initial.py). Migrations use a **direct** DB URL (`DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL` locally) — see §9.
- **Seed** ([api/app/seed.py](/Users/jsaxena/Documents/devspace-ai/api/app/seed.py), idempotent): demo user + Applied AI Engineering enrollment + project "AI-Powered Customer Support Backend" + Sprint 1 + exactly AI-001–AI-006 from [curriculum/sprint-01.json](/Users/jsaxena/Documents/devspace-ai/curriculum/sprint-01.json). AI-001 is `todo`; AI-002–AI-006 are `locked`. Dependencies: AI-002←AI-001, AI-003←AI-001, AI-004←AI-003, AI-005←AI-002, AI-006←AI-004 (5 dependency rows).
- **Web** ([web/app/page.tsx](/Users/jsaxena/Documents/devspace-ai/web/app/page.tsx)): Next.js 14 + TypeScript + Tailwind + shadcn/ui-style `Button`/`Input`/`Card`. Routes `/`, `/login`, `/dashboard` (renders the persisted sprint list from the API). API base from `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`).
- **Worker** ([worker/app/main.py](/Users/jsaxena/Documents/devspace-ai/worker/app/main.py)): Redis ping stub only. Real jobs arrive in Phase 06.
- **Infra** ([infra/docker-compose.yml](/Users/jsaxena/Documents/devspace-ai/infra/docker-compose.yml)): `postgres:16-alpine`, `redis:7-alpine`, `api`, `worker`, `web`. Host ports parameterised (`${POSTGRES_PORT:-5432}`, `${REDIS_PORT:-6379}`).
- **Tests:** [tests/api/](/Users/jsaxena/Documents/devspace-ai/tests/api/conftest.py) — 14 pytest tests (health, auth, ownership, seed/migration). See §7.
- **Docs:** [.env.example](/Users/jsaxena/Documents/devspace-ai/.env.example) (placeholders only), [README.md](/Users/jsaxena/Documents/devspace-ai/README.md), architecture ADRs.

Phase 02 added (branch `feat/02-onboarding-board`, uncommitted): `POST /api/enrollments` (idempotent) + `PATCH /api/users/me` + diagnostics (`GET /api/diagnostics/questions` without answers, `POST /api/diagnostics/attempts` scored server-side and saved to the enrollment); task detail `GET /api/tasks/{id}` and `POST /api/tasks/{id}/transitions` with an allowlist (`todo↔in_progress` only — `approved`, locked, and unknown targets rejected); `GET /api/progress` derived from persisted state; `GET /api/roadmap` (12 weeks from `curriculum/roadmap-12wk.json` + live sprint); `GET /api/team` (static directory, chat in Phase 03); migration `20261028_0002` (`experience_level`, `diagnostic_result`); frontend `/onboarding`, `/board`, `/tasks/[id]`, `/team`, `/roadmap`, `/progress` + shared `SiteHeader`; 18 new API tests (32 total). Full evidence in [docs/progress.md](/Users/jsaxena/Documents/devspace-ai/docs/progress.md) §10.

Landing page redesigned on the same branch (uncommitted, same session): dark `components/landing/` (navbar, hero, workspace preview, how-it-works, AI team, workflows, roadmap, comparison, FAQ, final CTA, footer) + `app/page.tsx` with SEO/OpenGraph metadata. CTAs use real routes (`/login`, `/onboarding`); no Privacy/Terms links (no such pages); marketing data explicitly labeled illustrative. `typecheck` + `build` pass; served HTML smoke-checked. No browser visual test was performed. (Brief named `docs/phase-handoff.md`; the actual file is `docs/handoff.md`.) Backend, auth contracts, and all other pages untouched; no phase advanced.

Landing page then rebuilt against the supplied reference image (same branch, uncommitted): exact tokens `#09090F/#14141F/#8B5CF6/#38BDF8/#F8FAFC/#94A3B8`, two-column hero with a dashboard mock (sidebar, stats, sprint card, activity, team), numbered journey with connectors, six role cards with initial avatars, six workflow cards, FAQ, final CTA, footer. Roadmap and comparison sections removed; “Trusted by” logos deliberately omitted (fabricated endorsements are banned by the brief). Served HTML (headline, 4 CTAs, anchors, disclaimers) and stylesheet (200, tokens present) verified; dev server once served a stale broken CSS and was restarted with a cleared cache. No browser visual test performed. Backend, auth contracts, and app pages untouched; no phase advanced.

Auth page then rebuilt against the Page 02 reference image (same branch, uncommitted): split-screen `components/auth/` (brand panel, Kanban/chat mini-preview, tabbed card, sign-in/sign-up forms, email/password fields) + `app/login/page.tsx`. Forms wire to the existing email/password contract (login → `/dashboard`, signup → `/onboarding`); omitted per brief and contract: OAuth buttons, forgot-password link, Terms/Privacy links, testimonial, trust logos. `typecheck` + `build` pass; served HTML verified. No browser visual test performed. Backend and auth contracts untouched; no phase advanced.

Dual-theme design system then implemented on the same branch (uncommitted): `tailwind.config.ts` is now CSS-variable driven (`darkMode: "class"`) with tokens for background/foreground/card/popover/primary/secondary/muted/accent/border/input/ring/destructive/success/warning/info/chart/sidebar; `globals.css` holds the Soft Slate + Indigo light default and Midnight Slate + Soft Blue `.dark` set (contrast-checked), 16px base, global focus ring, and a `prefers-reduced-motion` kill-switch; `next-themes` added (`ThemeProvider` + cycling `ThemeToggle` in landing nav and app header; Light default, System support, `localStorage` persistence, hydration-safe). Landing and auth screens migrated off hardcoded colors (glows/gradient headline removed per the new direction); app screens needed only status-color migration. New `docs/design/design-system.md` is the reference for future UI work. `typecheck` + `build` + 32 pytest pass; served CSS contains both theme token sets and SSR renders light. Actual theme toggling/persistence is code-verified, not browser-tested. No backend changes; no phase advanced.

## 5. File map (where things live)

| Path | Role |
|---|---|
| [api/app/models.py](/Users/jsaxena/Documents/devspace-ai/api/app/models.py) | All 11 SQLAlchemy models + enums. Single models module by design in Phase 01. |
| [api/app/schemas.py](/Users/jsaxena/Documents/devspace-ai/api/app/schemas.py) | Pydantic request/response shapes (`AuthResponse`, `ProjectOut`, `TaskOut`, …). |
| [api/app/seed.py](/Users/jsaxena/Documents/devspace-ai/api/app/seed.py) | Idempotent seed; reads `curriculum/sprint-01.json` (path resolved relative to repo root). |
| [api/alembic/env.py](/Users/jsaxena/Documents/devspace-ai/api/alembic/env.py) | Alembic env; prefers `DATABASE_URL_UNPOOLED` for migrations. Run Alembic **from `api/`**. |
| [api/pyproject.toml](/Users/jsaxena/Documents/devspace-ai/api/pyproject.toml) | Ruff (line-length 120) + mypy + pytest config (`testpaths = ../tests`). |
| [api/requirements.txt](/Users/jsaxena/Documents/devspace-ai/api/requirements.txt) | FastAPI, SQLAlchemy 2, Alembic, psycopg, PyJWT, redis, httpx. Dev: [api/requirements-dev.txt](/Users/jsaxena/Documents/devspace-ai/api/requirements-dev.txt). |
| [web/lib/utils.ts](/Users/jsaxena/Documents/devspace-ai/web/lib/utils.ts) | `cn()` + `API_BASE`. No secrets in web; never add `NEXT_PUBLIC_*` keys. |
| [tests/api/conftest.py](/Users/jsaxena/Documents/devspace-ai/tests/api/conftest.py) | SQLite in-memory + `StaticPool`, overrides `get_db`, seeds once per session. Tests never need Postgres. |
| [.venv/](/Users/jsaxena/Documents/devspace-ai/.venv) | Project venv (Python 3.14.7 host). Gitignored. Created with `python3 -m venv` (`uv` cache is blocked in this sandbox). |

Key endpoints today: `GET /health`, `GET /health/db`, `POST /api/auth/register|login|logout`, `GET /api/auth/me`, `GET /api/projects/current`, `GET /api/sprints/current`, `GET /api/enrollments/me`. OpenAPI at `http://localhost:8000/docs`.

## 6. How to run it (verified commands)

**Demo account (seeded, local only):** `demo@devspace.ai` / `DemoPass123!` — from `SEED_DEMO_*` in [.env.example](/Users/jsaxena/Documents/devspace-ai/.env.example). Change outside local dev.

Option A — Docker DB + host API/Web (what was verified):

```bash
cd /Users/jsaxena/Documents/devspace-ai
cp .env.example .env   # first time only; .env is gitignored, never commit it
docker compose -f infra/docker-compose.yml up -d postgres redis
# If host :5432 is taken (it was — another stack), use POSTGRES_PORT=5433 and
# point DATABASE_URL at localhost:5433. Do not kill the other stack.
source .venv/bin/activate
cd api
DATABASE_URL=postgresql+psycopg://devspace:devspace@localhost:5432/devspace alembic upgrade head
DATABASE_URL=postgresql+psycopg://devspace:devspace@localhost:5432/devspace python -m app.seed
DATABASE_URL=postgresql+psycopg://devspace:devspace@localhost:5432/devspace uvicorn app.main:app --port 8000
# new terminal:
cd web && npm install && NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

Then open http://localhost:3000 in a browser → Sign in → Dashboard shows the six persisted tickets.

Option B — full Compose (declared, **not** verified end-to-end): `docker compose -f infra/docker-compose.yml up --build`. Only the Postgres/Redis containers plus host-run API/Web were exercised in Phase 01; treat api/web/worker images as `UNTESTED` until run.

Tests and checks (no DB needed):

```bash
source .venv/bin/activate
DATABASE_URL="sqlite+pysqlite:///:memory:" python -m pytest tests/ -q   # 14 passed
ruff check api/app/ tests/
mypy api/app/ --ignore-missing-imports
cd web && npm run typecheck && npm run build
cd api && DATABASE_URL="sqlite+pysqlite:////tmp/devspace_mig.db" alembic upgrade head  # migration smoke
```

## 7. Verification evidence (Phase 01, 2026-10-27)

Full table in [docs/progress.md](/Users/jsaxena/Documents/devspace-ai/docs/progress.md) §9. Summary of observed results: pytest **14 passed**; ruff clean; mypy clean (13 files); Alembic upgrade→downgrade→upgrade clean on SQLite and Postgres 16 (11 tables); seed run twice = still 6 tasks; live `curl` login → `/api/auth/me` → `/api/projects/current` returned AI-001 `todo` + AI-002–AI-006 `locked` with correct dependencies; unauthenticated project fetch = 401; API restart kept the same user id and 6 tasks; Redis `PONG`; web `typecheck` + `build` pass; web `/` and `/login` returned 200 with the API up.

Acceptance (Phase 01): sign in ✓ · fetch authenticated student ✓ · fetch persisted seeded project ✓ · restart retains data ✓.

**Not verified:** real-browser click-through (HTTP + build only), full-Compose image stack, any production/Neon database, deployment. Do not claim otherwise.

## 8. Integration status (never disguise a mock as live)

| Integration | Status | Note |
|---|---|---|
| PostgreSQL | `LIVE` (local Docker) | Production/Neon `UNTESTED`. App may use pooled URL; Alembic uses direct `DATABASE_URL_UNPOOLED`. |
| Redis | `LIVE` (local, stub) | Worker does no job processing until Phase 06. |
| Auth | `LIVE` (local) | Cookie + Bearer JWT. |
| Meta LLM runtime | `UNTESTED` | No base URL, key, or model ID verified. **Do not assume any Meta endpoint, SDK, or model ID** (including names in the non-canonical companion draft). Coding-IDE model ≠ runtime model. |
| STT / TTS | `UNTESTED` | No provider chosen. Speech needs separately verified providers; a chat model does not imply STT/TTS. |
| GitHub App / webhook | `UNTESTED` | No App, installation, or secret exists (Phase 05). |
| Isolated code runner | `UNTESTED` | No runner chosen. If unavailable in Phase 06, live execution stays disabled behind a labeled mock. Never run student code on the API/worker host. |
| Hosting / deployment | `UNTESTED` | Phase 12. |

## 9. Pitfalls — things that already bit once

- **Alembic working directory:** run `alembic` from `api/` (its `script_location` is relative). From repo root it fails with "Path doesn't exist: alembic".
- **Pooled vs direct DB URL:** migrations, dumps, and replication must use the direct (non-pooled, no `-pooler`) connection; the app uses `DATABASE_URL`. Locally both are the same Postgres. See [api/alembic/env.py](/Users/jsaxena/Documents/devspace-ai/api/alembic/env.py) and [.env.example](/Users/jsaxena/Documents/devspace-ai/.env.example).
- **Host port 5432 collision:** another Docker stack owns :5432 on this machine. It was left untouched; verification used `POSTGRES_PORT=5433`. Never kill a process you cannot prove is yours.
- **macOS cannot detach servers:** `setsid` is unavailable, so agent-started servers die with the session. Nothing is running now; do not claim a URL is live without a fresh reachability check in the same turn.
- **Sandbox limits:** Docker socket and network need escalated approval; `uv` cache is blocked (use `python3 -m venv .venv`). `.venv`, `node_modules`, `.next`, and caches are gitignored — leave them out of commits.
- **Password hashing is PBKDF2**, not argon2/bcrypt (native wheels were avoided on Python 3.14). Acceptable for Phase 01; revisit if the deployment target requires it. JWTs are stateless: logout clears the cookie but a copied Bearer token stays valid until expiry (24h default).
- **Seed path:** [api/app/seed.py](/Users/jsaxena/Documents/devspace-ai/api/app/seed.py) resolves `curriculum/sprint-01.json` from the repo root. If the layout moves, fix the path and re-run the idempotency test.
- **Progress Q4 display artifact:** the tracker line renders the word after "Bearer" as `[REDACTED]` in some tool views; the file itself is correct. Ignore it.

## 10. Non-negotiable security boundaries

1. LLM output never approves, unlocks, or mutates protected state. Deterministic policy only: latest SHA + required tests + security gates + no blocking findings, in a transaction with an idempotency key.
2. Untrusted student code runs only in a hardened isolated runner (CPU/memory/time limits, no outbound network, no secrets) — never on the API/worker host.
3. GitHub webhooks verify HMAC on the raw body; persist delivery ID, repo ID, PR number, and exact head SHA; deduplicate idempotently.
4. Repo text, diffs, comments, and transcripts are untrusted prompt-injection input. Secrets, hidden tests, and credentials never enter prompts. Agent tools are server-side allowlisted and audited.
5. Secrets server-side only via environment; [.env.example](/Users/jsaxena/Documents/devspace-ai/.env.example) holds placeholders. Nothing secret in `web/` or logs.
6. Voice (Phases 08–09): explicit mic consent, no raw audio by default, transcript cannot authorize actions (confirmation + server validation), no scoring on accent/fluency.
7. Every integration is labeled `LIVE`/`MOCK`/`BLOCKED`/`UNTESTED` in [docs/progress.md](/Users/jsaxena/Documents/devspace-ai/docs/progress.md). Never invent connectivity, webhook delivery, sandboxing, or test results.

Full list: progress §5. Curriculum invariant: exactly six tickets (AI-001–AI-006) plus a visible 12-week roadmap; backend enforces transitions — students must never mark evaluated tasks Done from the frontend.

## 11. What remains (in playbook order)

- **API preflight** (needs user credentials): verify Meta base URL/auth/model IDs/structured output/limits with a server-side smoke test; otherwise ship a typed `LLMProvider` + explicit `MOCK`. Then stop.
- **Phase 03:** `LLMProvider` + orchestrator, six role configs, chat. **Phase 04:** standups + confirmed blockers. **Phase 05:** GitHub App + webhook. **Phase 06:** sandbox evaluation + AI review. **Phase 07:** deterministic unlock + remediation + hints. **Phase 08:** voice infra. **Phase 09:** voice standups. **Phase 10:** progress polish. **Phase 11:** E2E security/reliability + `docs/qa-report.md`. **Phase 12:** deployment + demo.
- Open questions (progress §6): Q2 Meta access, Q3 STT/TTS providers, Q5 sandbox strategy, Q6 GitHub App ownership, Q7 deployment target, Q10 web test stack (Vitest/Playwright not yet added). Q1/Q4/Q8/Q9 are resolved.

## 12. Instructions for the incoming model

1. Start by reading §1 in order. Confirm you are on `feat/02-onboarding-board` (`git branch -v`, `git status`). Inspect the code before changing anything; preserve Phase 01–02 APIs and tests.
2. State the current gate back to the user and wait if no phase was explicitly requested. Implement only the requested phase, run its tests/lint/type checks, update [docs/progress.md](/Users/jsaxena/Documents/devspace-ai/docs/progress.md) (checklist, integration status, change log) and this handoff if state changed, then stop.
3. Never hardcode unverified Meta/GitHub/speech endpoints, IDs, or prices. Label every integration honestly.
4. Do not commit, push, or rewrite git history unless the user asks.
5. Keep the app runnable after your phase. Prefer a verified vertical slice over a large unverified dump.

**Starter prompt (user: paste this as the first message after switching to Muse Spark 1.3):**

```text
Read docs/handoff.md first, then AGENTS.md, docs/progress.md,
docs/prd/requirements.md, and the API preflight + Phase 03 sections of
docs/prompts/build-playbook.md. You are on branch feat/02-onboarding-board;
Phases 01–02 are done and verified (32 tests pass). Restate the current gate,
integration status, and what you will implement next. Do not start
coding until I confirm. Do not assume any Meta endpoint or model ID.
```

If you cannot restate the Phase 01 state from §3 and §7 of this file, context did not transfer — say so and stop before writing code. Also update this file and [docs/progress.md](/Users/jsaxena/Documents/devspace-ai/docs/progress.md) in the same change whenever branch, HEAD, gate, or integration status moves.
