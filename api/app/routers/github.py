"""GitHub App integration (Phase 05).

- `POST /api/github/webhook` verifies HMAC-SHA256 on the raw body BEFORE any
  processing, deduplicates by GitHub delivery ID, and maps pull_request events
  to student tasks. Unknown/forged payloads are rejected; unlinked repos and
  PRs without a task key are acknowledged and ignored (never fail loudly to
  GitHub in a way that loops).
- Repo linking, submission listing, and a manual PR-URL fallback (for local
  development without a GitHub App) are authenticated student endpoints.
- Accepted deliveries enqueue an evaluation job on Redis; if Redis is down the
  handler returns 500 so GitHub redelivers, and delivery-ID dedupe keeps the
  retry safe. No code is executed and no AI review is generated here
  (Phase 06).
"""

from __future__ import annotations

import json
import re

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app import config as config_module
from app.database import get_db
from app.dependencies import get_current_user
from app.github.security import (
    GithubNotConfigured,
    fetch_pr_head_sha,
    get_installation_token,
    parse_pr_url,
    resolve_task_key,
    verify_signature,
)
from app.models import (
    ActivityEvent,
    Repository,
    Submission,
    SubmissionStatus,
    Task,
    User,
    WebhookDelivery,
)
from app.queue import enqueue_evaluation, get_redis
from app.schemas import (
    GithubReposOut,
    RepoLinkIn,
    RepositoryOut,
    SubmissionCreateIn,
    SubmissionOut,
)

router = APIRouter(tags=["github"])

FULL_NAME_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
PR_ACTIONS_UPSERT = {"opened", "reopened", "synchronize"}


# Module-level so tests can monkeypatch app.routers.github.get_settings.
def get_settings():  # noqa: D103
    return config_module.get_settings()


def _repo_out(r: Repository) -> RepositoryOut:
    return RepositoryOut(
        id=r.id,
        full_name=r.full_name,
        github_id=r.github_id,
        installation_id=r.installation_id,
        link_method="app" if r.installation_id else "manual",
        created_at=r.created_at,
    )


def _submission_out(db: Session, s: Submission) -> SubmissionOut:
    task = db.query(Task).filter(Task.id == s.task_id).first()
    latest_eval = None
    if s.evaluations:
        latest = sorted(s.evaluations, key=lambda e: e.created_at)[-1]
        latest_eval = latest.policy_decision
    return SubmissionOut(
        id=s.id,
        task_id=s.task_id,
        task_key=task.key if task else None,
        pr_number=s.pr_number,
        repository_id=s.repository_id,
        head_sha=s.head_sha,
        status=s.status.value,
        pr_state=s.pr_state,
        merged=s.merged,
        source=s.source,
        latest_decision=latest_eval,
        created_at=s.created_at,
    )


def _enqueue_or_raise(submission_id: str, sha: str) -> None:
    try:
        enqueue_evaluation(get_redis(), submission_id, sha)
    except Exception as exc:  # Redis down -> 500 so GitHub redelivers.
        raise HTTPException(status_code=500, detail=f"evaluation queue unavailable: {exc}") from exc


@router.post("/api/github/webhook")
async def github_webhook(
    request: Request,
    db: Session = Depends(get_db),
    event: str | None = Header(default=None, alias="X-GitHub-Event"),
    delivery: str | None = Header(default=None, alias="X-GitHub-Delivery"),
    signature: str | None = Header(default=None, alias="X-Hub-Signature-256"),
) -> JSONResponse:
    settings = get_settings()
    if not settings.github_webhook_secret:
        return JSONResponse(status_code=503, content={"detail": "webhook receiver not configured"})
    raw = await request.body()
    if not delivery or not verify_signature(settings.github_webhook_secret, raw, signature):
        return JSONResponse(status_code=401, content={"detail": "invalid webhook signature"})

    existing = db.query(WebhookDelivery).filter(WebhookDelivery.delivery_id == delivery).first()
    if existing is not None:
        return JSONResponse(status_code=200, content={"status": "duplicate", "delivery": delivery})

    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        db.add(
            WebhookDelivery(
                delivery_id=delivery, event=event or "unknown", processed=False, error="invalid JSON payload"
            )
        )
        db.commit()
        return JSONResponse(status_code=400, content={"detail": "invalid JSON payload"})

    action = payload.get("action")
    repo_full_name = (payload.get("repository") or {}).get("full_name")
    record = WebhookDelivery(
        delivery_id=delivery, event=event or "unknown", action=action, repo_full_name=repo_full_name
    )
    db.add(record)

    if event != "pull_request" or action not in PR_ACTIONS_UPSERT | {"closed"}:
        record.processed = True
        record.error = f"ignored event {event}/{action}"
        db.commit()
        return JSONResponse(status_code=200, content={"status": "ignored", "delivery": delivery})

    repo = db.query(Repository).filter(Repository.full_name == repo_full_name).first() if repo_full_name else None
    if repo is None:
        record.processed = True
        record.error = f"unlinked repository {repo_full_name}"
        db.commit()
        return JSONResponse(status_code=200, content={"status": "unlinked_repo", "delivery": delivery})

    pr = payload.get("pull_request") or {}
    pr_number = pr.get("number") or payload.get("number")
    head_sha = ((pr.get("head") or {}).get("sha")) or ""
    task_key = resolve_task_key(pr.get("title"), pr.get("body"), (pr.get("head") or {}).get("ref"))
    task = db.query(Task).filter(Task.key == task_key).first() if task_key else None
    if pr_number is None or not head_sha or task is None:
        record.processed = True
        record.error = f"unresolvable PR (number={pr_number}, sha={'set' if head_sha else 'missing'}, task={task_key})"
        db.commit()
        return JSONResponse(status_code=200, content={"status": "unresolved", "delivery": delivery})

    submission = (
        db.query(Submission)
        .filter(
            Submission.user_id == repo.user_id,
            Submission.repository_id == repo.id,
            Submission.pr_number == int(pr_number),
        )
        .first()
    )
    if action == "closed":
        if submission is not None:
            submission.pr_state = "closed"
            submission.merged = bool(pr.get("merged", False))
            submission.last_delivery_id = delivery
        record.processed = True
        db.commit()
        return JSONResponse(status_code=200, content={"status": "closed", "delivery": delivery})

    created = False
    if submission is None:
        submission = Submission(
            task_id=task.id,
            user_id=repo.user_id,
            pr_number=int(pr_number),
            repository_id=repo.id,
            head_sha=head_sha,
            status=SubmissionStatus.submitted,
            source="webhook",
        )
        db.add(submission)
        created = True
    else:
        submission.head_sha = head_sha
        submission.task_id = task.id
        submission.status = SubmissionStatus.submitted
        submission.pr_state = "open"
    submission.last_delivery_id = delivery
    db.flush()
    db.add(
        ActivityEvent(
            user_id=repo.user_id,
            actor="github",
            action="submission.received" if created else "submission.updated",
            object_type="submission",
            object_id=submission.id,
            payload={"pr_number": int(pr_number), "head_sha": head_sha, "task_key": task_key},
        )
    )
    record.processed = True
    db.commit()

    _enqueue_or_raise(submission.id, head_sha)
    return JSONResponse(
        status_code=200, content={"status": "created" if created else "updated", "delivery": delivery}
    )


