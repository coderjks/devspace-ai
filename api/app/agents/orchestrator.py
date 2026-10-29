"""AgentOrchestrator: one shared orchestration layer for all six roles.

Flow: validate persona -> require enrollment -> load shared project context ->
get-or-create conversation -> persist user message -> provider reply ->
validate reply -> persist assistant message + audit event.

Model text never authorizes anything; all state changes are ordinary ORM
writes gated by get_current_user + enrollment ownership.
"""

from sqlalchemy.orm import Session

from app.agents.provider import LLMProvider, ProviderError
from app.agents.roles import get_role
from app.models import (
    ActivityEvent,
    AgentConversation,
    AgentMessage,
    Enrollment,
    Project,
    Sprint,
    Task,
    User,
)


class EnrollmentRequired(PermissionError):
    """Student must enroll before chatting with teammates."""


FALLBACK_REPLY = (
    "I hit a snag generating that reply. Could you rephrase — "
    "for example, tell me which task you are on and what is blocking you?"
)


def build_context(db: Session, user: User, task_id: str | None) -> str:
    project = db.query(Project).first()
    sprint = None
    tasks: list[Task] = []
    if project:
        sprint = (
            db.query(Sprint).filter(Sprint.project_id == project.id).order_by(Sprint.created_at).first()
        )
        if sprint:
            tasks = (
                db.query(Task)
                .filter(Task.sprint_id == sprint.id)
                .order_by(Task.sort_order)
                .all()
            )
    current = None
    if task_id:
        current = next((t for t in tasks if t.id == task_id), None)
    if current is None:
        current = next((t for t in tasks if t.status == "in_progress"), None) or next(
            (t for t in tasks if t.status == "todo"), None
        )
    counts: dict[str, int] = {}
    for t in tasks:
        key = t.status.value if hasattr(t.status, "value") else str(t.status)
        counts[key] = counts.get(key, 0) + 1
    lines = [
        f"Project: {project.name if project else 'none'}",
        f"Sprint: {sprint.name if sprint else 'none'}",
        "Task counts: " + (", ".join(f"{k}={v}" for k, v in sorted(counts.items())) or "none"),
    ]
    if current is not None:
        status = current.status.value if hasattr(current.status, "value") else str(current.status)
        lines.append(f"Current task: {current.key} — {current.title} [{status}]")
    else:
        lines.append("Current task: none")
    blocked = [t for t in tasks if t.blocked_reason]
    if blocked:
        lines.append("Open blockers: " + "; ".join(f"{t.key}: {t.blocked_reason}" for t in blocked))
    else:
        lines.append("Open blockers: none")
    return "\n".join(lines)


def get_or_create_conversation(
    db: Session, user: User, persona: str, task_id: str | None
) -> AgentConversation:
    q = db.query(AgentConversation).filter(
        AgentConversation.user_id == user.id,
        AgentConversation.persona == persona,
    )
    if task_id:
        q = q.filter(AgentConversation.task_id == task_id)
    conv = q.order_by(AgentConversation.created_at.desc()).first()
    if conv is not None:
        return conv
    conv = AgentConversation(user_id=user.id, persona=persona, task_id=task_id, title="")
    db.add(conv)
    db.flush()
    return conv


def respond(
    db: Session,
    user: User,
    provider: LLMProvider,
    *,
    persona: str,
    content: str,
    conversation_id: str | None = None,
    task_id: str | None = None,
) -> tuple[AgentConversation, AgentMessage]:
    role = get_role(persona)  # raises UnknownPersona -> 404 upstream
    enrolled = db.query(Enrollment).filter(Enrollment.user_id == user.id).first()
    if enrolled is None:
        raise EnrollmentRequired("enroll before chatting with teammates")
    text = content.strip()
    if not text:
        raise ValueError("message content must not be empty")
    if conversation_id:
        conv = (
            db.query(AgentConversation)
            .filter(
                AgentConversation.id == conversation_id,
                AgentConversation.user_id == user.id,
            )
            .first()
        )
        if conv is None:
            raise ValueError("conversation not found")
        if conv.persona != persona:
            raise ValueError("conversation belongs to a different persona")
    else:
        conv = get_or_create_conversation(db, user, persona, task_id)

    db.add(AgentMessage(conversation_id=conv.id, role="user", content=text))
    db.flush()

    history_rows = (
        db.query(AgentMessage)
        .filter(AgentMessage.conversation_id == conv.id)
        .order_by(AgentMessage.created_at)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in history_rows[-21:-1]]
    context = build_context(db, user, conv.task_id)
    try:
        result = provider.respond(
            persona=persona,
            system_prompt=role["system_prompt"],
            context=context,
            history=history,
            user_message=text,
        )
        reply_text = (result.text or "").strip()
        model = result.model
        if not reply_text:
            raise ProviderError("empty model response")
    except ProviderError:
        reply_text = FALLBACK_REPLY
        model = "fallback"
    assistant_msg = AgentMessage(conversation_id=conv.id, role="assistant", content=reply_text)
    db.add(assistant_msg)
    db.add(
        ActivityEvent(
            user_id=user.id,
            actor=f"agent:{persona}",
            action="agent_reply",
            payload={"conversation_id": conv.id, "model": model},
        )
    )
    db.commit()
    db.refresh(assistant_msg)
    return conv, assistant_msg


def get_provider(provider_name: str, settings) -> LLMProvider:
    """Factory. Unknown names and unconfigured Meta access fail closed."""
    from app.agents.meta import MetaAdapter
    from app.agents.mock import MockAdapter

    if provider_name == "mock":
        return MockAdapter()
    if provider_name == "meta":
        return MetaAdapter(
            base_url=settings.model_api_base_url,
            api_key=settings.model_api_key,
            model=settings.model_id,
        )
    raise ProviderError(f"unknown LLM provider: {provider_name}")
