# DevSpace AI

AI-native simulated engineering internship. Students join a virtual engineering team, work an Applied AI Engineering sprint (AI-001–AI-006), collaborate with AI teammates, submit GitHub PRs, and progress through deterministic, evidence-based gates.

> This is a **simulation**, not employment, accredited training, or a guaranteed placement.

**Status (Phase 02):** Foundation, auth, onboarding, enrollment, sprint board, task detail, team directory, roadmap, and progress views are implemented. AI teammates, GitHub evaluation, and voice land in later phases and are currently `UNTESTED`. See [docs/progress.md](/Users/jsaxena/Documents/devspace-ai/docs/progress.md).

## Stack

- `web/` — Next.js, TypeScript, Tailwind CSS, shadcn/ui
- `api/` — FastAPI, Pydantic, SQLAlchemy 2, Alembic
- `worker/` — Redis-backed jobs (stub in Phase 01)
- `curriculum/` — Versioned sprint definitions
- `infra/` — Docker Compose (PostgreSQL, Redis)
- PostgreSQL is the source of truth. Modular monolith; no microservices.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up --build -d postgres redis
# Run migrations with a DIRECT connection (locally same as DATABASE_URL)
docker compose -f infra/docker-compose.yml run --rm api alembic upgrade head
docker compose -f infra/docker-compose.yml run --rm api python -m app.seed
docker compose -f infra/docker-compose.yml up --build
```

- Web: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health and http://localhost:8000/health/db
- Demo login: `demo@devspace.ai` / `DemoPass123!` (seeded; change outside local dev)
- After sign-in, complete `/onboarding` (profile, optional diagnostic, enrollment), then use `/board` for the Kanban, `/tasks/{id}` for ticket detail, `/team` for the directory, `/roadmap` for the 12-week plan, and `/progress` for evidence-backed stats

## Quick start (host, without Docker for API/Web)

```bash
# Postgres + Redis via Docker only
docker compose -f infra/docker-compose.yml up -d postgres redis

# API
uv venv .venv && source .venv/bin/activate
uv pip install -r api/requirements.txt -r api/requirements-dev.txt
cp .env.example .env
# Ensure DATABASE_URL points at localhost (see .env.example)
cd api && alembic upgrade head && python -m app.seed && uvicorn app.main:app --reload --port 8000

# Web (new terminal)
cd web && npm install && NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

On Neon, keep the pooled `DATABASE_URL` for the app and set `DATABASE_URL_UNPOOLED` (direct, no `-pooler`) for Alembic; migrations must not run over PgBouncer transaction pooling.

## Tests

```bash
source .venv/bin/activate
python -m pytest tests/ -q
cd api && ruff check app/ && mypy app/ --ignore-missing-imports
cd web && npm run typecheck
```

## Docs

- Product: [docs/prd/requirements.md](/Users/jsaxena/Documents/devspace-ai/docs/prd/requirements.md)
- Playbook: [docs/prompts/build-playbook.md](/Users/jsaxena/Documents/devspace-ai/docs/prompts/build-playbook.md)
- Architecture: [docs/architecture/README.md](/Users/jsaxena/Documents/devspace-ai/docs/architecture/README.md)
- Progress: [docs/progress.md](/Users/jsaxena/Documents/devspace-ai/docs/progress.md)
