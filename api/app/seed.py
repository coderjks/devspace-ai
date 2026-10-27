import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    Enrollment,
    EnrollmentStatus,
    Project,
    Sprint,
    SprintStatus,
    Task,
    TaskDependency,
    TaskStatus,
    User,
    UserRole,
)
from app.security import hash_password

CURRICULUM_PATH = Path(__file__).resolve().parents[2] / "curriculum" / "sprint-01.json"


def _load_curriculum() -> dict:
    return json.loads(CURRICULUM_PATH.read_text(encoding="utf-8"))


def seed_database(db: Session) -> dict:
    settings = get_settings()
    data = _load_curriculum()

    # Demo user (idempotent by email)
    demo_email = settings.seed_demo_email.lower()
    user = db.scalar(select(User).where(User.email == demo_email))
    if not user:
        user = User(
            email=demo_email,
            hashed_password=hash_password(settings.seed_demo_password),
            full_name=settings.seed_demo_name,
            role=UserRole.student,
            is_active=True,
        )
        db.add(user)
        db.flush()

    # Enrollment for demo user
    enrollment = db.scalar(
        select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.track == "applied-ai-engineering")
    )
    if not enrollment:
        enrollment = Enrollment(
            user_id=user.id,
            track="applied-ai-engineering",
            status=EnrollmentStatus.active,
            skill_level="beginner",
            goals="Complete Applied AI Engineering Sprint 1",
        )
        db.add(enrollment)

    # Project (idempotent by name + curriculum_version)
    proj_data = data["project"]
    project = db.scalar(
        select(Project).where(
            Project.name == proj_data["name"],
            Project.curriculum_version == data["curriculum_version"],
        )
    )
    if not project:
        project = Project(
            name=proj_data["name"],
            description=proj_data["description"],
            starter_repo=proj_data.get("starter_repo"),
            curriculum_version=data["curriculum_version"],
        )
        db.add(project)
        db.flush()

    # Sprint
    sprint_data = data["sprint"]
    sprint = db.scalar(select(Sprint).where(Sprint.project_id == project.id, Sprint.name == sprint_data["name"]))
    if not sprint:
        sprint = Sprint(
            project_id=project.id,
            name=sprint_data["name"],
            status=SprintStatus.active,
        )
        db.add(sprint)
        db.flush()

    # Tasks
    status_map = {
        "todo": TaskStatus.todo,
        "locked": TaskStatus.locked,
        "in_progress": TaskStatus.in_progress,
        "in_review": TaskStatus.in_review,
        "approved": TaskStatus.approved,
        "blocked": TaskStatus.blocked,
    }
    tasks_by_key: dict[str, Task] = {}
    for t in sorted(data["tasks"], key=lambda x: x["sort_order"]):
        existing = db.scalar(select(Task).where(Task.sprint_id == sprint.id, Task.key == t["key"]))
        if existing:
            tasks_by_key[t["key"]] = existing
            continue
        task = Task(
            sprint_id=sprint.id,
            key=t["key"],
            title=t["title"],
            description=t["description"],
            acceptance_criteria=t.get("acceptance_criteria", {}),
            rubric_json=t.get("rubric_json", {}),
            status=status_map.get(t.get("status", "locked"), TaskStatus.locked),
            sort_order=t["sort_order"],
        )
        db.add(task)
        db.flush()
        tasks_by_key[t["key"]] = task

    # Dependencies
    for t in data["tasks"]:
        task = tasks_by_key[t["key"]]
        for dep_key in t.get("depends_on", []):
            dep_task = tasks_by_key.get(dep_key)
            if not dep_task:
                dep_task = db.scalar(select(Task).where(Task.sprint_id == sprint.id, Task.key == dep_key))
            if not dep_task:
                continue
            exists = db.scalar(
                select(TaskDependency).where(
                    TaskDependency.task_id == task.id,
                    TaskDependency.depends_on_task_id == dep_task.id,
                )
            )
            if not exists:
                db.add(TaskDependency(task_id=task.id, depends_on_task_id=dep_task.id))

    db.commit()
    return {"user_email": user.email, "project": project.name, "tasks": len(tasks_by_key)}


def main() -> None:
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        result = seed_database(db)
        print(f"Seed complete: {result}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
