from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Enrollment, Project, Sprint, Task, User
from app.schemas import EnrollmentOut, ProjectOut, SprintOut, TaskDependencyOut, TaskOut

router = APIRouter(tags=["projects"])


def _task_out(task: Task, key_by_id: dict[str, str]) -> TaskOut:
    deps = [
        TaskDependencyOut(depends_on_key=key_by_id.get(d.depends_on_task_id, ""), depends_on_task_id=d.depends_on_task_id)
        for d in task.dependencies
    ]
    return TaskOut(
        id=task.id,
        key=task.key,
        title=task.title,
        description=task.description,
        acceptance_criteria=task.acceptance_criteria or {},
        rubric_json=task.rubric_json or {},
        status=task.status,
        sort_order=task.sort_order,
        dependencies=deps,
    )


@router.get("/api/projects/current", response_model=ProjectOut)
def get_current_project(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectOut:
    project = db.scalar(select(Project).order_by(Project.created_at.asc()))
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No project seeded")
    sprint = db.scalar(
        select(Sprint)
        .where(Sprint.project_id == project.id)
        .options(joinedload(Sprint.tasks).joinedload(Task.dependencies))
        .order_by(Sprint.created_at.asc())
    )
    sprint_out: SprintOut | None = None
    if sprint:
        # Use unique tasks (joinedload may duplicate)
        seen: dict[str, Task] = {}
        for t in sprint.tasks:
            seen[t.id] = t
        tasks_sorted = sorted(seen.values(), key=lambda x: x.sort_order)
        key_by_id = {t.id: t.key for t in tasks_sorted}
        sprint_out = SprintOut(
            id=sprint.id,
            name=sprint.name,
            status=sprint.status.value if hasattr(sprint.status, "value") else str(sprint.status),
            project_id=sprint.project_id,
            tasks=[_task_out(t, key_by_id) for t in tasks_sorted],
        )
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        starter_repo=project.starter_repo,
        curriculum_version=project.curriculum_version,
        sprint=sprint_out,
    )


@router.get("/api/sprints/current", response_model=SprintOut)
def get_current_sprint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SprintOut:
    sprint = db.scalar(
        select(Sprint).options(joinedload(Sprint.tasks).joinedload(Task.dependencies)).order_by(Sprint.created_at.asc())
    )
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No sprint seeded")
    seen: dict[str, Task] = {}
    for t in sprint.tasks:
        seen[t.id] = t
    tasks_sorted = sorted(seen.values(), key=lambda x: x.sort_order)
    key_by_id = {t.id: t.key for t in tasks_sorted}
    return SprintOut(
        id=sprint.id,
        name=sprint.name,
        status=sprint.status.value if hasattr(sprint.status, "value") else str(sprint.status),
        project_id=sprint.project_id,
        tasks=[_task_out(t, key_by_id) for t in tasks_sorted],
    )


@router.get("/api/enrollments/me", response_model=list[EnrollmentOut])
def get_my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EnrollmentOut]:
    rows = db.scalars(select(Enrollment).where(Enrollment.user_id == current_user.id)).all()
    return [EnrollmentOut.model_validate(r) for r in rows]
