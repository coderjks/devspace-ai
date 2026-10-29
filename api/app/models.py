import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    student = "student"
    admin = "admin"


class EnrollmentStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    completed = "completed"


class SprintStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    completed = "completed"


class TaskStatus(str, enum.Enum):
    locked = "locked"
    todo = "todo"
    in_progress = "in_progress"
    in_review = "in_review"
    approved = "approved"
    blocked = "blocked"


class SubmissionStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    evaluating = "evaluating"
    evaluated = "evaluated"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(512), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.student)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[list["AgentConversation"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    activity_events: Mapped[list["ActivityEvent"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "track", name="uq_enrollment_user_track"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    track: Mapped[str] = mapped_column(String(100), nullable=False, default="applied-ai-engineering")
    status: Mapped[EnrollmentStatus] = mapped_column(Enum(EnrollmentStatus), nullable=False, default=EnrollmentStatus.active)
    skill_level: Mapped[str] = mapped_column(String(50), nullable=False, default="beginner")
    goals: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="enrollments")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    starter_repo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    curriculum_version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    sprints: Mapped[list["Sprint"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Sprint(Base):
    __tablename__ = "sprints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SprintStatus] = mapped_column(Enum(SprintStatus), nullable=False, default=SprintStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="sprints")
    tasks: Mapped[list["Task"]] = relationship(back_populates="sprint", cascade="all, delete-orphan", order_by="Task.sort_order")


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("sprint_id", "key", name="uq_task_sprint_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    sprint_id: Mapped[str] = mapped_column(ForeignKey("sprints.id", ondelete="CASCADE"), index=True, nullable=False)
    key: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    acceptance_criteria: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    rubric_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), nullable=False, default=TaskStatus.locked)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    sprint: Mapped["Sprint"] = relationship(back_populates="tasks")
    dependencies: Mapped[list["TaskDependency"]] = relationship(
        back_populates="task", foreign_keys="TaskDependency.task_id", cascade="all, delete-orphan"
    )
    submissions: Mapped[list["Submission"]] = relationship(back_populates="task", cascade="all, delete-orphan")


class TaskDependency(Base):
    __tablename__ = "task_dependencies"
    __table_args__ = (UniqueConstraint("task_id", "depends_on_task_id", name="uq_task_dependency"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True, nullable=False)
    depends_on_task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True, nullable=False)

    task: Mapped["Task"] = relationship(back_populates="dependencies", foreign_keys=[task_id])
    depends_on: Mapped["Task"] = relationship(foreign_keys=[depends_on_task_id])


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    pr_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    repository_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    head_sha: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[SubmissionStatus] = mapped_column(Enum(SubmissionStatus), nullable=False, default=SubmissionStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    task: Mapped["Task"] = relationship(back_populates="submissions")
    evaluations: Mapped[list["Evaluation"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True, nullable=False)
    sha: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    test_results: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    ai_review: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    policy_decision: Mapped[str | None] = mapped_column(String(50), nullable=True)
    policy_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    test_suite_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    policy_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    submission: Mapped["Submission"] = relationship(back_populates="evaluations")


class AgentConversation(Base):
    __tablename__ = "agent_conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    persona: Mapped[str] = mapped_column(String(100), nullable=False, default="tech-lead")
    title: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="conversations")
    messages: Mapped[list["AgentMessage"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("agent_conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    conversation: Mapped["AgentConversation"] = relationship(back_populates="messages")


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(200), nullable=False, default="system")
    action: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    object_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    object_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user: Mapped["User | None"] = relationship(back_populates="activity_events")
