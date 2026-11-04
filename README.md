# DevSpace AI

DevSpace AI is an AI-native simulated engineering internship. A student joins a virtual engineering team, works through one Applied AI Engineering sprint (AI-001 to AI-006), collaborates with AI teammates, submits real GitHub pull requests, receives evidence-based feedback, and unlocks the next ticket only when the work is approved.

> This is a simulation. It is not employment, accredited training, or a guaranteed placement.

## What students do

1. Sign in and complete onboarding.
2. Pick up sprint tickets from the board.
3. Ask AI teammates for planning, coding, testing, and standup help.
4. Share daily standups by text or voice.
5. Submit GitHub pull requests for review.
6. Fix feedback, get approved, unlock the next ticket, and track growth.

A short product tour opens on the first dashboard visit and can be replayed anytime from the sidebar.

## Demo

- Deployed web app: https://devspace-ai.vercel.app
- Deployed API health: https://devspace-webservice-production.up.railway.app/health
- Local demo login is listed under **Quick start**. Deployed demo credentials are controlled by the deployment's seed settings.

Suggested walkthrough: sign in, complete onboarding, open the product tour, start AI-001 from the board, ask the Tech Lead a question, share a standup, submit a pull request from the GitHub page, read the review, and check Growth after approval.

## Features

- Guided onboarding and a first-run product tour with replay.
- Sprint board with six Applied AI tickets (AI-001 to AI-006) and per-student task state.
- Five AI teammates plus a separate Learning Assistant for hints.
- Text chat and push-to-talk voice for standups and Tech Lead discussions, with text fallback.
- GitHub fork linking, pull-request submission, signed webhook handling, and exact-commit reviews.
- Evidence-based feedback, deterministic approval, next-ticket unlocking, remediation hints, and certificates.
- Growth dashboard backed by approved work, not self-reported skill claims.

## Prerequisites

- Docker with Docker Compose v2 for the local stack.
- Git, plus a GitHub account if you want to try the real pull-request flow.
- Optional for running checks outside Docker: Python 3.12 and Node.js 20.
- Optional live AI/voice credentials; without them, use the documented mock/local settings in `.env.example` and treat those paths as mock.

## Quick start

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up --build -d postgres redis
docker compose -f infra/docker-compose.yml run --rm api alembic upgrade head
docker compose -f infra/docker-compose.yml run --rm api python -m app.seed
docker compose -f infra/docker-compose.yml up --build -d
```

- Web: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health and http://localhost:8000/health/db
- Demo login: `demo@devspace.ai` / `DemoPass123!` (local/demo only; change it outside local development)

## Architecture

```text
Student browser
    |
    v
Next.js web app  --->  FastAPI API  --->  PostgreSQL
                          |  \
                          |   -> Redis queue -> Worker -> evaluation results
                          |
GitHub pull requests ---> GitHub App / webhooks -> API -> submissions & reviews

