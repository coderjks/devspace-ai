#!/usr/bin/env bash
# DevSpace AI local stack: Postgres + Redis (Docker), FastAPI, Next.js.
# Usage:
#   ./scripts/dev.sh         start everything in the background (logs in /tmp)
#   ./scripts/dev.sh stop    stop the background API + web servers
#   ./scripts/dev.sh status  show what is listening
# Env overrides: POSTGRES_PORT (default 5432), API_PORT (8000), WEB_PORT (3000),
#   LLM_PROVIDER (mock), MODEL_API_KEY, MODEL_ID.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://devspace:devspace@localhost:${POSTGRES_PORT}/devspace}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"
LOG_DIR="${LOG_DIR:-/tmp/devspace}"
API_LOG="$LOG_DIR/api.log"
WEB_LOG="$LOG_DIR/web.log"

die() { echo "dev.sh: $*" >&2; exit 1; }

is_up() { curl -s -o /dev/null --max-time 3 "$1" 2>/dev/null; }

cmd_status() {
  echo "postgres: $(docker port infra-postgres-1 5432 2>/dev/null || echo down)"
  echo "redis:    $(docker port infra-redis-1 6379 2>/dev/null || echo down)"
  echo "api:      $(is_up "http://127.0.0.1:${API_PORT}/health" && echo "up :${API_PORT}" || echo down)"
  echo "web:      $(is_up "http://127.0.0.1:${WEB_PORT}/" && echo "up :${WEB_PORT}" || echo down)"
}

cmd_stop() {
  for port in "$API_PORT" "$WEB_PORT"; do
    pid="$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$pid" ]; then kill "$pid" 2>/dev/null && echo "stopped :$port (pid $pid)"; fi
  done
}

cmd_start() {
  mkdir -p "$LOG_DIR"
  command -v docker >/dev/null || die "docker is required"
  [ -d "$ROOT/.venv" ] || die "$ROOT/.venv missing — create the Python venv first"
  [ -d "$ROOT/web/node_modules" ] || die "web/node_modules missing — run 'npm install' in web/ first"

  echo "== infra (postgres :${POSTGRES_PORT}, redis) =="
  (cd "$ROOT" && POSTGRES_PORT="$POSTGRES_PORT" docker compose -f infra/docker-compose.yml up -d postgres redis)

  echo "== migrate + seed =="
  (cd "$ROOT/api" && DATABASE_URL="$DATABASE_URL" ../.venv/bin/alembic upgrade head) || die "migration failed"
  (cd "$ROOT/api" && DATABASE_URL="$DATABASE_URL" ../.venv/bin/python -m app.seed) || die "seed failed"

  echo "== api :${API_PORT} (LLM_PROVIDER=${LLM_PROVIDER:-mock}) =="
  if is_up "http://127.0.0.1:${API_PORT}/health"; then
    echo "api already running on :$API_PORT — leaving it alone"
  else
    (cd "$ROOT/api" && DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL" \
      CORS_ORIGINS="http://localhost:${WEB_PORT},http://127.0.0.1:${WEB_PORT}" \
      LLM_PROVIDER="${LLM_PROVIDER:-mock}" \
      MODEL_API_KEY="${MODEL_API_KEY:-}" MODEL_ID="${MODEL_ID:-}" \
      ../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "$API_PORT" \
      >>"$API_LOG" 2>&1 &) 
    for _ in $(seq 1 30); do is_up "http://127.0.0.1:${API_PORT}/health" && break; sleep 1; done
    is_up "http://127.0.0.1:${API_PORT}/health" || { tail -20 "$API_LOG"; die "api did not start — see $API_LOG"; }
    echo "api up (log: $API_LOG)"
  fi

  echo "== web :${WEB_PORT} =="
  if is_up "http://127.0.0.1:${WEB_PORT}/"; then
    echo "web already running on :$WEB_PORT — leaving it alone"
  else
    (cd "$ROOT/web" && NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:${API_PORT}" \
      npm run dev -- --hostname 127.0.0.1 --port "$WEB_PORT" >>"$WEB_LOG" 2>&1 &)
    for _ in $(seq 1 60); do is_up "http://127.0.0.1:${WEB_PORT}/" && break; sleep 1; done
    is_up "http://127.0.0.1:${WEB_PORT}/" || { tail -20 "$WEB_LOG"; die "web did not start — see $WEB_LOG"; }
    echo "web up (log: $WEB_LOG)"
  fi

  echo
  echo "Open http://127.0.0.1:${WEB_PORT} (demo@devspace.ai / DemoPass123!)"
  echo "Logs: $API_LOG $WEB_LOG"
}

case "${1:-start}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  *) die "usage: $0 [start|stop|status]" ;;
esac
