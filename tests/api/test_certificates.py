"""Completion certificates: eligibility, idempotency, signed public verification."""

import uuid

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
def _clean_user_task_states(db_session):
    from app.models import Certificate as _Cert
    from app.models import UserTaskState as _UTS

    yield
    db_session.query(_UTS).delete()
    db_session.query(_Cert).delete()
    db_session.commit()


def _register(client, email):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Cert Student"},
    )
    assert res.status_code == 201, res.text
    client.cookies.clear()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _enroll(client, headers):
    res = client.post(
        "/api/enrollments",
        json={"track": "applied-ai-engineering", "skill_level": "beginner"},
        headers=headers,
    )
    assert res.status_code in (200, 201), res.text


def _approve_task(client, db_session, headers, task_key, sha):
    client.post("/api/github/repos", json={"full_name": f"student/{task_key}-repo"}, headers=headers)
    tasks = client.get("/api/sprints/current", headers=headers).json()["tasks"]
    tid = next(t["id"] for t in tasks if t["key"] == task_key)
    sub = client.post(
        "/api/submissions",
        json={"task_id": tid, "pr_url": f"https://github.com/student/{task_key}-repo/pull/1", "head_sha": sha},
        headers=headers,
    )
    assert sub.status_code == 201, sub.text
    outcome, _ = run_evaluation(
        db_session, sub.json()["id"], sha, diff_text=DIFF_CLEAN, reviewer=lambda d, s, h: mock_review(h, s)
    )
    assert outcome == "evaluated"
    res = client.post(
        f"/api/submissions/{sub.json()['id']}/approvals",
        json={"idempotency_key": uuid.uuid4().hex},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    assert res.json()["decision"] == "approved"


def _approve_all(client, db_session, headers):
    for i, key in enumerate(["AI-001", "AI-002", "AI-003", "AI-004", "AI-005", "AI-006"]):
        _approve_task(client, db_session, headers, key, f"{i}" * 40)


def test_issue_requires_full_completion(client, db_session):
    headers = _register(client, "cert-partial@test.local")
    _enroll(client, headers)
    _approve_task(client, db_session, headers, "AI-001", "a" * 40)

    me = client.get("/api/certificates/me", headers=headers).json()
    assert me["certificate"] is None
    assert me["eligible"] is False
    assert me["approved"] == 1 and me["total"] == 6

    res = client.post("/api/certificates/issue", headers=headers)
    assert res.status_code == 409, res.text


def test_issue_verify_and_idempotency(client, db_session):
    headers = _register(client, "cert-full@test.local")
    _enroll(client, headers)
    _approve_all(client, db_session, headers)

    me = client.get("/api/certificates/me", headers=headers).json()
    assert me["eligible"] is True and me["approved"] == 6

    first = client.post("/api/certificates/issue", headers=headers)
    assert first.status_code == 201, first.text
    body = first.json()
    assert body["recipient_name"] == "Cert Student"
    assert "." in body["credential"]

    # Re-issue is idempotent: same certificate, no duplicate.
    second = client.post("/api/certificates/issue", headers=headers)
    assert second.status_code == 201
    assert second.json()["id"] == body["id"]

    # Another student's board is untouched by this student's approvals.
    other = _register(client, "cert-other@test.local")
    _enroll(client, other)
    assert client.get("/api/certificates/me", headers=other).json()["eligible"] is False

    # Public verification works with no auth at all.
    client.cookies.clear()
    good = client.get(f"/api/certificates/verify/{body['credential']}")
    assert good.status_code == 200, good.text
    assert good.json()["valid"] is True
    assert good.json()["recipient_name"] == "Cert Student"


def test_forged_and_unknown_credentials_rejected(client, db_session):
    headers = _register(client, "cert-forge@test.local")
    _enroll(client, headers)
    _approve_all(client, db_session, headers)
    cred = client.post("/api/certificates/issue", headers=headers).json()["credential"]
    code, sig = cred.split(".")

    client.cookies.clear()
    assert client.get(f"/api/certificates/verify/{code}.{'A' * len(sig)}").json()["valid"] is False
    assert client.get(f"/api/certificates/verify/{code}").json()["valid"] is False
    assert client.get("/api/certificates/verify/not-a-credential").json()["valid"] is False
