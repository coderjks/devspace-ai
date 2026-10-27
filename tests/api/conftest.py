import os
import sys
from pathlib import Path

# Use SQLite for tests and set env BEFORE importing the app.
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["DATABASE_URL_UNPOOLED"] = ""
os.environ["JWT_SECRET_KEY"] = "test-secret-key-at-least-32-characters-long!!"
os.environ["SEED_DEMO_EMAIL"] = "demo@devspace.ai"
os.environ["SEED_DEMO_PASSWORD"] = "DemoPass123!"
os.environ["SEED_DEMO_NAME"] = "Demo Student"

API_ROOT = Path(__file__).resolve().parents[2] / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

import pytest
from app.database import Base, get_db
from app.main import app
from app.seed import seed_database
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
Base.metadata.create_all(bind=engine)


def _override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(scope="session")
def db_session():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def seeded(db_session):
    # Seed once for the session; seed is idempotent.
    seed_database(db_session)
    db_session.expunge_all()
    return True


@pytest.fixture()
def client(seeded):
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def demo_token(client) -> str:
    res = client.post("/api/auth/login", json={"email": "demo@devspace.ai", "password": "DemoPass123!"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture()
def auth_headers(demo_token) -> dict:
    return {"Authorization": f"Bearer {demo_token}"}
