"""Phase 06: SHA-pinned evaluation, idempotency, staleness, retries, review validation."""

import pytest

from app.eval.pipeline import (
    MAX_ATTEMPTS,
    TransientEvalError,
    meta_reviewer,
    requeue_or_fail,
    run_evaluation,
)
from app.eval.review import mock_review
from app.models import Evaluation, Submission

DIFF_OK = """diff --git a/api.py b/api.py
--- a/api.py
+++ b/api.py
@@ -1,2 +1,3 @@
 def ticket():
+    return {"ok": True}
     pass
"""

DIFF_SECRET = DIFF_OK + '+API_KEY = "sk-live-abcdefgh12345678"\n'
DIFF_WIP = DIFF_OK + "+# WIP: finish this\n"


class StubRedis:
    def __init__(self):
        self.items = []

    def lpush(self, _key, value):
        self.items.append(value)


@pytest.fixture(autouse=True)
def _no_real_queue(monkeypatch):
    # Submission creation enqueues for real; keep test jobs out of dev Redis.
    monkeypatch.setattr("app.routers.github.enqueue_evaluation", lambda *args: None)


def _register(client, email):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Eval Student"},
    )
    assert res.status_code == 201, res.text
    client.cookies.clear()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _enroll(client, headers):
    res = client.post(
        "/api/enrollments",
        json={"track": "applied-ai-engineering", "skill_level": "beginner", "experience_level": "student", "goals": "phase 6"},
        headers=headers,
    )
    assert res.status_code in (200, 201), res.text


def _submit(client, headers, task_key="AI-001", sha="a" * 40, repo="student/eval-repo"):
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


def _reviewer_ok(diff, summary, sha):
    return mock_review(sha, summary)


def test_happy_path_records_immutable_evaluation(client, db_session):
    headers = _register(client, "eval-ok@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers)
    outcome, evaluation = run_evaluation(db_session, sid, "a" * 40, diff_text=DIFF_OK, reviewer=_reviewer_ok)
    assert outcome == "evaluated"
    assert evaluation.test_results["status"] == "complete"
    assert all(c["status"] == "pass" for c in evaluation.test_results["checks"])
    assert evaluation.ai_review["mock"] is True
    assert evaluation.ai_review["findings"] == []
    assert evaluation.ai_review["error"] is None
    assert evaluation.test_suite_version and evaluation.prompt_version
    assert db_session.query(Submission).filter(Submission.id == sid).first().status.value == "evaluated"


def test_duplicate_job_returns_existing_row(client, db_session):
    headers = _register(client, "eval-dupe@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, repo="student/dupe2-repo")
    run_evaluation(db_session, sid, "a" * 40, diff_text=DIFF_OK, reviewer=_reviewer_ok)
    outcome, evaluation = run_evaluation(db_session, sid, "a" * 40, diff_text=DIFF_OK, reviewer=_reviewer_ok)
    assert outcome == "duplicate"
    assert db_session.query(Evaluation).filter(Evaluation.submission_id == sid).count() == 1


def test_stale_sha_does_not_overwrite(client, db_session):
    headers = _register(client, "eval-stale@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, repo="student/stale-repo")
    # New push moves the head forward; the old job arrives late.
    sub = db_session.query(Submission).filter(Submission.id == sid).first()
    sub.head_sha = "b" * 40
    db_session.commit()
    outcome, evaluation = run_evaluation(db_session, sid, "a" * 40, diff_text=DIFF_OK, reviewer=_reviewer_ok)
    assert outcome == "stale"
    assert evaluation.policy_decision == "stale"
    assert db_session.query(Submission).filter(Submission.id == sid).first().status.value == "submitted"


def test_secret_in_diff_is_blocking(client, db_session):
    headers = _register(client, "eval-secret@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, repo="student/secret-repo")
    outcome, evaluation = run_evaluation(db_session, sid, "a" * 40, diff_text=DIFF_SECRET, reviewer=_reviewer_ok)
    assert outcome == "evaluated"
    scan = next(c for c in evaluation.test_results["checks"] if c["name"] == "secret_scan")
    assert scan["status"] == "fail" and scan["blocking"] is True
    # Secrets never reach the reviewer: redacted copy carries no key material.
    assert "sk-live" not in evaluation.ai_review.get("summary", "")


def test_wip_marker_fails(client, db_session):
    headers = _register(client, "eval-wip@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, repo="student/wip-repo")
    _outcome, evaluation = run_evaluation(db_session, sid, "a" * 40, diff_text=DIFF_WIP, reviewer=_reviewer_ok)
    wip = next(c for c in evaluation.test_results["checks"] if c["name"] == "wip_marker")
    assert wip["status"] == "fail"


def test_missing_diff_skips_with_blocking_reason(client, db_session):
    headers = _register(client, "eval-nodiff@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, repo="student/nodiff-repo")
    _outcome, evaluation = run_evaluation(db_session, sid, "a" * 40, diff_fetcher=lambda: None, reviewer=_reviewer_ok)
    avail = evaluation.test_results["checks"][0]
    assert avail["name"] == "diff_available" and avail["status"] == "skip" and avail["blocking"] is True


def test_malformed_review_is_recorded_not_coerced(client, db_session):
    headers = _register(client, "eval-malformed@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, repo="student/malformed-repo")
    bad = lambda _d, _s, _sha: {"not": "a review"}
    _outcome, evaluation = run_evaluation(db_session, sid, "a" * 40, diff_text=DIFF_OK, reviewer=bad)
    assert evaluation.ai_review["error"] is not None
    assert evaluation.ai_review["findings"] == []


def test_reviewer_crash_is_recorded(client, db_session):
    headers = _register(client, "eval-crash@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, repo="student/crash-repo")

    def _boom(_d, _s, _sha):
        raise RuntimeError("model exploded")

    _outcome, evaluation = run_evaluation(db_session, sid, "a" * 40, diff_text=DIFF_OK, reviewer=_boom)
    assert "reviewer error" in evaluation.ai_review["error"]


def test_mock_provider_yields_labeled_mock_review_not_parse_error():
    review = meta_reviewer("some diff", "diff_available=pass", "a" * 40)
    assert review["mock"] is True
    assert review["findings"] == []
    assert review["error"] is None


def test_transient_failures_requeue_then_give_up():
    redis = StubRedis()
    assert requeue_or_fail(redis, "sid", "sha", 0) == "requeued"
    assert requeue_or_fail(redis, "sid", "sha", MAX_ATTEMPTS) == "exhausted"
    assert len(redis.items) == 1


def test_transient_reviewer_error_propagates_for_retry(client, db_session):
    headers = _register(client, "eval-retry@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, repo="student/retry-repo")

    def _flaky(_d, _s, _sha):
        raise TransientEvalError("timeout")

    with pytest.raises(TransientEvalError):
        run_evaluation(db_session, sid, "a" * 40, diff_text=DIFF_OK, reviewer=_flaky)
    assert db_session.query(Evaluation).filter(Evaluation.submission_id == sid).count() == 0


def test_evaluation_endpoints_are_owner_scoped(client):
    headers = _register(client, "eval-api@test.local")
    _enroll(client, headers)
    sid = _submit(client, headers, repo="student/api-repo")
    assert client.get(f"/api/submissions/{sid}/evaluations").status_code in (401, 403)
    mine = client.get(f"/api/submissions/{sid}/evaluations", headers=headers).json()
    assert mine == []
    other = _register(client, "eval-api-other@test.local")
    _enroll(client, other)
    assert client.get(f"/api/submissions/{sid}/evaluations", headers=other).status_code == 404
