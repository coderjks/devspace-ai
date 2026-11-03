"""Per-student effective task status over shared curriculum task rows.

Task rows are templates: every intern sees the same six tickets, but each
intern's position on them is personal. Resolution order for student U on
task T:

1. ``approved`` — U has an approved approval on one of U's submissions for T.
2. U's own ``UserTaskState`` row (board moves, personal blocker note).
3. ``todo`` — T's template status is ``locked`` but U already approved every
   prerequisite (unlock computed, never stored globally).
4. T's template status otherwise.

Nothing here writes Task.status: the shared rows stay at their seeded
template values for every student.
"""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Approval, Submission, Task, TaskDependency, TaskStatus, UserTaskState


def approved_task_ids(db: Session, user_id: str) -> set[str]:
    sub_ids = select(Submission.id).where(Submission.user_id == user_id)
    rows = db.scalars(
        select(Submission.task_id)
        .where(Submission.id.in_(sub_ids), Submission.user_id == user_id)
        .join(Approval, Approval.submission_id == Submission.id)
        .where(Approval.decision == "approved")
    ).all()
    return set(rows)


def user_state_rows(db: Session, user_id: str) -> dict[str, UserTaskState]:
    rows = db.scalars(select(UserTaskState).where(UserTaskState.user_id == user_id)).all()
    return {r.task_id: r for r in rows}


def dependency_map(db: Session, task_ids: list[str]) -> dict[str, list[str]]:
    deps: dict[str, list[str]] = {tid: [] for tid in task_ids}
    if not task_ids:
        return deps
    rows = db.scalars(select(TaskDependency).where(TaskDependency.task_id.in_(task_ids))).all()
    for d in rows:
        deps.setdefault(d.task_id, []).append(d.depends_on_task_id)
    return deps


def resolve_statuses(
    db: Session, user_id: str, tasks: Sequence[Task]
) -> tuple[dict[str, TaskStatus], dict[str, UserTaskState]]:
    """Return (effective status by task id, state row by task id) for one student."""
    approved = approved_task_ids(db, user_id)
    states = user_state_rows(db, user_id)
    deps = dependency_map(db, [t.id for t in tasks])
    out: dict[str, TaskStatus] = {}
    for task in tasks:
        if task.id in approved:
            out[task.id] = TaskStatus.approved
            continue
        state = states.get(task.id)
        if state is not None:
            out[task.id] = state.status
            continue
        if task.status == TaskStatus.locked and all(d in approved for d in deps.get(task.id, [])):
            out[task.id] = TaskStatus.todo
            continue
        out[task.id] = task.status
    return out, states


def effective_blocked_reason(task: Task, states: dict[str, UserTaskState]) -> str | None:
    state = states.get(task.id)
    if state is not None:
        return state.blocked_reason
    return None


def upsert_state(
    db: Session, user_id: str, task_id: str, status: TaskStatus, blocked_reason: str | None = None
) -> UserTaskState:
    row = db.scalar(
        select(UserTaskState).where(UserTaskState.user_id == user_id, UserTaskState.task_id == task_id)
    )
    if row is None:
        row = UserTaskState(user_id=user_id, task_id=task_id, status=status, blocked_reason=blocked_reason)
        db.add(row)
    else:
        row.status = status
        if blocked_reason is not None:
            row.blocked_reason = blocked_reason
    db.flush()
    return row
