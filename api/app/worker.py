"""Background evaluation worker (Phase 06).

Dequeues evaluation jobs from Redis and runs the SHA-pinned pipeline with a
fresh database session per job. Transient failures (network/timeout) are
requeued with an attempt counter up to MAX_ATTEMPTS; anything else is recorded
on the evaluation, never silently dropped.

Run:  python -m app.worker   (from the api/ directory)
Stop: Ctrl-C (finishes the current job, then exits).
"""

from __future__ import annotations

import logging
import signal

from app.database import SessionLocal
from app.eval.pipeline import TransientEvalError, requeue_or_fail, run_evaluation
from app.models import Submission, SubmissionStatus
from app.queue import dequeue_evaluation, get_redis

log = logging.getLogger("devspace.worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

_stop = False


def _handle_stop(signum, frame):  # noqa: ANN001, ANN202
    global _stop
    _stop = True
    log.info("shutdown requested; finishing current job")


def process_one(redis_client, job: dict) -> str:
    submission_id = job["submission_id"]
    sha = job["sha"]
    attempts = int(job.get("attempts", 0))
    db = SessionLocal()
    try:
        db.query(Submission).filter(Submission.id == submission_id).first()
        return _run(db, redis_client, submission_id, sha, attempts)
    finally:
        db.close()


def _run(db, redis_client, submission_id: str, sha: str, attempts: int) -> str:
    try:
        outcome, evaluation = run_evaluation(db, submission_id, sha)
    except TransientEvalError as exc:
        action = requeue_or_fail(redis_client, submission_id, sha, attempts)
        log.warning("transient failure (attempt %d): %s -> %s", attempts, exc, action)
        if action == "exhausted":
            _record_give_up(db, submission_id, sha, str(exc))
        return action
    log.info("evaluated %s@%s -> %s", submission_id, sha[:7], outcome)
    return outcome


def _record_give_up(db, submission_id: str, sha: str, reason: str) -> None:
    from app.eval.review import empty_review
    from app.models import Evaluation

    db.add(
        Evaluation(
            submission_id=submission_id,
            sha=sha,
            test_results={"status": "error", "detail": f"Worker gave up after retries: {reason}"},
            ai_review=empty_review(False, sha, "Skipped: worker gave up."),
            policy_decision="error",
            policy_reason=reason,
        )
    )
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if sub is not None:
        sub.status = SubmissionStatus.evaluated
    db.commit()


def main() -> None:
    signal.signal(signal.SIGINT, _handle_stop)
    signal.signal(signal.SIGTERM, _handle_stop)
    redis_client = get_redis()
    log.info("worker started; waiting for evaluation jobs")
    while not _stop:
        job = dequeue_evaluation(redis_client, timeout=10)
        if job is None:
            continue
        if not isinstance(job, dict) or "submission_id" not in job or "sha" not in job:
            log.warning("dropping malformed job: %r", job)
            continue
        try:
            process_one(redis_client, job)
        except Exception:  # never kill the loop on one bad job
            log.exception("job failed: %r", job)


if __name__ == "__main__":
    main()
