"""SHA-pinned evaluation pipeline (Phase 06).

run_evaluation() is synchronous and idempotent:
- Same (submission, sha) twice -> returns the existing row ("duplicate").
- Job sha older than the submission's current head -> records a "stale"
  evaluation for audit and does NOT touch submission status ("stale").
- Fresh sha -> static checks + model review, persisted as one immutable
  Evaluation row; submission moves to evaluated ("evaluated").

The review NEVER approves by itself; the Phase 07 policy engine decides.
Timeouts on fetch/review are recorded as errors, never coerced into passes.
"""

from __future__ import annotations

import json
import time
from typing import Callable

from sqlalchemy.orm import Session

from app import config as config_module
from app.agents.orchestrator import get_provider
from app.agents.provider import ProviderError
from app.eval.checks import run_static_checks
from app.eval.review import (
    PROMPT_VERSION,
    empty_review,
    mock_review,
    validate_review,
)
from app.github.security import get_installation_token
from app.models import (
    ActivityEvent,
    Evaluation,
    Repository,
    Submission,
    SubmissionStatus,
)

TEST_SUITE_VERSION = "static-1"
MAX_ATTEMPTS = 3


class TransientEvalError(RuntimeError):
    """Retryable (network/timeout). The worker requeues up to MAX_ATTEMPTS."""


Reviewer = Callable[[str, str, str], dict]
DiffFetcher = Callable[[], str | None]


def _redacted_diff_for_review(redacted_diff: str, sha: str) -> str:
    return redacted_diff[:20_000]


def meta_reviewer(redacted_diff: str, checks_summary: str, sha: str, timeout_s: int = 60) -> dict:
    settings = config_module.get_settings()
    try:
        provider = get_provider(settings.llm_provider, settings)
    except ProviderError as exc:
        raise TransientEvalError(str(exc)) from exc
    if settings.llm_provider == "mock" or getattr(provider, "mock", False):
        return mock_review(sha, checks_summary)
    system = (
        "You review student pull request diffs. Reply with ONLY a JSON object matching: "
        '{"schema_version": "1", "sha": "<sha>", "mock": false, "summary": "<2-3 sentences>", '
        '"findings": [{"severity": "info|minor|major|blocking", "message": "<text>", '
        '"file": "<optional>", "line": <optional>}]}. No other text.'
    )
    try:
        resp = provider.respond(
            persona="qa-engineer",
            system_prompt=system,
            context=f"HEAD sha: {sha}. Static checks: {checks_summary}.",
            history=[],
            user_message=f"Review this redacted diff (secrets already removed):\n{_redacted_diff_for_review(redacted_diff, sha)}",
        )
    except ProviderError as exc:
        raise TransientEvalError(str(exc)) from exc
    if getattr(resp, "mock", False):
        # Adapter truthfully reports a mock reply: never try to parse it.
        return mock_review(sha, checks_summary)
    try:
        data = json.loads(resp.text)
    except (json.JSONDecodeError, ValueError) as exc:
        review = empty_review(False, sha, "Model returned non-JSON output.")
        review["error"] = f"malformed review JSON: {exc}"
        review["model_version"] = getattr(resp, "model", "unknown")
        return review
    checked, error = validate_review(data if isinstance(data, dict) else {}, sha)
    if error or checked is None:
        bad = empty_review(False, sha, "Model output failed schema validation.")
        bad["error"] = error or "empty review"
        bad["model_version"] = getattr(resp, "model", "unknown")
        return bad
    checked["model_version"] = getattr(resp, "model", "unknown")
    return checked


def github_diff_fetcher(submission: Submission, repo: Repository, timeout_s: int = 30) -> DiffFetcher:
    def _fetch() -> str | None:
        settings = config_module.get_settings()
        if not settings.github_configured or not repo.installation_id:
            return None
        token, _ = get_installation_token(
            settings.github_app_id, settings.github_private_key_path, repo.installation_id, settings.github_api_url
        )
        owner, _, name = repo.full_name.partition("/")
        import httpx

        res = httpx.get(
            f"{settings.github_api_url}/repos/{owner}/{name}/pulls/{submission.pr_number}",
            params={"per_page": "1"},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.diff",
            },
            timeout=timeout_s,
        )
        res.raise_for_status()
        return res.text

    return _fetch


