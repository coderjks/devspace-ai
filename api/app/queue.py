"""Minimal Redis-backed job queue (Phase 05 enqueue, Phase 06 worker).

No new dependencies: plain redis LPUSH/BRPOP with JSON payloads. The webhook
handler enqueues evaluation jobs; delivery is retried by GitHub redelivery
when enqueue fails, and delivery-id dedupe keeps that safe.
"""

from __future__ import annotations

import json

import redis

from app.config import get_settings

EVAL_QUEUE = "devspace:eval:jobs"

_redis_client = None


def get_redis():
    """Process-local Redis client. Raises redis.RedisError when unreachable."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis.from_url(get_settings().redis_url, socket_connect_timeout=5)
    return _redis_client


def enqueue_evaluation(redis_client, submission_id: str, sha: str) -> None:
    payload = json.dumps({"submission_id": submission_id, "sha": sha})
    redis_client.lpush(EVAL_QUEUE, payload)


def dequeue_evaluation(redis_client, timeout: int = 10) -> dict | None:
    item = redis_client.brpop(EVAL_QUEUE, timeout=timeout)
    if not item:
        return None
    return json.loads(item[1])
