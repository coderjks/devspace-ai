import uuid


def _unique_email() -> str:
    return f"onboard-{uuid.uuid4().hex[:8]}@example.com"


def _register(client, email: str) -> str:
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "SecurePass123!", "full_name": "New Student"},
    )
    assert res.status_code == 201, res.text
    return res.json()["access_token"]


def test_enrollment_create_and_idempotent(client):
    token = _register(client, _unique_email())
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/enrollments/me", headers=headers).json() == []

    first = client.post(
        "/api/enrollments",
        headers=headers,
        json={"track": "applied-ai-engineering", "skill_level": "beginner", "experience_level": "student", "goals": "Learn RAG"},
    )
    assert first.status_code == 201, first.text
    body = first.json()
    assert body["track"] == "applied-ai-engineering"
    assert body["experience_level"] == "student"
    assert body["goals"] == "Learn RAG"

    # Re-enrolling is idempotent: same record, 200.
    second = client.post("/api/enrollments", headers=headers, json={"track": "applied-ai-engineering"})
    assert second.status_code == 200
    assert second.json()["id"] == body["id"]

    mine = client.get("/api/enrollments/me", headers=headers).json()
    assert len(mine) == 1


def test_enrollment_rejects_unknown_values(client):
    token = _register(client, _unique_email())
    headers = {"Authorization": f"Bearer {token}"}
    assert client.post("/api/enrollments", headers=headers, json={"track": "web-dev"}).status_code == 422
    assert (
        client.post("/api/enrollments", headers=headers, json={"track": "applied-ai-engineering", "skill_level": "guru"}).status_code
        == 422
    )
    assert (
        client.post(
            "/api/enrollments", headers=headers, json={"track": "applied-ai-engineering", "experience_level": "cto"}
        ).status_code
        == 422
    )


def test_enrollment_requires_auth(client):
    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as fresh:
        assert fresh.post("/api/enrollments", json={}).status_code == 401


def test_profile_update(client):
    token = _register(client, _unique_email())
    headers = {"Authorization": f"Bearer {token}"}
    res = client.patch("/api/users/me", headers=headers, json={"full_name": "Renamed Student"})
    assert res.status_code == 200
    assert res.json()["full_name"] == "Renamed Student"
    assert client.patch("/api/users/me", headers=headers, json={"full_name": ""}).status_code == 422


def test_diagnostic_questions_hide_answers(client, auth_headers):
    res = client.get("/api/diagnostics/questions", headers=auth_headers)
    assert res.status_code == 200
    questions = res.json()
    assert len(questions) == 4
    for q in questions:
        assert set(q.keys()) == {"id", "prompt", "choices"}
        assert "answer" not in q


def test_diagnostic_attempt_scores_and_persists(client):
    token = _register(client, _unique_email())
    headers = {"Authorization": f"Bearer {token}"}
    questions = client.get("/api/diagnostics/questions", headers=headers).json()

    # Blank answers score zero but still persist.
    attempt = client.post("/api/diagnostics/attempts", headers=headers, json={"answers": {}})
    assert attempt.status_code == 200
    assert attempt.json() == {"score": 0, "total": len(questions)}

    # Enroll afterwards: diagnostic result is only stored once an enrollment exists.
    client.post("/api/enrollments", headers=headers, json={"track": "applied-ai-engineering"})
    attempt2 = client.post("/api/diagnostics/attempts", headers=headers, json={"answers": {}})
    assert attempt2.json()["score"] == 0
    mine = client.get("/api/enrollments/me", headers=headers).json()[0]
    assert mine["diagnostic_result"]["total"] == len(questions)
