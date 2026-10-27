import json
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Sprint, Task, User
from app.schemas import RoadmapOut, RoadmapWeekOut, SprintOut
from app.task_view import deduped_tasks
from app.task_view import task_out as _task_out

router = APIRouter(tags=["roadmap"])

ROADMAP_PATH = Path(__file__).resolve().parents[3] / "curriculum" / "roadmap-12wk.json"


def _load_roadmap() -> dict:
    return json.loads(ROADMAP_PATH.read_text(encoding="utf-8"))


@router.get("/api/roadmap", response_model=RoadmapOut)
def get_roadmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoadmapOut:
    data = _load_roadmap()
    sprint = db.scalar(
        select(Sprint).options(joinedload(Sprint.tasks).joinedload(Task.dependencies)).order_by(Sprint.created_at.asc())
    )
    sprint_out: SprintOut | None = None
    if sprint:
        tasks_sorted = deduped_tasks(list(sprint.tasks))
        key_by_id = {t.id: t.key for t in tasks_sorted}
        sprint_out = SprintOut(
            id=sprint.id,
            name=sprint.name,
            status=sprint.status.value if hasattr(sprint.status, "value") else str(sprint.status),
            project_id=sprint.project_id,
            tasks=[_task_out(t, key_by_id) for t in tasks_sorted],
        )
    return RoadmapOut(
        track=data["track"],
        weeks=[RoadmapWeekOut.model_validate(w) for w in data["weeks"]],
        current_sprint=sprint_out,
    )
