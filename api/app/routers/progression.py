"""Approval, unlock, remediation, and competency endpoints (Phase 07).

All progression state is server-derived. Clients (including the web UI) only
display what these endpoints return — nothing here trusts client claims about
completion, prerequisites, or unlocks.
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Approval, Competency, Remediation, Sprint, Submission, Task, TaskDependency, TaskStatus, User
from app.progression.service import ProgressionError, request_approval
from app.schemas import (
    ApprovalOut,
    ApprovalRequestIn,
    CompetencyOut,
    EligibilityOut,
    PrereqOut,
    RemediationOut,
    TaskEligibilityOut,
)

router = APIRouter(tags=["progression"])


def _out(approval: Approval, created: bool, unlocked: list[str] | None = None) -> ApprovalOut:
    return ApprovalOut(
        id=approval.id,
        submission_id=approval.submission_id,
        evaluation_id=approval.evaluation_id,
        decision=approval.decision,
        reason=approval.reason,
        policy_version=approval.policy_version,
        unlocked=unlocked or [],
        created=created,
        created_at=approval.created_at,
    )


@router.post("/api/submissions/{submission_id}/approvals", response_model=ApprovalOut, status_code=201)
def decide_approval(
    submission_id: str,
    body: ApprovalRequestIn,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalOut:
    try:
        approval, created, unlocked = request_approval(db, current_user.id, submission_id, body.idempotency_key)
    except ProgressionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)
    response.status_code = 201 if created else 200
    return _out(approval, created, unlocked)


@router.get("/api/submissions/{submission_id}/approvals/latest", response_model=ApprovalOut)
def latest_approval(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalOut:
    sub = (
        db.query(Submission)
        .filter(Submission.id == submission_id, Submission.user_id == current_user.id)
        .first()
    )
    if sub is None:
        raise HTTPException(status_code=404, detail="submission not found")
    approval = (
        db.query(Approval).filter(Approval.submission_id == submission_id).order_by(Approval.created_at.desc()).first()
    )
    if approval is None:
        raise HTTPException(status_code=404, detail="no approval decision yet")
    return _out(approval, created=False)


@router.get("/api/approvals/{approval_id}/remediation", response_model=RemediationOut)
def get_remediation(
    approval_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RemediationOut:
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if approval is None:
        raise HTTPException(status_code=404, detail="approval not found")
    sub = (
        db.query(Submission)
        .filter(Submission.id == approval.submission_id, Submission.user_id == current_user.id)
        .first()
    )
    if sub is None:
        raise HTTPException(status_code=404, detail="approval not found")
    if approval.decision != "denied":
        raise HTTPException(status_code=404, detail="no remediation for an approved submission")
    remed = db.query(Remediation).filter(Remediation.approval_id == approval.id).first()
    if remed is None:
        raise HTTPException(status_code=404, detail="remediation not found")
    return RemediationOut(
        id=remed.id,
        approval_id=remed.approval_id,
        failed_checks=list(remed.failed_checks or []),
        hints=list(remed.hints or []),
        created_at=remed.created_at,
    )


@router.get("/api/progress/competencies", response_model=list[CompetencyOut])
def list_competencies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CompetencyOut]:
    rows = (
        db.query(Competency)
        .filter(Competency.user_id == current_user.id)
        .order_by(Competency.skill.asc())
        .all()
    )
    return [CompetencyOut(skill=r.skill, score=r.score, evidence_count=r.evidence_count, updated_at=r.updated_at) for r in rows]


@router.get("/api/progress/eligibility", response_model=EligibilityOut)
def task_eligibility(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EligibilityOut:
    sprint = db.query(Sprint).first()
    if sprint is None:
        return EligibilityOut()
    tasks = (
        db.query(Task).filter(Task.sprint_id == sprint.id).order_by(Task.sort_order.asc()).all()
    )
    by_id = {t.id: t for t in tasks}
    items: list[TaskEligibilityOut] = []
    for task in tasks:
        prereqs: list[PrereqOut] = []
        for dep in db.query(TaskDependency).filter(TaskDependency.task_id == task.id).all():
            pre = by_id.get(dep.depends_on_task_id)
            if pre is None:
                continue
            prereqs.append(PrereqOut(key=pre.key, title=pre.title, met=pre.status == TaskStatus.approved))
        latest = None
        subs = (
            db.query(Submission)
            .filter(Submission.task_id == task.id, Submission.user_id == current_user.id)
            .order_by(Submission.created_at.desc())
            .all()
        )
        for sub in subs:
            latest = (
                db.query(Approval)
                .filter(Approval.submission_id == sub.id)
                .order_by(Approval.created_at.desc())
                .first()
            )
            if latest is not None:
                break
        items.append(
            TaskEligibilityOut(
                task_id=task.id,
                key=task.key,
                title=task.title,
                status=task.status.value,
                prerequisites=prereqs,
                latest_decision=latest.decision if latest else None,
                latest_reason=latest.reason if latest else None,
                latest_approval_id=latest.id if latest else None,
            )
        )
    next_key = next((i.key for i in items if i.status == "todo"), None)
    return EligibilityOut(tasks=items, next_recommended_key=next_key)
