# Evaluation Worker Runbook (Phase 06/07)

Submissions enqueue evaluation jobs on Redis (`devspace:eval:jobs`). The API
never runs them inline — a worker does.

## Run the worker (development)

```bash
cd api
DATABASE_URL="postgresql+psycopg://devspace:devspace@localhost:5432/devspace" \
REDIS_URL="redis://localhost:6379/0" \
../.venv/bin/python -m app.worker
```

One job = one SHA-pinned evaluation. Ctrl-C finishes the current job, then exits.

## Behavior

- **Idempotent:** a job for an already-evaluated (submission, SHA) returns the
  stored row (`duplicate`) — safe to requeue.
- **Stale:** a job whose SHA is older than the submission head records a
  `stale` evaluation and touches nothing else.
- **Transient failures** (network, model timeouts): requeued up to 3 attempts,
  then recorded as `error` with the reason. The loop never dies on one bad job;
  malformed payloads are dropped with a log line.
- **Manual trigger:** `POST /api/submissions/{id}/evaluate` enqueues the
  current head (owner only).

## What the worker does NOT do

- Never executes student code. Static checks read diff text only.
- Never sends secrets to the model — diffs are secret-scanned and redacted first.
- Never approves. The Phase 07 policy decides from trusted evidence; the AI
  review is a veto (blocking findings / errors deny), never a pass.
