"""Evaluation report endpoints (Phase 06).

Read-only evaluation history plus a manual re-run trigger. The trigger only
enqueues; the worker (or tests) runs the SHA-pinned pipeline, which is
idempotent per (submission, sha). Approval decisions belong to Phase 07.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Evaluation, Submission, User
from app.queue import enqueue_evaluation, get_redis
from app.schemas import EvaluateTriggerOut, EvaluationOut

router = APIRouter(tags=["evaluations"])


def _owned_submission(db: Session, user: User, submission_id: str) -> Submission:
    sub = (
        db.query(Submission)
        .filter(Submission.id == submission_id, Submission.user_id == user.id)
        .first()
    )
    if sub is None:
        raise HTTPException(status_code=404, detail="submission not found")
    return sub


def _out(e: Evaluation) -> EvaluationOut:
    return EvaluationOut(
        id=e.id,
        submission_id=e.submission_id,
        sha=e.sha,
        test_results=e.test_results,
        ai_review=e.ai_review,
        policy_decision=e.policy_decision,
        policy_reason=e.policy_reason,
        model_version=e.model_version,
        prompt_version=e.prompt_version,
        test_suite_version=e.test_suite_version,
        policy_version=e.policy_version,
        created_at=e.created_at,
    )


@router.get("/api/submissions/{submission_id}/evaluations", response_model=list[EvaluationOut])
def list_evaluations(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EvaluationOut]:
    sub = _owned_submission(db, current_user, submission_id)
    rows = (
        db.query(Evaluation)
        .filter(Evaluation.submission_id == sub.id)
        .order_by(Evaluation.created_at.desc())
        .all()
    )
    return [_out(e) for e in rows]


@router.post("/api/submissions/{submission_id}/evaluate", response_model=EvaluateTriggerOut)
def trigger_evaluation(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvaluateTriggerOut:
    sub = _owned_submission(db, current_user, submission_id)
    if not sub.head_sha:
        raise HTTPException(status_code=422, detail="submission has no head SHA to evaluate")
    try:
        enqueue_evaluation(get_redis(), sub.id, sub.head_sha)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"evaluation queue unavailable: {exc}") from exc
    return EvaluateTriggerOut(status="queued", submission_id=sub.id, sha=sub.head_sha)
