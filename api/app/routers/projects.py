from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Project, Sprint, Task, User
from app.schemas import ProjectOut, SprintOut
from app.task_view import deduped_tasks, task_out

router = APIRouter(tags=["projects"])

_task_out = task_out


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
        # joinedload may duplicate rows; dedupe before serializing.
        tasks_sorted = deduped_tasks(list(sprint.tasks))
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
    tasks_sorted = deduped_tasks(list(sprint.tasks))
    key_by_id = {t.id: t.key for t in tasks_sorted}
    return SprintOut(
        id=sprint.id,
        name=sprint.name,
        status=sprint.status.value if hasattr(sprint.status, "value") else str(sprint.status),
        project_id=sprint.project_id,
        tasks=[_task_out(t, key_by_id) for t in tasks_sorted],
    )