@router.get("/api/github/status", response_model=GithubReposOut)
def github_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GithubReposOut:
    settings = get_settings()
    repos = db.query(Repository).filter(Repository.user_id == current_user.id).all()
    return GithubReposOut(
        app_configured=settings.github_configured, repos=[_repo_out(r) for r in repos]
    )


@router.post("/api/github/repos", response_model=RepositoryOut, status_code=201)
def link_repo(
    body: RepoLinkIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RepositoryOut:
    full_name = body.full_name.strip()
    if not FULL_NAME_RE.match(full_name):
        raise HTTPException(status_code=422, detail="full_name must look like owner/repo")
    existing = (
        db.query(Repository)
        .filter(Repository.user_id == current_user.id, Repository.full_name == full_name)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="repository already linked")
    repo = Repository(user_id=current_user.id, full_name=full_name)
    db.add(repo)
    db.commit()
    db.refresh(repo)
    return _repo_out(repo)


@router.delete("/api/github/repos/{repo_id}", status_code=204)
def unlink_repo(
    repo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    repo = (
        db.query(Repository)
        .filter(Repository.id == repo_id, Repository.user_id == current_user.id)
        .first()
    )
    if repo is None:
        raise HTTPException(status_code=404, detail="repository not found")
    db.delete(repo)
    db.commit()
    return None


@router.get("/api/submissions", response_model=list[SubmissionOut])
def list_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SubmissionOut]:
    rows = (
        db.query(Submission)
        .filter(Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .all()
    )
    return [_submission_out(db, s) for s in rows]


@router.post("/api/submissions", response_model=SubmissionOut, status_code=201)
def create_submission(
    body: SubmissionCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmissionOut:
    task = (
        db.query(Task)
        .filter(Task.id == body.task_id)
        .first()
    )
    if task is None:
        raise HTTPException(status_code=422, detail="unknown task")
    parsed = parse_pr_url(body.pr_url)
    if parsed is None:
        raise HTTPException(status_code=422, detail="pr_url must look like https://github.com/owner/repo/pull/123")
    owner, repo_name, pr_number = parsed
    full_name = f"{owner}/{repo_name}"
    repo = (
        db.query(Repository)
        .filter(Repository.user_id == current_user.id, Repository.full_name == full_name)
        .first()
    )
    if repo is None:
        raise HTTPException(status_code=422, detail="repository is not linked; link it on the GitHub page first")

    settings = get_settings()
    head_sha = body.head_sha
    source = "manual"
    if head_sha is None:
        # Resolve the exact SHA from GitHub when the App is configured.
        if not settings.github_configured or not repo.installation_id:
            raise HTTPException(
                status_code=422,
                detail="head_sha is required without a GitHub App installation; paste the exact commit SHA from the PR",
            )
        try:
            token, _ = get_installation_token(
                settings.github_app_id, settings.github_private_key_path, repo.installation_id, settings.github_api_url
            )
            head_sha, _state, _head, _base = fetch_pr_head_sha(
                settings.github_api_url, token, owner, repo_name, pr_number
            )
            source = "webhook"
        except GithubNotConfigured as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"could not read PR from GitHub: {exc}") from exc

    submission = Submission(
        task_id=task.id,
        user_id=current_user.id,
        pr_number=pr_number,
        repository_id=repo.id,
        head_sha=head_sha,
        status=SubmissionStatus.submitted,
        source=source,
    )
    db.add(submission)
    db.flush()
    db.add(
        ActivityEvent(
            user_id=current_user.id,
            actor=f"user:{current_user.id}",
            action="submission.received",
            object_type="submission",
            object_id=submission.id,
            payload={"pr_number": pr_number, "head_sha": head_sha, "source": source},
        )
    )
    db.commit()
    db.refresh(submission)
    _enqueue_or_raise(submission.id, head_sha)
    return _submission_out(db, submission)
