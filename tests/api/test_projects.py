import uuid


def test_current_project_requires_auth(client):
    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as fresh:
        res = fresh.get("/api/projects/current")
        assert res.status_code == 401


def test_seeded_project_has_six_tickets(client, auth_headers):
    res = client.get("/api/projects/current", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["name"] == "AI-Powered Customer Support Backend"
    assert data["sprint"] is not None
    tasks = data["sprint"]["tasks"]
    assert len(tasks) == 6
    keys = [t["key"] for t in tasks]
    assert keys == ["AI-001", "AI-002", "AI-003", "AI-004", "AI-005", "AI-006"]
    by_key = {t["key"]: t for t in tasks}
    assert by_key["AI-001"]["dependencies"] == []
    assert [d["depends_on_key"] for d in by_key["AI-002"]["dependencies"]] == ["AI-001"]
    assert [d["depends_on_key"] for d in by_key["AI-003"]["dependencies"]] == ["AI-001"]
    assert [d["depends_on_key"] for d in by_key["AI-004"]["dependencies"]] == ["AI-003"]
    assert [d["depends_on_key"] for d in by_key["AI-005"]["dependencies"]] == ["AI-002"]
    assert [d["depends_on_key"] for d in by_key["AI-006"]["dependencies"]] == ["AI-004"]
    # Only AI-001 starts actionable; others locked in Phase 01 seed
    assert by_key["AI-001"]["status"] == "todo"
    for k in ["AI-002", "AI-003", "AI-004", "AI-005", "AI-006"]:
        assert by_key[k]["status"] == "locked"


def test_sprints_current_matches_project(client, auth_headers):
    res = client.get("/api/sprints/current", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()["tasks"]) == 6


def test_enrollments_are_owner_scoped(client, auth_headers):
    # Demo user sees own enrollment
    res = client.get("/api/enrollments/me", headers=auth_headers)
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) >= 1
    assert all(r["track"] == "applied-ai-engineering" for r in rows)

    # A second user sees only their own (empty) enrollments, not demo's
    email = f"other-{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post("/api/auth/register", json={"email": email, "password": "SecurePass123!", "full_name": "Other"})
    assert reg.status_code == 201
    other_token = reg.json()["access_token"]
    other = client.get("/api/enrollments/me", headers={"Authorization": f"Bearer {other_token}"})
    assert other.status_code == 200
    assert other.json() == []
