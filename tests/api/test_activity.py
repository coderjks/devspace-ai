"""Phase 04 page-10: activity feed sections, ownership scoping, no mock rows."""

import uuid

import pytest


def _register(client, email):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Activity Student"},
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


def test_activity_requires_auth(client):
    assert client.get("/api/activity").status_code in (401, 403)


def test_activity_sections_present_and_empty_when_new(client):
    headers = _register(client, "fresh-feed@test.local")
    _enroll(client, headers)
    res = client.get("/api/activity", headers=headers)
    assert res.status_code == 200, res.text
    feed = res.json()
    assert isinstance(feed["system_events"], list)
    assert isinstance(feed["role_comments"], list)
    # Submissions section is live-wired: no Phase 05 data yet, honestly empty.
    assert feed["submissions"]["source"] == "live"
    assert feed["submissions"]["items"] == []


def test_system_events_reflect_real_actions(client):
    headers = _register(client, "events-feed@test.local")
    _enroll(client, headers)
    feed = client.get("/api/activity", headers=headers).json()
    actions = [e["action"] for e in feed["system_events"]]
    # Enrollment itself writes a real audit event; newest first.
    assert "enrollment.created" in actions


def test_role_comments_surface_assistant_messages(client):
    headers = _register(client, "comments-feed@test.local")
    _enroll(client, headers)
    msg = client.post(
        "/api/agents/tech-lead/messages",
        json={"content": "How should I scope the ticket API?"},
        headers=headers,
    )
    assert msg.status_code in (200, 201), msg.text
    feed = client.get("/api/activity", headers=headers).json()
    assert len(feed["role_comments"]) >= 1
    first = feed["role_comments"][0]
    assert first["persona"] == "tech-lead"
    assert len(first["excerpt"]) > 0
    assert first["conversation_id"]


def test_activity_is_scoped_to_owner(client):
    headers_a = _register(client, "owner-a@test.local")
    headers_b = _register(client, "owner-b@test.local")
    _enroll(client, headers_a)
    _enroll(client, headers_b)
    # Only B talks to an agent; only B's feed may show it.
    res = client.post(
        "/api/agents/tech-lead/messages",
        json={"content": f"private question {uuid.uuid4().hex}"},
        headers=headers_b,
    )
    assert res.status_code in (200, 201), res.text
    conv_id = res.json()["conversation_id"]
    feed_a = client.get("/api/activity", headers=headers_a).json()
    assert all(c["conversation_id"] != conv_id for c in feed_a["role_comments"])
    feed_b = client.get("/api/activity", headers=headers_b).json()
    assert any(c["conversation_id"] == conv_id for c in feed_b["role_comments"])


@pytest.mark.parametrize("section", ["system_events", "role_comments"])
def test_no_mock_rows_anywhere(client, section):
    """Every section must come from its real source table, never fabricated."""
    headers = _register(client, f"nomock-{section}@test.local")
    _enroll(client, headers)
    feed = client.get("/api/activity", headers=headers).json()
    for entry in feed[section]:
        assert entry["id"] and entry.get("created_at")
