def test_progress_derives_from_persisted_state(client, auth_headers):
    res = client.get("/api/progress", headers=auth_headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["total_tasks"] == 6
    assert sum(body["by_status"].values()) == 6
    assert body["completed_tasks"] == 0
    assert len(body["enrollments"]) >= 1
    assert isinstance(body["recent_events"], list)


def test_roadmap_has_twelve_weeks_with_one_full_sprint(client, auth_headers):
    res = client.get("/api/roadmap", headers=auth_headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["track"] == "applied-ai-engineering"
    assert len(body["weeks"]) == 12
    assert [w["week"] for w in body["weeks"]] == list(range(1, 13))
    assert body["weeks"][0]["status"] == "active"
    assert all(w["status"] == "upcoming" for w in body["weeks"][1:])
    assert body["current_sprint"] is not None
    assert len(body["current_sprint"]["tasks"]) == 6


def test_team_lists_five_teammates_plus_assistant(client, auth_headers):
    res = client.get("/api/team", headers=auth_headers)
    assert res.status_code == 200, res.text
    members = res.json()["members"]
    assert len(members) == 6
    ids = [m["id"] for m in members]
    assert len(set(ids)) == 6
    kinds = [m["kind"] for m in members]
    assert kinds.count("teammate") == 5
    assert kinds.count("assistant") == 1
    for m in members:
        assert m["name"] and m["role"] and m["responsibilities"]


def test_workplace_endpoints_require_auth(client):
    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as fresh:
        assert fresh.get("/api/progress").status_code == 401
        assert fresh.get("/api/roadmap").status_code == 401
        assert fresh.get("/api/team").status_code == 401
        assert fresh.get("/api/diagnostics/questions").status_code == 401
