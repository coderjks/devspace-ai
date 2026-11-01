"""Team chat endpoints (Phase 03). Every route requires auth; sending requires
an enrollment. Model text never authorizes anything — replies are persisted
assistant messages, and all mutations are ordinary ownership-checked writes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.orchestrator import (
    EnrollmentRequired,
    get_provider,
    respond,
)
from app.agents.provider import ProviderError
from app.agents.roles import UnknownPersona, get_role
from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import AgentConversation, AgentMessage, User
from app.schemas import (
    ChatMessageOut,
    ChatReplyOut,
    ChatSendRequest,
    ConversationOut,
)

router = APIRouter(tags=["agents"])


def _provider():
    settings = get_settings()
    try:
        return get_provider(settings.llm_provider, settings), settings
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail="model provider unavailable") from exc


@router.post("/api/agents/{persona}/messages", response_model=ChatReplyOut)
def send_message(
    persona: str,
    body: ChatSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatReplyOut:
    try:
        get_role(persona)
    except UnknownPersona as exc:
        raise HTTPException(status_code=404, detail="unknown persona") from exc
    provider, settings = _provider()
    try:
        conv, msg = respond(
            db,
            current_user,
            provider,
            persona=persona,
            content=body.content,
            conversation_id=body.conversation_id,
            task_id=body.task_id,
        )
    except EnrollmentRequired as exc:
        raise HTTPException(status_code=403, detail="enrollment required") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail="model provider unavailable") from exc
    return ChatReplyOut(
        conversation_id=conv.id,
        message=ChatMessageOut(
            id=msg.id, role=msg.role, content=msg.content, created_at=msg.created_at
        ),
        model=settings.model_id if settings.llm_provider == "meta" else "mock-teammate-v1",
        mock=settings.llm_provider != "meta",
    )


@router.get("/api/agents/{persona}/conversations", response_model=list[ConversationOut])
def list_conversations(
    persona: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationOut]:
    try:
        get_role(persona)
    except UnknownPersona as exc:
        raise HTTPException(status_code=404, detail="unknown persona") from exc
    rows = (
        db.query(AgentConversation)
        .filter(
            AgentConversation.user_id == current_user.id,
            AgentConversation.persona == persona,
        )
        .order_by(AgentConversation.created_at.desc())
        .all()
    )
    return [
        ConversationOut(
            id=r.id, persona=r.persona, task_id=r.task_id, title=r.title, created_at=r.created_at
        )
        for r in rows
    ]


@router.get("/api/agents/conversations/{conversation_id}/messages", response_model=list[ChatMessageOut])
def list_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ChatMessageOut]:
    conv = (
        db.query(AgentConversation)
        .filter(
            AgentConversation.id == conversation_id,
            AgentConversation.user_id == current_user.id,
        )
        .first()
    )
    if conv is None:
        raise HTTPException(status_code=404, detail="conversation not found")
    rows = (
        db.query(AgentMessage)
        .filter(AgentMessage.conversation_id == conv.id)
        .order_by(AgentMessage.created_at)
        .all()
    )
    return [
        ChatMessageOut(id=m.id, role=m.role, content=m.content, created_at=m.created_at)
        for m in rows
    ]
