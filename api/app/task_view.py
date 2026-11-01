"""Shared read-model builders for tasks (used by project/sprint/roadmap views)."""

from app.models import Task
from app.schemas import TaskDependencyOut, TaskOut


def task_out(task: Task, key_by_id: dict[str, str]) -> TaskOut:
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


def deduped_tasks(tasks: list[Task]) -> list[Task]:
    seen: dict[str, Task] = {}
    for t in tasks:
        seen[t.id] = t
    return sorted(seen.values(), key=lambda x: x.sort_order)
