"""Sprint activity feed (Phase 04, page-10).

Unified read-only feed composed of swappable source adapters. Each source
function owns one section and a fixed return contract, so later phases can
change what populates a section without touching the endpoint or the UI:

- system_events: real audit rows (ActivityEvent), newest first.
- role_comments: real assistant messages across the student's AI
  conversations, surfaced as excerpts linked back to the conversation.
- submissions: live wire to the submissions table. Empty until Phase 05
  (GitHub App) writes rows; the UI renders an honest "not yet" state.

All sources are ownership-scoped to the authenticated student. No mock rows:
empty sections return empty lists.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    ActivityEvent,
    AgentConversation,
    AgentMessage,
    Submission,
    Task,
    User,
)
from app.schemas import (
    ActivityFeedOut,
    RoleCommentOut,
    SubmissionActivityItem,
    SubmissionsSectionOut,
    SystemEventOut,
)

router = APIRouter(tags=["activity"])

FEED_LIMIT = 50
EXCERPT_LEN = 280


def system_events_source(db: Session, user: User) -> list[SystemEventOut]:
    rows = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.user_id == user.id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(FEED_LIMIT)
        .all()
    )
    return [
        SystemEventOut(
            id=r.id,
            actor=r.actor,
            action=r.action,
            object_type=r.object_type,
            object_id=r.object_id,
            created_at=r.created_at,
        )
        for r in rows
    ]


def role_comments_source(db: Session, user: User) -> list[RoleCommentOut]:
    rows = (
        db.query(AgentMessage, AgentConversation)
        .join(AgentConversation, AgentMessage.conversation_id == AgentConversation.id)
        .filter(
            AgentConversation.user_id == user.id,
            AgentMessage.role == "assistant",
        )
        .order_by(AgentMessage.created_at.desc())
        .limit(FEED_LIMIT)
        .all()
    )
    out: list[RoleCommentOut] = []
    for msg, conv in rows:
        text = msg.content.strip().replace("\n", " ")
        out.append(
            RoleCommentOut(
                id=msg.id,
                persona=conv.persona,
                conversation_id=conv.id,
                conversation_title=conv.title or conv.persona.replace("-", " ").title(),
                excerpt=text[:EXCERPT_LEN] + ("…" if len(text) > EXCERPT_LEN else ""),
                created_at=msg.created_at,
            )
        )
    return out


def submission_activity_source(db: Session, user: User) -> SubmissionsSectionOut:
    rows = (
        db.query(Submission, Task)
        .join(Task, Submission.task_id == Task.id)
        .filter(Submission.user_id == user.id)
        .order_by(Submission.created_at.desc())
        .limit(FEED_LIMIT)
        .all()
    )
    return SubmissionsSectionOut(
        items=[
            SubmissionActivityItem(
                id=s.id,
                task_id=s.task_id,
                task_key=t.key,
                pr_number=s.pr_number,
                head_sha=s.head_sha,
                status=s.status.value,
                created_at=s.created_at,
            )
            for s, t in rows
        ]
    )


@router.get("/api/activity", response_model=ActivityFeedOut)
def activity_feed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityFeedOut:
    return ActivityFeedOut(
        system_events=system_events_source(db, current_user),
        role_comments=role_comments_source(db, current_user),
        submissions=submission_activity_source(db, current_user),
    )
