from datetime import datetime

from pydantic import BaseModel, Field

from app.models import TaskStatus

# --- Auth ---


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(default="", max_length=200)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    token_type: str = "bearer"


# --- Project / Sprint / Task ---


class TaskDependencyOut(BaseModel):
    depends_on_key: str
    depends_on_task_id: str


class TaskOut(BaseModel):
    id: str
    key: str
    title: str
    description: str
    acceptance_criteria: dict
    rubric_json: dict
    status: TaskStatus
    sort_order: int
    blocked_reason: str | None = None
    dependencies: list[TaskDependencyOut] = []

    model_config = {"from_attributes": True}


class SprintOut(BaseModel):
    id: str
    name: str
    status: str
    project_id: str
    tasks: list[TaskOut] = []

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    starter_repo: str | None
    curriculum_version: str
    sprint: SprintOut | None = None

    model_config = {"from_attributes": True}


class EnrollmentOut(BaseModel):
    id: str
    user_id: str
    track: str
    status: str
    skill_level: str
    experience_level: str | None = None
    goals: str | None
    diagnostic_result: dict | None = None

    model_config = {"from_attributes": True}


class EnrollmentCreate(BaseModel):
    track: str = Field(default="applied-ai-engineering", max_length=100)
    skill_level: str = Field(default="beginner", max_length=50)
    experience_level: str | None = Field(default=None, max_length=50)
    goals: str | None = Field(default=None, max_length=2000)


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)


class DiagnosticQuestionOut(BaseModel):
    id: str
    prompt: str
    choices: list[str]


class DiagnosticAttemptIn(BaseModel):
    answers: dict[str, int]


class DiagnosticAttemptOut(BaseModel):
    score: int
    total: int


class TaskTransitionIn(BaseModel):
    to_status: str = Field(min_length=1, max_length=50)


class TaskDetailOut(TaskOut):
    sprint_id: str
    sprint_name: str


class ProgressOut(BaseModel):
    total_tasks: int
    by_status: dict[str, int]
    completed_tasks: int
    started_tasks: int
    enrollments: list[EnrollmentOut]
    recent_events: list[dict]


class RoadmapWeekOut(BaseModel):
    week: int
    title: str
    summary: str
    status: str


class RoadmapOut(BaseModel):
    track: str
    weeks: list[RoadmapWeekOut]
    current_sprint: SprintOut | None = None


class TeamMemberOut(BaseModel):
    id: str
    name: str
    role: str
    responsibilities: str
    kind: str


class TeamOut(BaseModel):
    members: list[TeamMemberOut]


class HealthOut(BaseModel):
    status: str
    service: str


class DbHealthOut(BaseModel):
    status: str
    database: str


class ChatSendRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None
    task_id: str | None = None


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime


class ChatReplyOut(BaseModel):
    conversation_id: str
    message: ChatMessageOut
    model: str
    mock: bool


class ConversationOut(BaseModel):
    id: str
    persona: str
    task_id: str | None
    title: str
    created_at: datetime


class StandupProposeIn(BaseModel):
    yesterday: str = Field(min_length=1, max_length=2000)
    today: str = Field(min_length=1, max_length=2000)
    blockers: str = Field(default="", max_length=2000)
    task_id: str | None = None
    idempotency_key: str = Field(min_length=8, max_length=64)


class StandupOut(BaseModel):
    id: str
    task_id: str | None
    task_key: str | None
    yesterday: str
    today: str
    blockers: str
    status: str
    created_at: datetime


class StandupProposeOut(BaseModel):
    standup: StandupOut
    proposed_changes: list[str] = []
    created: bool = True


class StandupConfirmOut(BaseModel):
    standup: StandupOut
    blocker_shared: bool = False
    repeated: bool = False


class SystemEventOut(BaseModel):
    id: str
    actor: str
    action: str
    object_type: str | None
    object_id: str | None
    created_at: datetime


class RoleCommentOut(BaseModel):
    id: str
    persona: str
    conversation_id: str
    conversation_title: str
    excerpt: str
    created_at: datetime


class SubmissionActivityItem(BaseModel):
    id: str
    task_id: str
    task_key: str | None = None
    pr_number: int | None = None
    head_sha: str | None = None
    status: str
    created_at: datetime


