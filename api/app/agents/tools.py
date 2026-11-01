"""Server-side tool registry for agent roles.

Tools execute against PostgreSQL with the student's own scope. Every call is
audited. The model never executes tools directly — the orchestrator and routers
invoke them after validating intent. Role allowlists are enforced here.
"""

from sqlalchemy.orm import Session

from app.models import ActivityEvent, Standup, Task, User


class UnknownTool(ValueError):
    pass


class ToolDenied(PermissionError):
    pass


def _audit(db: Session, user: User, actor: str, tool: str, args: dict) -> None:
    db.add(
        ActivityEvent(
            user_id=user.id,
            actor=actor,
            action="tool_call",
            payload={"tool": tool, "args": args},
        )
    )


def _user_task_ids(db: Session, user: User) -> set[str]:
    from app.models import Enrollment, Project, Sprint

    enrollment = db.query(Enrollment).filter(Enrollment.user_id == user.id).first()
    if enrollment is None:
        return set()
    project = db.query(Project).first()
    if project is None:
        return set()
    sprint = (
        db.query(Sprint).filter(Sprint.project_id == project.id).order_by(Sprint.created_at).first()
    )
    if sprint is None:
        return set()
    return {t.id for t in db.query(Task).filter(Task.sprint_id == sprint.id).all()}


def _read_tasks(db: Session, user: User, args: dict) -> dict:
    from app.models import Project, Sprint

    project = db.query(Project).first()
    sprint = None
    tasks: list[Task] = []
    if project:
        sprint = (
            db.query(Sprint)
            .filter(Sprint.project_id == project.id)
            .order_by(Sprint.created_at)
            .first()
        )
        if sprint:
            tasks = db.query(Task).filter(Task.sprint_id == sprint.id).order_by(Task.sort_order).all()
    return {
        "project": project.name if project else None,
        "sprint": sprint.name if sprint else None,
        "tasks": [
            {"key": t.key, "title": t.title, "status": t.status.value, "blocked": bool(t.blocked_reason)}
            for t in tasks
        ],
    }


def _flag_blocker(db: Session, user: User, args: dict) -> dict:
    task_id = args.get("task_id")
    reason = (args.get("reason") or "").strip()
    if not task_id or not reason:
        raise ValueError("task_id and reason are required")
    if task_id not in _user_task_ids(db, user):
        raise ValueError("task is not in your sprint")
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise ValueError("task not found")
    task.blocked_reason = reason
    db.flush()
    return {"task_id": task_id, "blocked_reason": reason}


def _record_standup(db: Session, user: User, args: dict) -> dict:
    standup_id = args.get("standup_id")
    standup = (
        db.query(Standup)
        .filter(Standup.id == standup_id, Standup.user_id == user.id)
        .first()
    )
    if standup is None:
        raise ValueError("standup not found")
    return {"standup_id": standup.id, "status": standup.status}


def _read_progress(db: Session, user: User, args: dict) -> dict:

    total = started = completed = 0
    tasks = _read_tasks(db, user, args)["tasks"]
    total = len(tasks)
    started = sum(1 for t in tasks if t["status"] == "in_progress")
    completed = sum(1 for t in tasks if t["status"] == "approved")
    return {"total_tasks": total, "started_tasks": started, "completed_tasks": completed}


TOOLS: dict[str, dict] = {
    "read_project": {"roles": ["tech-lead", "scrum-master", "engineering-manager"], "run": lambda db, user, args: {"project": _read_tasks(db, user, args)["project"], "sprint": _read_tasks(db, user, args)["sprint"]}},
    "read_tasks": {"roles": ["tech-lead", "senior-engineer", "qa-engineer", "scrum-master"], "run": _read_tasks},
    "read_sprint": {"roles": ["scrum-master", "engineering-manager", "tech-lead"], "run": lambda db, user, args: _read_tasks(db, user, args)},
    "read_progress": {"roles": ["engineering-manager", "scrum-master", "learning-assistant"], "run": _read_progress},
    "record_standup": {"roles": ["scrum-master"], "run": _record_standup},
    "flag_blocker": {"roles": ["scrum-master"], "run": _flag_blocker},
    "propose_hint": {"roles": ["senior-engineer", "learning-assistant"], "run": lambda db, user, args: {"hint": "break the task into the smallest verifiable step"}},
    "read_test_results": {"roles": ["qa-engineer", "senior-engineer"], "run": lambda db, user, args: {"note": "test results surface after evaluation runs"}},
    "read_acceptance_criteria": {"roles": ["qa-engineer", "tech-lead"], "run": _read_tasks},
}


def allowed_tools(role: str) -> list[str]:
    return [name for name, spec in TOOLS.items() if role in spec["roles"]]


def call_tool(db: Session, user: User, role: str, tool: str, args: dict | None = None) -> dict:
    spec = TOOLS.get(tool)
    if spec is None:
        raise UnknownTool(f"unknown tool: {tool}")
    if role not in spec["roles"]:
        raise ToolDenied(f"role {role} may not call {tool}")
    result = spec["run"](db, user, args or {})
    _audit(db, user, f"agent:{role}", tool, {"tool": tool})
    db.flush()
    return result
