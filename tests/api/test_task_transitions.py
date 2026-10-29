def _sprint(client, headers) -> dict:
    res = client.get("/api/sprints/current", headers=headers)
    assert res.status_code == 200
    return res.json()


def _by_key(sprint: dict) -> dict:
    return {t["key"]: t for t in sprint["tasks"]}


def test_task_detail_includes_criteria_and_dependencies(client, auth_headers):
    sprint = _sprint(client, auth_headers)
    task_id = _by_key(sprint)["AI-002"]["id"]
    res = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["key"] == "AI-002"
    assert body["sprint_name"] == sprint["name"]
    assert body["sprint_id"] == sprint["id"]
    assert isinstance(body["acceptance_criteria"], dict)
    assert [d["depends_on_key"] for d in body["dependencies"]] == ["AI-001"]


def test_task_detail_404(client, auth_headers):
    assert client.get("/api/tasks/does-not-exist", headers=auth_headers).status_code == 404


def test_task_detail_requires_auth(client):
    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as fresh:
        assert fresh.get("/api/tasks/anything").status_code == 401


def test_allowed_transition_todo_to_in_progress_and_back(client, auth_headers):
    sprint = _sprint(client, auth_headers)
    task_id = _by_key(sprint)["AI-001"]["id"]

    started = client.post(f"/api/tasks/{task_id}/transitions", headers=auth_headers, json={"to_status": "in_progress"})
    assert started.status_code == 200, started.text
    assert started.json()["status"] == "in_progress"

    # Progress reflects the started task.
    progress = client.get("/api/progress", headers=auth_headers).json()
    assert progress["started_tasks"] >= 1

    back = client.post(f"/api/tasks/{task_id}/transitions", headers=auth_headers, json={"to_status": "todo"})
    assert back.status_code == 200
    assert back.json()["status"] == "todo"

    # Transition was audited.
    events = client.get("/api/progress", headers=auth_headers).json()["recent_events"]
    assert any(e["action"] == "task.transition" for e in events)


def test_locked_task_cannot_transition(client, auth_headers):
    sprint = _sprint(client, auth_headers)
    task_id = _by_key(sprint)["AI-002"]["id"]
    res = client.post(f"/api/tasks/{task_id}/transitions", headers=auth_headers, json={"to_status": "in_progress"})
    assert res.status_code == 409


def test_cannot_mark_approved_manually(client, auth_headers):
    sprint = _sprint(client, auth_headers)
    task_id = _by_key(sprint)["AI-001"]["id"]
    res = client.post(f"/api/tasks/{task_id}/transitions", headers=auth_headers, json={"to_status": "approved"})
    assert res.status_code == 409
    assert "evaluation" in res.json()["detail"].lower()


def test_unknown_status_rejected(client, auth_headers):
    sprint = _sprint(client, auth_headers)
    task_id = _by_key(sprint)["AI-001"]["id"]
    res = client.post(f"/api/tasks/{task_id}/transitions", headers=auth_headers, json={"to_status": "done"})
    assert res.status_code == 422
