from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    ActivityEvent,
    Approval,
    Competency,
    Enrollment,
    Evaluation,
    Sprint,
    Standup,
    Submission,
    Task,
    TaskStatus,
    User,
)
from app.schemas import CheckInOut, EnrollmentOut, NotificationOut, ProgressOut, RetroOut

router = APIRouter(tags=["progress"])

RECENT_EVENT_LIMIT = 20

NOTIFIABLE_ACTIONS = {
    "approval.approved",
    "approval.denied",
    "evaluation.completed",
    "submission.received",
    "submission.updated",
    "agent_reply",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/api/progress", response_model=ProgressOut)
def get_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressOut:
    sprints = db.scalars(select(Sprint)).all()
    sprint_ids = {s.id for s in sprints}
    tasks = db.scalars(select(Task).where(Task.sprint_id.in_(sprint_ids))).all() if sprint_ids else []

    by_status: dict[str, int] = {s.value: 0 for s in TaskStatus}
    for t in tasks:
        by_status[t.status.value] = by_status.get(t.status.value, 0) + 1

    enrollments = db.scalars(select(Enrollment).where(Enrollment.user_id == current_user.id)).all()
    events = db.scalars(
        select(ActivityEvent)
        .where(ActivityEvent.user_id == current_user.id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(RECENT_EVENT_LIMIT)
    ).all()

    return ProgressOut(
        total_tasks=len(tasks),
        by_status=by_status,
        completed_tasks=by_status.get(TaskStatus.approved.value, 0),
        started_tasks=sum(by_status.get(s, 0) for s in (TaskStatus.in_progress.value, TaskStatus.in_review.value)),
        enrollments=[EnrollmentOut.model_validate(e) for e in enrollments],
        recent_events=[
            {
                "action": e.action,
                "object_type": e.object_type,
                "object_id": e.object_id,
                "payload": e.payload or {},
                "created_at": e.created_at.isoformat(),
            }
            for e in events
        ],
    )


@router.get("/api/progress/check-in", response_model=CheckInOut)
def manager_check_in(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CheckInOut:
    """Engineering Manager check-in derived deterministically from records.

    No LLM, no fabrication: every sentence traces to a counted row.
    """
    sub_ids = [s.id for s in db.scalars(select(Submission).where(Submission.user_id == current_user.id)).all()]
    approvals = db.scalars(select(Approval).where(Approval.submission_id.in_(sub_ids))).all() if sub_ids else []
    approved = sum(1 for a in approvals if a.decision == "approved")
    denied = sum(1 for a in approvals if a.decision == "denied")
    standups = db.scalars(
        select(Standup).where(Standup.user_id == current_user.id, Standup.status == "confirmed")
    ).all()
    tasks = db.scalars(select(Task)).all()
    blocked = [t.key for t in tasks if t.blocked_reason]
    in_review = sum(1 for t in tasks if t.status == TaskStatus.in_review)
    comps = db.scalars(
        select(Competency).where(Competency.user_id == current_user.id).order_by(Competency.score.desc())
    ).all()

    highlights: list[str] = []
    if approved:
        highlights.append(f"{approved} ticket{'s' if approved != 1 else ''} approved through evaluation.")
    if standups:
        highlights.append(f"{len(standups)} standup{'s' if len(standups) != 1 else ''} confirmed.")
    if comps:
        top = ", ".join(f"{c.skill.replace('_', ' ')} ({c.score})" for c in comps[:3])
        highlights.append(f"Strongest skill evidence: {top}.")
    if not highlights:
        highlights.append("No approvals or standups yet — the journey starts with onboarding and the first ticket.")

    next_steps: list[str] = []
    if denied:
        next_steps.append("Rework the denied submission using its remediation hints, then push a new SHA.")
    if blocked:
        next_steps.append(f"Clear open blockers: {', '.join(blocked)} (standup or ticket update).")
    if in_review:
        next_steps.append(f"{in_review} ticket{'s' if in_review != 1 else ''} awaiting evaluation results.")
    next_steps.append("Keep the daily standup habit: proposed changes need your explicit confirm.")

    summary = (
        f"{approved} approved, {denied} denied, {len(standups)} standups confirmed. "
        + ("Continue the current trajectory." if approved else "Focus on the first approval to unlock the sprint.")
    )
    return CheckInOut(generated_at=_now(), summary=summary, highlights=highlights, next_steps=next_steps)


@router.get("/api/progress/retrospective", response_model=RetroOut)
def sprint_retrospective(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RetroOut:
    """Scrum Master retrospective counted from the student's own records."""
    sub_ids = [s.id for s in db.scalars(select(Submission).where(Submission.user_id == current_user.id)).all()]
    eval_count = (
        db.scalar(select(func.count()).select_from(Evaluation).where(Evaluation.submission_id.in_(sub_ids)))
        if sub_ids
        else 0
    )
    approvals = db.scalars(select(Approval).where(Approval.submission_id.in_(sub_ids))).all() if sub_ids else []
    standups = db.scalars(
        select(Standup).where(Standup.user_id == current_user.id, Standup.status == "confirmed")
    ).all()
    tasks = db.scalars(select(Task)).all()
    open_blockers = [f"{t.key}: {t.blocked_reason}" for t in tasks if t.blocked_reason]

    notes: list[str] = []
    if standups:
        notes.append(f"Cadence held: {len(standups)} confirmed standups.")
    else:
        notes.append("No standups confirmed yet — start the daily habit on the Standup page.")
    if sub_ids and not eval_count:
        notes.append("Submissions are waiting for the evaluation worker to pick them up.")
    if open_blockers:
        notes.append(f"{len(open_blockers)} open blocker{'s' if len(open_blockers) != 1 else ''} to swarm on next.")
    return RetroOut(
        generated_at=_now(),
        standups_confirmed=len(standups),
        submissions=len(sub_ids),
        evaluations=eval_count or 0,
        approvals=sum(1 for a in approvals if a.decision == "approved"),
        denials=sum(1 for a in approvals if a.decision == "denied"),
        open_blockers=open_blockers,
        notes=notes,
    )


@router.get("/api/notifications", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationOut]:
    """Latest actionable events. Derived from the audit log; no read-state."""
    events = db.scalars(
        select(ActivityEvent)
        .where(ActivityEvent.user_id == current_user.id, ActivityEvent.action.in_(NOTIFIABLE_ACTIONS))
        .order_by(ActivityEvent.created_at.desc())
        .limit(RECENT_EVENT_LIMIT)
    ).all()
    out: list[NotificationOut] = []
    for e in events:
        payload = e.payload or {}
        if e.action == "approval.approved":
            detail = "A submission was approved; dependents unlocked."
        elif e.action == "approval.denied":
            detail = "A submission was denied; remediation hints are ready."
        elif e.action == "evaluation.completed":
            detail = f"Evaluation finished for {(payload.get('sha', '') or '')[:7]}."
        elif e.action in ("submission.received", "submission.updated"):
            detail = f"PR #{payload.get('pr_number', '?')} recorded for {payload.get('task_key', 'a ticket')}."
        else:
            detail = "An AI teammate replied in your conversation."
        out.append(
            NotificationOut(
                id=e.id, action=e.action, object_type=e.object_type, detail=detail, created_at=e.created_at
            )
        )
    return out
