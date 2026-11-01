"""Standup flow (Phase 04, text only).

Propose -> review -> confirm. The student types yesterday/today/blockers;
the backend parses a typed summary into proposed changes; the student confirms;
only then are the standup recorded, the blocker flagged, and Tech Lead context
shared. All mutations are ordinary ownership-checked writes with an audit log.
Idempotent propose (client key) and idempotent confirm (status check).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.agents.orchestrator import get_or_create_conversation
from app.agents.tools import ToolDenied, UnknownTool, call_tool
from app.database import get_db
from app.dependencies import get_current_user
from app.models import AgentMessage, Enrollment, Standup, Task, User
from app.schemas import (
    StandupConfirmOut,
    StandupOut,
    StandupProposeIn,
    StandupProposeOut,
)

router = APIRouter(tags=["standups"])

SCRUM = "scrum-master"
TECH_LEAD = "tech-lead"


def _require_enrollment(db: Session, user: User) -> None:
    if db.query(Enrollment).filter(Enrollment.user_id == user.id).first() is None:
        raise HTTPException(status_code=403, detail="enrollment required")


def _owned_task(db: Session, user: User, task_id: str) -> Task:
    from app.models import Project, Sprint

    project = db.query(Project).first()
    if project is None:
        raise HTTPException(status_code=422, detail="task not found in your sprint")
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=422, detail="task not found in your sprint")
    sprint = db.query(Sprint).filter(Sprint.id == task.sprint_id).first()
    if sprint is None or sprint.project_id != project.id:
        raise HTTPException(status_code=422, detail="task not found in your sprint")
    return task


def _out(s: Standup, task_key: str | None) -> StandupOut:
    return StandupOut(
        id=s.id,
        task_id=s.task_id,
        task_key=task_key,
        yesterday=s.yesterday,
        today=s.today,
        blockers=s.blockers,
        status=s.status,
        created_at=s.created_at,
    )


@router.post("/api/standups/propose", response_model=StandupProposeOut)
def propose_standup(
    body: StandupProposeIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JSONResponse:
    _require_enrollment(db, current_user)
    existing = (
        db.query(Standup)
        .filter(Standup.user_id == current_user.id, Standup.idempotency_key == body.idempotency_key)
        .first()
    )
    if existing is not None:
        task = db.query(Task).filter(Task.id == existing.task_id).first() if existing.task_id else None
        payload = StandupProposeOut(standup=_out(existing, task.key if task else None), created=False)
        return JSONResponse(status_code=200, content=payload.model_dump(mode="json"))

    task = _owned_task(db, current_user, body.task_id) if body.task_id else None
    standup = Standup(
        user_id=current_user.id,
        task_id=task.id if task else None,
        yesterday=body.yesterday.strip(),
        today=body.today.strip(),
        blockers=body.blockers.strip(),
        status="proposed",
        idempotency_key=body.idempotency_key,
    )
    db.add(standup)
    db.commit()
    db.refresh(standup)
    changes = []
    if standup.blockers and task:
        changes.append(f"flag blocker on {task.key}")
    changes.append("record standup")
    payload = StandupProposeOut(standup=_out(standup, task.key if task else None), proposed_changes=changes, created=True)
    return JSONResponse(status_code=201, content=payload.model_dump(mode="json"))


@router.post("/api/standups/{standup_id}/confirm", response_model=StandupConfirmOut)
def confirm_standup(
    standup_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandupConfirmOut:
    _require_enrollment(db, current_user)
    standup = (
        db.query(Standup)
        .filter(Standup.id == standup_id, Standup.user_id == current_user.id)
        .first()
    )
    if standup is None:
        raise HTTPException(status_code=404, detail="standup not found")
    if standup.status == "confirmed":
        task = db.query(Task).filter(Task.id == standup.task_id).first() if standup.task_id else None
        return StandupConfirmOut(standup=_out(standup, task.key if task else None), blocker_shared=bool(standup.blockers), repeated=True)

    try:
        call_tool(db, current_user, SCRUM, "record_standup", {"standup_id": standup.id})
        blocker_shared = False
        if standup.blockers and standup.task_id:
            task = _owned_task(db, current_user, standup.task_id)
            call_tool(
                db,
                current_user,
                SCRUM,
                "flag_blocker",
                {"task_id": task.id, "reason": standup.blockers},
            )
            conv = get_or_create_conversation(db, current_user, TECH_LEAD, task.id)
            db.add(
                AgentMessage(
                    conversation_id=conv.id,
                    role="system",
                    content=f"Standup update: blocked on {task.key} — {standup.blockers}",
                )
            )
            blocker_shared = True
    except (UnknownTool, ToolDenied, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    standup.status = "confirmed"
    standup.confirmed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(standup)
    task = db.query(Task).filter(Task.id == standup.task_id).first() if standup.task_id else None
    return StandupConfirmOut(standup=_out(standup, task.key if task else None), blocker_shared=blocker_shared, repeated=False)


@router.get("/api/standups", response_model=list[StandupOut])
def list_standups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[StandupOut]:
    _require_enrollment(db, current_user)
    rows = (
        db.query(Standup)
        .filter(Standup.user_id == current_user.id)
        .order_by(Standup.created_at.desc())
        .all()
    )
    out = []
    for s in rows:
        task = db.query(Task).filter(Task.id == s.task_id).first() if s.task_id else None
        out.append(_out(s, task.key if task else None))
    return out
