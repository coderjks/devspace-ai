from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ActivityEvent, Enrollment, Sprint, Task, TaskStatus, User
from app.schemas import EnrollmentOut, ProgressOut

router = APIRouter(tags=["progress"])

RECENT_EVENT_LIMIT = 20


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