def run_evaluation(
    db: Session,
    submission_id: str,
    sha: str,
    *,
    diff_text: str | None = None,
    reviewer: Reviewer | None = None,
    diff_fetcher: DiffFetcher | None = None,
    review_timeout_s: int = 60,
) -> tuple[str, Evaluation]:
    """Run one evaluation. Returns (outcome, evaluation) with outcome in
    {"evaluated", "duplicate", "stale"}."""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if submission is None:
        raise ValueError(f"unknown submission {submission_id}")

    existing = db.query(Evaluation).filter(Evaluation.submission_id == submission_id, Evaluation.sha == sha).first()
    if existing is not None:
        return "duplicate", existing

    if submission.head_sha != sha:
        stale = Evaluation(
            submission_id=submission_id,
            sha=sha,
            test_results={"status": "stale", "detail": f"Superseded by newer head {submission.head_sha}."},
            ai_review=empty_review(False, sha, "Skipped: stale SHA."),
            policy_decision="stale",
            policy_reason="Job SHA is older than the submission's current head.",
            test_suite_version=TEST_SUITE_VERSION,
            prompt_version=PROMPT_VERSION,
        )
        db.add(stale)
        db.commit()
        db.refresh(stale)
        return "stale", stale

    started = time.time()
    if diff_text is None and diff_fetcher is not None:
        try:
            diff_text = diff_fetcher()
        except Exception as exc:
            raise TransientEvalError(f"diff fetch failed: {exc}") from exc
    static = run_static_checks(diff_text, sha)
    checks_summary = "; ".join(f"{c['name']}={c['status']}" for c in static["checks"])

    review_fn = reviewer or (lambda d, s, t: meta_reviewer(d, s, t, review_timeout_s))
    try:
        review = review_fn(static["redacted_diff"], checks_summary, sha)
    except TransientEvalError:
        raise
    except Exception as exc:
        review = empty_review(False, sha, "Reviewer crashed.")
        review["error"] = f"reviewer error: {exc}"
    # Normalize every reviewer output through the same schema gate, so no
    # adapter can smuggle malformed findings into a persisted evaluation.
    if not isinstance(review, dict) or review.get("error"):
        if not isinstance(review, dict):
            review = empty_review(False, sha, "Reviewer returned a non-object.")
            review["error"] = "review must be a JSON object"
    else:
        checked, check_error = validate_review(review, sha)
        if check_error:
            review = empty_review(False, sha, "Review output failed schema validation.")
            review["error"] = check_error
        else:
            assert checked is not None
            review = checked

    model_version = review.pop("model_version", None) if isinstance(review, dict) else None
    evaluation = Evaluation(
        submission_id=submission_id,
        sha=sha,
        test_results={"status": "complete", "checks": static["checks"], "stats": static["stats"], "elapsed_s": round(time.time() - started, 2)},
        ai_review=review,
        model_version=model_version if isinstance(model_version, str) else ("mock" if review.get("mock") else "meta"),
        prompt_version=PROMPT_VERSION,
        test_suite_version=TEST_SUITE_VERSION,
    )
    submission.status = SubmissionStatus.evaluated
    db.add(evaluation)
    db.flush()
    db.add(
        ActivityEvent(
            user_id=submission.user_id,
            actor="system",
            action="evaluation.completed",
            object_type="evaluation",
            object_id=evaluation.id,
            payload={"submission_id": submission_id, "sha": sha},
        )
    )
    db.commit()
    db.refresh(evaluation)
    return "evaluated", evaluation


def requeue_or_fail(redis_client, submission_id: str, sha: str, attempts: int) -> str:
    """Requeue a transient failure or give up. Returns 'requeued' or 'exhausted'."""
    from app.queue import EVAL_QUEUE

    if attempts >= MAX_ATTEMPTS:
        return "exhausted"
    payload = json.dumps({"submission_id": submission_id, "sha": sha, "attempts": attempts + 1})
    redis_client.lpush(EVAL_QUEUE, payload)
    return "requeued"
