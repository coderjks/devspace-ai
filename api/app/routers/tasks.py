from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ActivityEvent, Sprint, Task, TaskStatus, User
from app.schemas import TaskDependencyOut, TaskDetailOut, TaskOut, TaskTransitionIn

router = APIRouter(tags=["tasks"])

# Student-driven transitions allowed in Phase 02. Approval (`approved`) is
# never granted here — only the deterministic progression service (Phase 07)
# may approve, so the endpoint rejects it explicitly.
ALLOWED_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.todo: {TaskStatus.in_progress},
    TaskStatus.in_progress: {TaskStatus.todo},
    TaskStatus.locked: set(),
    TaskStatus.in_review: set(),
    TaskStatus.approved: set(),
    TaskStatus.blocked: set(),
}


def _task_out(task: Task, key_by_id: dict[str, str]) -> TaskOut:
    return TaskOut(
        id=task.id,
        key=task.key,
        title=task.title,
        description=task.description,
        acceptance_criteria=task.acceptance_criteria or {},
        rubric_json=task.rubric_json or {},
        status=task.status,
        sort_order=task.sort_order,
        blocked_reason=task.blocked_reason,
        dependencies=[
            TaskDependencyOut(
                depends_on_key=key_by_id.get(d.depends_on_task_id, ""),
                depends_on_task_id=d.depends_on_task_id,
            )
            for d in task.dependencies
        ],
    )


def _load_task(db: Session, task_id: str) -> tuple[Task, TaskOut, str]:
    task = db.scalar(
        select(Task).where(Task.id == task_id).options(joinedload(Task.dependencies))
    )
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    sprint = db.get(Sprint, task.sprint_id)
    siblings = db.scalars(select(Task).where(Task.sprint_id == task.sprint_id)).all()
    key_by_id = {t.id: t.key for t in siblings}
    return task, _task_out(task, key_by_id), (sprint.name if sprint else "")


@router.get("/api/tasks/{task_id}", response_model=TaskDetailOut)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskDetailOut:
    task, detail, sprint_name = _load_task(db, task_id)
    return TaskDetailOut(**detail.model_dump(), sprint_id=task.sprint_id, sprint_name=sprint_name)


@router.post("/api/tasks/{task_id}/transitions", response_model=TaskDetailOut)
def transition_task(
    task_id: str,
    payload: TaskTransitionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskDetailOut:
    try:
        target = TaskStatus(payload.to_status.strip().lower())
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown task status")
    if target == TaskStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tasks cannot be marked approved manually; approval requires a passing evaluation",
        )
    task, _, _ = _load_task(db, task_id)
    allowed = ALLOWED_TRANSITIONS.get(task.status, set())
    if target not in allowed:
        if task.status == TaskStatus.locked:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Task is locked; complete its prerequisite tasks first",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Transition from {task.status.value} to {target.value} is not allowed",
        )
    previous = task.status
    task.status = target
    db.add(task)
    db.add(
        ActivityEvent(
            user_id=current_user.id,
            actor=f"user:{current_user.id}",
            action="task.transition",
            object_type="task",
            object_id=task.id,
            payload={"key": task.key, "from": previous.value, "to": target.value},
        )
    )
    db.commit()
    db.refresh(task)
    task, detail, sprint_name = _load_task(db, task_id)
    return TaskDetailOut(**detail.model_dump(), sprint_id=task.sprint_id, sprint_name=sprint_name)
