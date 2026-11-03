"""Shared read-model builders for tasks (used by project/sprint/roadmap views)."""

from app.models import Task, TaskStatus
from app.schemas import TaskDependencyOut, TaskOut


def task_out(
    task: Task,
    key_by_id: dict[str, str],
    status: TaskStatus | None = None,
    blocked_reason: str | None = None,
) -> TaskOut:
    """Per-student overrides win; template values are the fallback.

    Global blocker notes were cleared by migration and are never written
    anymore, so the fallback only ever yields None in practice.
    """
    return TaskOut(
        id=task.id,
        key=task.key,
        title=task.title,
        description=task.description,
        acceptance_criteria=task.acceptance_criteria or {},
        rubric_json=task.rubric_json or {},
        status=status if status is not None else task.status,
        sort_order=task.sort_order,
        blocked_reason=blocked_reason if blocked_reason is not None else task.blocked_reason,
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