class SubmissionsSectionOut(BaseModel):
    # Live wire to the submissions table. Phase 05 (GitHub App) populates it;
    # until then items is honestly empty and the UI shows a "not yet" state.
    source: str = "live"
    items: list[SubmissionActivityItem] = []


class ActivityFeedOut(BaseModel):
    system_events: list[SystemEventOut] = []
    role_comments: list[RoleCommentOut] = []
    submissions: SubmissionsSectionOut = SubmissionsSectionOut()


class RepoLinkIn(BaseModel):
    full_name: str = Field(min_length=3, max_length=200)


class RepositoryOut(BaseModel):
    id: str
    full_name: str
    github_id: int | None = None
    installation_id: int | None = None
    link_method: str
    created_at: datetime


class GithubReposOut(BaseModel):
    app_configured: bool
    repos: list[RepositoryOut] = []


class SubmissionCreateIn(BaseModel):
    task_id: str
    pr_url: str = Field(min_length=10, max_length=500)
    head_sha: str | None = Field(default=None, min_length=7, max_length=64)


class SubmissionOut(BaseModel):
    id: str
    task_id: str
    task_key: str | None = None
    pr_number: int | None = None
    repository_id: str | None = None
    head_sha: str | None = None
    status: str
    pr_state: str
    merged: bool
    source: str
    latest_decision: str | None = None
    created_at: datetime


class EvaluationOut(BaseModel):
    id: str
    submission_id: str
    sha: str
    test_results: dict
    ai_review: dict
    policy_decision: str | None = None
    policy_reason: str | None = None
    model_version: str | None = None
    prompt_version: str | None = None
    test_suite_version: str | None = None
    policy_version: str | None = None
    created_at: datetime


class EvaluateTriggerOut(BaseModel):
    status: str
    submission_id: str
    sha: str


class ApprovalRequestIn(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=64)


class ApprovalOut(BaseModel):
    id: str
    submission_id: str
    evaluation_id: str | None = None
    decision: str
    reason: str
    policy_version: str
    unlocked: list[str] = []
    created: bool = True
    created_at: datetime


class RemediationOut(BaseModel):
    id: str
    approval_id: str
    failed_checks: list[str] = []
    hints: list[dict] = []
    created_at: datetime


class CompetencyOut(BaseModel):
    skill: str
    score: int
    evidence_count: int
    updated_at: datetime


class PrereqOut(BaseModel):
    key: str
    title: str
    met: bool


class TaskEligibilityOut(BaseModel):
    task_id: str
    key: str
    title: str
    status: str
    prerequisites: list[PrereqOut] = []
    latest_decision: str | None = None
    latest_reason: str | None = None
    latest_approval_id: str | None = None


class EligibilityOut(BaseModel):
    tasks: list[TaskEligibilityOut] = []
    next_recommended_key: str | None = None


class CheckInOut(BaseModel):
    generated_at: datetime
    summary: str
    highlights: list[str] = []
    next_steps: list[str] = []
    source: str = "deterministic"


class RetroOut(BaseModel):
    generated_at: datetime
    standups_confirmed: int = 0
    submissions: int = 0
    evaluations: int = 0
    approvals: int = 0
    denials: int = 0
    open_blockers: list[str] = []
    notes: list[str] = []


class NotificationOut(BaseModel):
    id: str
    action: str
    object_type: str | None = None
    detail: str
    created_at: datetime


class VoiceSessionIn(BaseModel):
    persona: str
    language_hint: str | None = Field(default=None, max_length=20)
    consent: bool = False


class VoiceSessionOut(BaseModel):
    id: str
    persona: str
    consent: bool
    language_hint: str | None = None
    turn_count: int = 0
    created_at: datetime


class VoiceTypedTurnIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class VoiceTurnOut(BaseModel):
    id: str
    session_id: str
    sequence: int
    input_mode: str = "voice"
    transcript: str
    submitted_text: str | None = None
    stt_mock: bool = True
    reply_text: str | None = None
    tts_mock: bool = True
    audio_stored: bool = False
    duration_seconds: float | None = None
    created_at: datetime


class VoiceSubmitIn(BaseModel):
    edited_text: str | None = Field(default=None, max_length=4000)


class VoiceSubmitOut(BaseModel):
    turn: VoiceTurnOut
    reply_text: str
    reply_mock: bool = True
    audio_wav_base64: str | None = None
    audio_mock: bool = True
