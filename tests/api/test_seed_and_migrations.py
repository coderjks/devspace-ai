from pathlib import Path

from app.database import Base
from app.models import Task, TaskDependency
from app.seed import seed_database
from sqlalchemy import inspect


def test_all_phase01_tables_exist(db_session):
    inspector = inspect(db_session.bind)
    tables = set(inspector.get_table_names())
    expected = {
        "users",
        "enrollments",
        "projects",
        "sprints",
        "tasks",
        "task_dependencies",
        "submissions",
        "evaluations",
        "agent_conversations",
        "agent_messages",
        "activity_events",
    }
    assert expected.issubset(tables)


def test_seed_is_idempotent(db_session):
    before_tasks = db_session.query(Task).count()
    before_deps = db_session.query(TaskDependency).count()
    seed_database(db_session)
    db_session.expunge_all()
    after_tasks = db_session.query(Task).count()
    after_deps = db_session.query(TaskDependency).count()
    assert before_tasks == 6
    assert after_tasks == 6
    assert before_deps == after_deps == 5  # AI-002,003,004,005,006 each one dep


def test_alembic_initial_revision_exists():
    versions = list((Path(__file__).resolve().parents[2] / "api" / "alembic" / "versions").glob("*.py"))
    assert versions, "expected at least one Alembic revision"
    initial = [v for v in versions if 'revision: str = "20261027_0001"' in v.read_text()]
    assert initial, "expected the initial 20261027_0001 revision"
    text = initial[0].read_text()
    assert "def upgrade" in text and "def downgrade" in text


def test_models_metadata_matches_seed_expectation():
    # Guard against accidental model drift: Task must carry rubric + criteria JSON
    cols = {c.name for c in Task.__table__.columns}
    assert {"key", "acceptance_criteria", "rubric_json", "status", "sort_order"}.issubset(cols)
    assert Base.metadata.tables.keys() >= {"users", "tasks"}


def test_enrollment_carries_onboarding_columns(db_session):
    from app.models import Enrollment

    cols = {c.name for c in Enrollment.__table__.columns}
    assert {"experience_level", "diagnostic_result", "skill_level", "goals"}.issubset(cols)
    inspector_cols = {c["name"] for c in inspect(db_session.bind).get_columns("enrollments")}
    assert {"experience_level", "diagnostic_result"}.issubset(inspector_cols)
