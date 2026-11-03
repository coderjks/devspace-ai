#!/bin/sh
# Container entrypoint: prepare runtime state, then run the given command.
#
# 1. Materialize the GitHub App private key when provided as base64
#    (GITHUB_APP_PRIVATE_KEY_B64). Hosts without secret files set this
#    variable; local Compose mounts the key file instead, so this step is
#    a no-op there. The target honors GITHUB_APP_PRIVATE_KEY_PATH.
# 2. Run database migrations (idempotent `upgrade head`) so the app never
#    boots against an empty schema.
set -e
if [ -n "${GITHUB_APP_PRIVATE_KEY_B64:-}" ]; then
  KEY_PATH="${GITHUB_APP_PRIVATE_KEY_PATH:-/app/secrets/github-app.pem}"
  mkdir -p "$(dirname "$KEY_PATH")"
  printf '%s' "$GITHUB_APP_PRIVATE_KEY_B64" | base64 -d > "$KEY_PATH"
  chmod 600 "$KEY_PATH"
fi
alembic upgrade head
# Optional demo seed (idempotent insert-if-missing: never updates existing
# rows, so re-runs can't clobber student progress). Opt-in via
# RUN_SEED_ON_BOOT=true — set it on the API service only, never on the
# worker, so two processes can't seed the same empty database concurrently.
if [ "${RUN_SEED_ON_BOOT:-false}" = "true" ]; then
  python -m app.seed
fi
exec "$@"