AI teammates, voice transcription, and speech run behind server-side adapters.
The model can advise and review, but it never approves a ticket by itself.
```

| Component | What it does | Why it is there |
|---|---|---|
| `web/` — Next.js, TypeScript, Tailwind, shadcn/ui | Student workspace: dashboard, board, ticket detail, team chat, standup, voice, GitHub submissions, growth, certificates, and the first-run product tour. | One connected workspace keeps the internship journey in a single place and reuses one design system across screens. |
| `api/` — FastAPI modular monolith | Auth, onboarding, tasks, conversations, standups, GitHub linking, submissions, evaluations, progression, certificates, and audit events. | Business rules stay on the server, so the UI or a model response cannot bypass permissions, task gates, or approval policy. |
| PostgreSQL | Stores users, enrollments, per-student task state, conversations, submissions, evaluations, skill evidence, and audit history. | Progress must be durable, queryable, and based on evidence rather than chat memory. |
| Redis | Queue between the API and the worker. | Pull-request evaluation can take time; the web request should finish quickly while the work happens in the background. |
| Worker (`python -m app.worker`, same API image) | Consumes queued evaluation jobs and writes results back to PostgreSQL. | Separates slower review work from the request path and supports retries and duplicate-job protection. |
| `curriculum/` | Versioned sprint and 12-week roadmap definitions, including AI-001 to AI-006. | Course content is reviewed and seeded like code, so every environment starts from the same sprint. |
| GitHub App and webhooks | Links a student's fork, receives pull-request events, stores the exact head commit, and resolves the app installation for diff fetching. | Real student work is tied to the right ticket and commit, with signed, duplicate-safe event handling. |
| Evaluation pipeline | Runs safe static checks, secret scanning, and a structured AI review for a submitted commit. | Students get specific, evidence-based feedback; live student code is not executed on the API or worker host. |
| Progression rules | Decide approval, unlock the next ticket, record competencies, remediation, hints, and certificates. | Advancement is deterministic: checks and evidence approve work, not a model's say-so. |
| AI teammate orchestration | Five role-based teammates plus a separate Learning Assistant, sharing one orchestration service with scoped tools. | Students experience a realistic team while each role stays within safe, server-checked boundaries. |
| Voice (STT/TTS adapters) | Push-to-talk standups and Tech Lead discussions with editable transcripts and text fallback. | Voice feels like talking to the team, while the same conversations and confirmation rules still apply. |
| `infra/` and deployment config | Docker Compose for local development; production can split the web app to Vercel and API/worker/PostgreSQL/Redis to Railway. | The same stack runs reproducibly on a laptop and maps cleanly to managed hosting. |

### Design rules that matter

- PostgreSQL is the source of truth; AI personas do not own separate state.
- Approval is deterministic and tied to the latest eligible commit. Model output alone never approves or unlocks a task.
- Repository content, diffs, comments, and transcripts are treated as untrusted input.
- Secrets stay server-side and are never exposed to the browser, logs, or model prompts.
- External services (models, speech, GitHub, code execution) sit behind typed adapters and are labelled `LIVE`, `MOCK`, `BLOCKED`, or `UNTESTED` honestly.

## Environment variables

Copy `.env.example` to `.env` for local development. Never commit `.env` or real provider keys.

| Variable group | Used for |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | App database connection, plus a direct connection for migrations. |
| `REDIS_URL` | Worker queue connection. |
| `JWT_SECRET_KEY`, `CORS_ORIGINS` | Login sessions and which web origin may call the API. |
| `NEXT_PUBLIC_API_BASE_URL` | Web app's API address; set before building the web app. |
| `LLM_PROVIDER`, `MODEL_API_BASE_URL`, `MODEL_API_KEY`, `MODEL_ID` | AI teammate and review model access, or explicit mock mode. |
| `STT_PROVIDER`, `STT_API_KEY`, `STT_MODEL`, `TTS_PROVIDER` | Voice transcription and speech settings. |
| `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY_PATH` or `GITHUB_APP_PRIVATE_KEY_B64`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_BASE_REPO` | GitHub App authentication, signed webhooks, and the base sprint repository. |
| `SEED_DEMO_EMAIL`, `SEED_DEMO_PASSWORD`, `SEED_DEMO_NAME`, `RUN_SEED_ON_BOOT` | Demo seed account and optional seed-on-start for the API service only. |

## Deployment

Local development uses Docker Compose from `infra/docker-compose.yml`.

For production, the proven split is:

- **Web on Vercel:** deploy `web/`, set `NEXT_PUBLIC_API_BASE_URL` to the public API URL, and rebuild after changing it.
- **Backend on Railway:** run API and worker services from the repo root with `api/Dockerfile`; add PostgreSQL and Redis services; give API and worker the same database, Redis, model, speech, and GitHub settings.
- **API startup:** the container entrypoint runs migrations before starting the API. Set `RUN_SEED_ON_BOOT=true` on the API only when you want demo/sprint data seeded at boot; do not set it on the worker.
- **Connections:** set API `CORS_ORIGINS` to the web origin and point the GitHub App webhook to `https://<api-domain>/api/github/webhook`.

## Project status and roadmap

Implemented: onboarding, product tour, sprint board, AI team chat, standups, voice with text fallback, GitHub submission/review flow, deterministic progression, growth evidence, and certificates.

Honest limits:

- Student code is not executed on the API or worker host; evaluation uses safe static checks plus structured review. A hardened isolated runner remains future work.
- The full real-fork pull-request approval path should be smoke-tested in each target deployment before a public demo.
- Later roadmap work: richer analytics and remediation, voice for more roles, and spoken design reviews.

## Development checks

```bash
source .venv/bin/activate
python -m pytest tests/ -q
cd api && ruff check app/ && mypy app/ --ignore-missing-imports
cd web && npm run typecheck && npm run build
```

## Contributing

Contributions are currently coordinated by the project team. If you are working on this repository:

- Create a focused branch, keep changes scoped, and do not commit `.env`, private keys, or generated build output.
- Run the development checks above before opening a pull request.
- Update [docs/progress.md](docs/progress.md) when you change implemented, mocked, blocked, or pending work.

## License

No open-source license has been added yet. Treat the code as all rights reserved until the project owners choose and add a license.

## Documentation

- Product requirements: [docs/prd/requirements.md](docs/prd/requirements.md)
- Build playbook: [docs/prompts/build-playbook.md](docs/prompts/build-playbook.md)
- Architecture decisions: [docs/architecture/README.md](docs/architecture/README.md)
- Progress and integration status: [docs/progress.md](docs/progress.md)
- Setup guide: [docs/setup-guide.md](docs/setup-guide.md)
- GitHub App setup: [docs/github-app-setup.md](docs/github-app-setup.md)
