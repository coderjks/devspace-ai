"""Phase 04 standup flow: propose/review/confirm, idempotency, blockers,
Tech Lead sharing, tool allowlists and role boundaries."""

import uuid

import pytest
from app.agents.roles import ROLES
from app.agents.tools import TOOLS, ToolDenied, UnknownTool, allowed_tools, call_tool


def _register(client, email):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Standup Student"},
    )
    assert res.status_code == 201, res.text
    client.cookies.clear()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _enroll(client, headers):
    res = client.post(
        "/api/enrollments",
        json={"track": "applied-ai-engineering", "skill_level": "beginner", "experience_level": "student", "goals": "phase 4"},
        headers=headers,
    )
    assert res.status_code in (200, 201), res.text


def _task_id(client, headers, key="AI-001"):
    tasks = client.get("/api/sprints/current", headers=headers).json()["tasks"]
    return next(t["id"] for t in tasks if t["key"] == key)


def test_standup_requires_enrollment(client):
    headers = _register(client, "noenroll@test.local")
    body = {"yesterday": "y", "today": "t", "blockers": "", "idempotency_key": uuid.uuid4().hex}
    assert client.post("/api/standups/propose", json=body, headers=headers).status_code == 403


def test_propose_confirm_happy_path(client, auth_headers):
    _enroll(client, auth_headers)
    tid = _task_id(client, auth_headers)
    key = uuid.uuid4().hex
    body = {"yesterday": "Set up repo", "today": "Ticket API", "blockers": "Unclear on auth scope", "task_id": tid, "idempotency_key": key}
    prop = client.post("/api/standups/propose", json=body, headers=auth_headers)
    assert prop.status_code == 201, prop.text
    data = prop.json()
    assert data["created"] is True
    assert data["standup"]["status"] == "proposed"
    assert any("blocker" in c for c in data["proposed_changes"])

    # Idempotent propose with the same key returns the same record.
    again = client.post("/api/standups/propose", json=body, headers=auth_headers)
    assert again.status_code == 200
    assert again.json()["created"] is False
    assert again.json()["standup"]["id"] == data["standup"]["id"]

    # Confirm applies the blocker and shares Tech Lead context.
    conf = client.post(f"/api/standups/{data['standup']['id']}/confirm", headers=auth_headers)
    assert conf.status_code == 200, conf.text
    assert conf.json()["standup"]["status"] == "confirmed"
    assert conf.json()["blocker_shared"] is True

    detail = client.get(f"/api/tasks/{tid}", headers=auth_headers).json()
    assert detail["blocked_reason"] == "Unclear on auth scope"

    convs = client.get("/api/agents/tech-lead/conversations", headers=auth_headers).json()
    assert convs, "expected a tech-lead conversation for shared blocker context"
    msgs = client.get(f"/api/agents/conversations/{convs[0]['id']}/messages", headers=auth_headers).json()
    assert any(m["role"] == "system" and "AI-001" in m["content"] for m in msgs)

    # Repeated confirm is idempotent — no duplicate system note.
    conf2 = client.post(f"/api/standups/{data['standup']['id']}/confirm", headers=auth_headers)
    assert conf2.status_code == 200
    assert conf2.json()["repeated"] is True
    msgs2 = client.get(f"/api/agents/conversations/{convs[0]['id']}/messages", headers=auth_headers).json()
    assert len(msgs2) == len(msgs)


def test_confirm_without_blockers_shares_nothing(client, auth_headers):
    _enroll(client, auth_headers)
    body = {"yesterday": "y", "today": "t", "blockers": "", "idempotency_key": uuid.uuid4().hex}
    sid = client.post("/api/standups/propose", json=body, headers=auth_headers).json()["standup"]["id"]
    conf = client.post(f"/api/standups/{sid}/confirm", headers=auth_headers)
    assert conf.json()["blocker_shared"] is False


def test_propose_rejects_foreign_task(client, auth_headers):
    _enroll(client, auth_headers)
    body = {"yesterday": "y", "today": "t", "blockers": "", "task_id": str(uuid.uuid4()), "idempotency_key": uuid.uuid4().hex}
    assert client.post("/api/standups/propose", json=body, headers=auth_headers).status_code == 422


def test_standup_history_lists_mine(client, auth_headers):
    _enroll(client, auth_headers)
    for i in range(2):
        body = {"yesterday": f"y{i}", "today": "t", "blockers": "", "idempotency_key": uuid.uuid4().hex}
        assert client.post("/api/standups/propose", json=body, headers=auth_headers).status_code == 201
    mine = client.get("/api/standups", headers=auth_headers)
    assert mine.status_code == 200
    assert len(mine.json()) >= 2


def test_unknown_tool_rejected(db_session, seeded):
    from app.models import User

    user = db_session.query(User).filter(User.email == "demo@devspace.ai").first()
    with pytest.raises(UnknownTool):
        call_tool(db_session, user, "scrum-master", "launch_rockets", {})


def test_role_boundary_enforced(db_session, seeded):
    from app.models import User

    user = db_session.query(User).filter(User.email == "demo@devspace.ai").first()
    with pytest.raises(ToolDenied):
        call_tool(db_session, user, "tech-lead", "flag_blocker", {"task_id": "x", "reason": "y"})
    with pytest.raises(ToolDenied):
        call_tool(db_session, user, "learning-assistant", "record_standup", {"standup_id": "x"})


def test_role_configs_subset_of_registry():
    for persona, role in ROLES.items():
        for tool in role["allowed_tools"]:
            assert tool in TOOLS, f"{persona} allows unregistered tool {tool}"
    for tool in TOOLS:
        assert any(tool in r["allowed_tools"] for r in ROLES.values()), f"{tool} unreachable"


def test_allowed_tools_helper_matches_roles():
    assert set(allowed_tools("scrum-master")) >= {"record_standup", "flag_blocker"}
    assert "flag_blocker" not in allowed_tools("tech-lead")
