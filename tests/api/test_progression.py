"""Phase 07: deterministic approval, exactly-once unlock, remediation, competencies."""

import uuid

import pytest

from app.eval.pipeline import run_evaluation
from app.eval.review import mock_review
from app.models import Task
from app.progression.service import decide

DIFF_CLEAN = """diff --git a/api.py b/api.py
--- a/api.py
+++ b/api.py
@@ -1,2 +1,3 @@
 def ticket():
+    return {"ok": True}
     pass
"""

DIFF_SECRET = DIFF_CLEAN + '+API_KEY = "sk-live-abcdefgh12345678"\n'


@pytest.fixture(autouse=True)
def _no_real_queue(monkeypatch):
    monkeypatch.setattr("app.routers.github.enqueue_evaluation", lambda *args: None)


@pytest.fixture(autouse=True)
def _restore_global_task_statuses(db_session):
    # Task statuses are global to the shared sprint seed: snapshot before each
    # test and restore after, so approval side effects never leak into others.
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
        json={"email": email, "password": "Password123!", "full_name": "Progress Student"},
    )
    assert res.status_code == 201, res.text
    client.cookies.clear()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _enroll(client, headers):
    res = client.post(
        "/api/enrollments",
        json={"track": "applied-ai-engineering", "skill_level": "beginner", "experience_level": "student", "goals": "phase 7"},
        headers=headers,
    )
    assert res.status_code in (200, 201), res.text


