"""Phase 10: check-in, retrospective, and notifications derive from records."""

import pytest

from app.eval.pipeline import run_evaluation
from app.eval.review import mock_review

DIFF_CLEAN = """diff --git a/api.py b/api.py
--- a/api.py
+++ b/api.py
@@ -1,2 +1,3 @@
 def ticket():
+    return {"ok": True}
     pass
"""


@pytest.fixture(autouse=True)
def _no_real_queue(monkeypatch):
    monkeypatch.setattr("app.routers.github.enqueue_evaluation", lambda *args: None)


@pytest.fixture(autouse=True)
def _restore_global_task_statuses(db_session):
    # Approvals mutate shared sprint task statuses: snapshot and restore.
    from app.models import Task as _Task

    snapshot = {t.id: t.status for t in db_session.query(_Task).all()}
    yield
    for tid, status in snapshot.items():
        row = db_session.query(_Task).filter(_Task.id == tid).first()
        if row is not None:
            row.status = status
    db_session.commit()


def _register(client, email):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Learning Student"},
    )
    assert res.status_code == 201, res.text
    client.cookies.clear()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _enroll(client, headers):
    res = client.post(
        "/api/enrollments",
        json={"track": "applied-ai-engineering", "skill_level": "beginner", "experience_level": "student", "goals": "phase 10"},
        headers=headers,
    )
    assert res.status_code in (200, 201), res.text


def test_check_in_starts_empty_and_reflects_real_progress(client, db_session):
    headers = _register(client, "learn-empty@test.local")
    _enroll(client, headers)
    checkin = client.get("/api/progress/check-in", headers=headers).json()
    assert checkin["source"] == "deterministic"
    assert "0 approved" in checkin["summary"]
    assert checkin["next_steps"]

    # Approve a ticket through the real pipeline, then re-read.
    client.post("/api/github/repos", json={"full_name": "student/learn-repo"}, headers=headers)
    tasks = client.get("/api/sprints/current", headers=headers).json()["tasks"]
    tid = next(t["id"] for t in tasks if t["key"] == "AI-001")
    sub = client.post(
        "/api/submissions",
        json={"task_id": tid, "pr_url": "https://github.com/student/learn-repo/pull/1", "head_sha": "a" * 40},
        headers=headers,
    ).json()
    run_evaluation(db_session, sub["id"], "a" * 40, diff_text=DIFF_CLEAN, reviewer=lambda d, s, h: mock_review(h, s))
    approval = client.post(
        "/api/submissions/{}/approvals".format(sub["id"]),
        json={"idempotency_key": "learn-key-12345678"},
        headers=headers,
    ).json()
    assert approval["decision"] == "approved"

    checkin = client.get("/api/progress/check-in", headers=headers).json()
    assert "1 approved" in checkin["summary"]
    assert any("skill evidence" in h for h in checkin["highlights"])
    comps = {c["skill"] for c in client.get("/api/progress/competencies", headers=headers).json()}
    assert {"python", "apis", "databases"} <= comps
    assert client.get("/api/progress/check-in").status_code in (401, 403)


def test_retrospective_counts_match_records(client, db_session):
    headers = _register(client, "learn-retro@test.local")
    _enroll(client, headers)
    retro = client.get("/api/progress/retrospective", headers=headers).json()
    assert retro["standups_confirmed"] == 0
    assert retro["submissions"] == 0
    assert any("standup" in n.lower() for n in retro["notes"])

    client.post("/api/standups/propose", json={
        "yesterday": "y", "today": "t", "blockers": "",
        "idempotency_key": "learn-standup-key1",
    }, headers=headers)
    first = client.get("/api/standups", headers=headers).json()[0]
    client.post(f"/api/standups/{first['id']}/confirm", headers=headers)
    retro = client.get("/api/progress/retrospective", headers=headers).json()
    assert retro["standups_confirmed"] >= 1


def test_notifications_are_owner_scoped_and_known_types(client, db_session):
    headers = _register(client, "learn-notif@test.local")
    _enroll(client, headers)
    assert client.get("/api/notifications", headers=headers).json() == []

    client.post("/api/github/repos", json={"full_name": "student/notif-repo"}, headers=headers)
    tasks = client.get("/api/sprints/current", headers=headers).json()["tasks"]
    tid = next(t["id"] for t in tasks if t["key"] == "AI-001")
    sub = client.post(
        "/api/submissions",
        json={"task_id": tid, "pr_url": "https://github.com/student/notif-repo/pull/1", "head_sha": "b" * 40},
        headers=headers,
    ).json()
    notes = client.get("/api/notifications", headers=headers).json()
    assert any(n["action"] == "submission.received" for n in notes)
    assert all("PR #1" in n["detail"] for n in notes if n["action"] == "submission.received")

    other = _register(client, "learn-stranger@test.local")
    _enroll(client, other)
    assert client.get("/api/notifications", headers=other).json() == []
    assert client.get("/api/notifications").status_code in (401, 403)
