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
    goals: str | None

    model_config = {"from_attributes": True}


class HealthOut(BaseModel):
    status: str
    service: str


class DbHealthOut(BaseModel):
    status: str
    database: str