def _submit(client, headers, task_key, sha, repo):
    client.post("/api/github/repos", json={"full_name": repo}, headers=headers)
    tasks = client.get("/api/sprints/current", headers=headers).json()["tasks"]
    tid = next(t["id"] for t in tasks if t["key"] == task_key)
    res = client.post(
        "/api/submissions",
        json={"task_id": tid, "pr_url": f"https://github.com/{repo}/pull/1", "head_sha": sha},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def _evaluate(db_session, sid, sha, diff):
    outcome, evaluation = run_evaluation(
        db_session, sid, sha, diff_text=diff, reviewer=lambda d, s, h: mock_review(h, s)
    )
    assert outcome == "evaluated"
    return evaluation


def _approve(client, headers, sid, key=None):
    return client.post(
        "/api/submissions/{}/approvals".format(sid),
        json={"idempotency_key": key or uuid.uuid4().hex},
        headers=headers,
    )


def _task_status(client, headers, key):
    tasks = client.get("/api/sprints/current", headers=headers).json()["tasks"]
    return next(t["status"] for t in tasks if t["key"] == key)


def test_failing_pr_yields_remediation_and_no_unlock(client, db_session):
    headers = _register(client, "prog-fail@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, "AI-001", "a" * 40, "student/fail-repo")
    _evaluate(db_session, sid, "a" * 40, DIFF_SECRET)

    res = _approve(client, headers, sid)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["decision"] == "denied"
    assert "secret_scan" in data["reason"]
    assert data["unlocked"] == []

    remed = client.get(f"/api/approvals/{data['id']}/remediation", headers=headers)
    assert remed.status_code == 200, remed.text
    hints = remed.json()["hints"]
    assert [h["level"] for h in hints] == [1, 2, 3]
    assert all(h["body"] for h in hints)
    # No full-solution dump: hints must not contain the leaked secret itself.
    assert "sk-live" not in " ".join(h["body"] for h in hints)

    assert _task_status(client, headers, "AI-001") != "approved"
    assert _task_status(client, headers, "AI-002") == "locked"


def test_fixed_pr_approves_and_unlocks_exactly_once(client, db_session):
    headers = _register(client, "prog-pass@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, "AI-001", "b" * 40, "student/pass-repo")
    _evaluate(db_session, sid, "b" * 40, DIFF_CLEAN)

    key = uuid.uuid4().hex
    first = _approve(client, headers, sid, key)
    assert first.status_code == 201, first.text
    data = first.json()
    assert data["decision"] == "approved"
    assert sorted(data["unlocked"]) == ["AI-002", "AI-003"]

    # Repeat with the same key: stored verdict, no duplicate work.
    second = _approve(client, headers, sid, key)
    assert second.status_code == 200
    assert second.json()["id"] == data["id"]
    assert second.json()["created"] is False

    # Same submission under a different key: conflict, never a second verdict.
    assert _approve(client, headers, sid).status_code == 409

    assert _task_status(client, headers, "AI-001") == "approved"
    assert _task_status(client, headers, "AI-002") == "todo"
    assert _task_status(client, headers, "AI-003") == "todo"
    # AI-004 needs AI-003 too — stays locked until AI-003 is approved.
    assert _task_status(client, headers, "AI-004") == "locked"

    # Competencies credited from rubric skills + check evidence.
    comps = client.get("/api/progress/competencies", headers=headers).json()
    skills = {c["skill"]: c for c in comps}
    for expected in ("python", "apis", "databases", "security", "testing", "engineering_practices"):
        assert expected in skills, expected
        assert skills[expected]["score"] >= 1

    # Approved submissions have no remediation.
    assert client.get(f"/api/approvals/{data['id']}/remediation", headers=headers).status_code == 404


def test_approval_requires_evaluation_for_current_head(client, db_session):
    headers = _register(client, "prog-noeval@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, "AI-001", "c" * 40, "student/noeval-repo")
    res = _approve(client, headers, sid)
    assert res.status_code == 422


def test_approval_is_owner_scoped(client, db_session):
    headers = _register(client, "prog-owner@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, "AI-001", "d" * 40, "student/owner-repo")
    _evaluate(db_session, sid, "d" * 40, DIFF_CLEAN)
    other = _register(client, "prog-stranger@test.local")
    _enroll(client, other)
    assert _approve(client, other, sid).status_code == 404
    assert client.get(f"/api/submissions/{sid}/approvals/latest", headers=other).status_code == 404


def test_decide_pure_rules_cover_stale_and_closed(db_session):
    class Fake:
        pass

    closed = Fake()
    closed.head_sha = "a" * 40
    closed.pr_state = "closed"
    closed.merged = False
    evaluation = Fake()
    evaluation.sha = "a" * 40
    evaluation.test_results = {"checks": [{"name": "diff_available", "status": "pass", "blocking": False}]}
    evaluation.ai_review = {"error": None, "findings": [], "mock": True}
    decision, reason, _failed = decide(closed, evaluation)
    assert decision == "denied" and "closed" in reason

    moved = Fake()
    moved.head_sha = "b" * 40
    moved.pr_state = "open"
    moved.merged = False
    decision, reason, _failed = decide(moved, evaluation)
    assert decision == "denied" and "Stale" in reason


def test_eligibility_is_server_derived(client, db_session):
    headers = _register(client, "prog-elig@test.local")
    _enroll(client, headers)
    # Task statuses are global to the shared sprint seed, so assert structure
    # and internal consistency rather than absolute initial statuses.
    elig = client.get("/api/progress/eligibility", headers=headers).json()
    by_key = {t["key"]: t for t in elig["tasks"]}
    assert {t["key"] for t in elig["tasks"]} == {"AI-001", "AI-002", "AI-003", "AI-004", "AI-005", "AI-006"}
    assert [p["key"] for p in by_key["AI-002"]["prerequisites"]] == ["AI-001"]
    for t in elig["tasks"]:
        for p in t["prerequisites"]:
            assert p["met"] == (by_key[p["key"]]["status"] == "approved")

    sid = _submit(client, headers, "AI-001", "e" * 40, "student/elig-repo")
    _evaluate(db_session, sid, "e" * 40, DIFF_CLEAN)
    assert _approve(client, headers, sid).json()["decision"] == "approved"

    elig = client.get("/api/progress/eligibility", headers=headers).json()
    by_key = {t["key"]: t for t in elig["tasks"]}
    assert by_key["AI-001"]["latest_decision"] == "approved"
    assert by_key["AI-002"]["prerequisites"][0]["met"] is True
    assert elig["next_recommended_key"] in {t["key"] for t in elig["tasks"] if t["status"] == "todo"}
