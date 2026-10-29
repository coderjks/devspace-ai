"""Phase 05: webhook HMAC, delivery dedupe, PR->task mapping, manual submit."""

import hashlib
import hmac
import json
import uuid
from types import SimpleNamespace

import pytest

SECRET = "test-webhook-secret"


@pytest.fixture()
def webhook_secret(monkeypatch):
    settings = SimpleNamespace(
        github_webhook_secret=SECRET,
        github_configured=False,
        github_app_id="",
        github_private_key_path="",
        github_api_url="https://api.github.com",
    )
    monkeypatch.setattr("app.routers.github.get_settings", lambda: settings)
    return settings


@pytest.fixture()
def fake_queue(monkeypatch):
    jobs = []
    monkeypatch.setattr("app.routers.github.enqueue_evaluation", lambda *args: jobs.append(args))
    return jobs


def _register(client, email):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "GitHub Student"},
    )
    assert res.status_code == 201, res.text
    client.cookies.clear()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _enroll(client, headers):
    res = client.post(
        "/api/enrollments",
        json={"track": "applied-ai-engineering", "skill_level": "beginner", "experience_level": "student", "goals": "phase 5"},
        headers=headers,
    )
    assert res.status_code in (200, 201), res.text


def _link(client, headers, full_name="student/internship"):
    res = client.post("/api/github/repos", json={"full_name": full_name}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def _sign(body: bytes) -> str:
    return "sha256=" + hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()


def _pr_payload(action, full_name, number=7, sha="a" * 40, title="[AI-001] Ticket API", merged=False, ref="ai-001-ticket-api"):
    return {
        "action": action,
        "number": number,
        "repository": {"full_name": full_name, "id": 123},
        "pull_request": {
            "number": number,
            "title": title,
            "body": "Implements the ticket endpoint.",
            "state": "open" if action != "closed" else "closed",
            "merged": merged,
            "head": {"sha": sha, "ref": ref},
            "base": {"ref": "main"},
        },
    }


def _post_webhook(client, payload, delivery=None, secret=SECRET):
    body = json.dumps(payload).encode()
    headers = {
        "X-GitHub-Event": "pull_request",
        "X-GitHub-Delivery": delivery or uuid.uuid4().hex,
        "X-Hub-Signature-256": "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest(),
    }
    return client.post("/api/github/webhook", content=body, headers=headers)


def test_webhook_not_configured_without_secret(client):
    body = json.dumps({"zen": "hi"}).encode()
    res = client.post(
        "/api/github/webhook",
        content=body,
        headers={"X-GitHub-Event": "ping", "X-GitHub-Delivery": "d1", "X-Hub-Signature-256": "sha256=x"},
    )
    assert res.status_code == 503


def test_forged_signature_rejected(client, webhook_secret):
    body = json.dumps({"action": "opened"}).encode()
    res = client.post(
        "/api/github/webhook",
        content=body,
        headers={"X-GitHub-Event": "pull_request", "X-GitHub-Delivery": "d2", "X-Hub-Signature-256": "sha256=deadbeef"},
    )
    assert res.status_code == 401


def test_opened_creates_submission_and_enqueues(client, webhook_secret, fake_queue):
    headers = _register(client, "gh-open@test.local")
    _enroll(client, headers)
    repo = _link(client, headers)
    res = _post_webhook(client, _pr_payload("opened", repo["full_name"]))
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "created"
    assert len(fake_queue) == 1

    subs = client.get("/api/submissions", headers=headers).json()
    assert len(subs) == 1
    assert subs[0]["task_key"] == "AI-001"
    assert subs[0]["head_sha"] == "a" * 40
    assert subs[0]["pr_number"] == 7
    assert subs[0]["status"] == "submitted"
    assert subs[0]["source"] == "webhook"


def test_synchronize_updates_sha_without_duplicate(client, webhook_secret, fake_queue):
    headers = _register(client, "gh-sync@test.local")
    _enroll(client, headers)
    repo = _link(client, headers, "student/sync-repo")
    assert _post_webhook(client, _pr_payload("synchronize", repo["full_name"], sha="b" * 40)).json()["status"] == "created"
    res = _post_webhook(client, _pr_payload("synchronize", repo["full_name"], sha="c" * 40))
    assert res.json()["status"] == "updated"
    subs = client.get("/api/submissions", headers=headers).json()
    assert len(subs) == 1
    assert subs[0]["head_sha"] == "c" * 40


def test_duplicate_delivery_is_noop(client, webhook_secret, fake_queue):
    headers = _register(client, "gh-dupe@test.local")
    _enroll(client, headers)
    repo = _link(client, headers, "student/dupe-repo")
    payload = _pr_payload("opened", repo["full_name"])
    first = _post_webhook(client, payload, delivery="fixed-delivery-1")
    assert first.json()["status"] == "created"
    second = _post_webhook(client, payload, delivery="fixed-delivery-1")
    assert second.json()["status"] == "duplicate"
    assert len(fake_queue) == 1
    assert len(client.get("/api/submissions", headers=headers).json()) == 1


def test_unlinked_repo_acknowledged(client, webhook_secret, fake_queue):
    headers = _register(client, "gh-unlinked@test.local")
    _enroll(client, headers)
    res = _post_webhook(client, _pr_payload("opened", " stranger/other-repo ".strip()))
    assert res.json()["status"] == "unlinked_repo"
    assert fake_queue == []


def test_pr_without_task_key_acknowledged(client, webhook_secret, fake_queue):
    headers = _register(client, "gh-nokey@test.local")
    _enroll(client, headers)
    repo = _link(client, headers, "student/nokey-repo")
    res = _post_webhook(client, _pr_payload("opened", repo["full_name"], title="Random cleanup", ref="cleanup-branch"))
    assert res.json()["status"] == "unresolved"
    assert fake_queue == []


def test_closed_marks_pr_state(client, webhook_secret, fake_queue):
    headers = _register(client, "gh-closed@test.local")
    _enroll(client, headers)
    repo = _link(client, headers, "student/closed-repo")
    _post_webhook(client, _pr_payload("opened", repo["full_name"], sha="d" * 40))
    res = _post_webhook(client, _pr_payload("closed", repo["full_name"], sha="d" * 40, merged=True))
    assert res.json()["status"] == "closed"
    subs = client.get("/api/submissions", headers=headers).json()
    assert subs[0]["pr_state"] == "closed"
    assert subs[0]["merged"] is True


def _task_id(client, headers, key="AI-002"):
    tasks = client.get("/api/sprints/current", headers=headers).json()["tasks"]
    return next(t["id"] for t in tasks if t["key"] == key)


def test_manual_submit_with_explicit_sha(client, webhook_secret, fake_queue):
    headers = _register(client, "gh-manual@test.local")
    _enroll(client, headers)
    _link(client, headers, "student/manual-repo")
    tid = _task_id(client, headers)
    res = client.post(
        "/api/submissions",
        json={"task_id": tid, "pr_url": "https://github.com/student/manual-repo/pull/3", "head_sha": "e" * 40},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["source"] == "manual"
    assert data["head_sha"] == "e" * 40
    assert len(fake_queue) == 1


def test_manual_submit_requires_linked_repo_and_sha(client, webhook_secret, fake_queue):
    headers = _register(client, "gh-manual2@test.local")
    _enroll(client, headers)
    tid = _task_id(client, headers)
    # Unlinked repo.
    res = client.post(
        "/api/submissions",
        json={"task_id": tid, "pr_url": "https://github.com/other/repo/pull/1", "head_sha": "f" * 40},
        headers=headers,
    )
    assert res.status_code == 422
    # Bad URL.
    _link(client, headers, "student/manual2-repo")
    res = client.post(
        "/api/submissions", json={"task_id": tid, "pr_url": "not-a-pr-url", "head_sha": "f" * 40}, headers=headers
    )
    assert res.status_code == 422
    # No SHA and no App configured.
    res = client.post(
        "/api/submissions",
        json={"task_id": tid, "pr_url": "https://github.com/student/manual2-repo/pull/1"},
        headers=headers,
    )
    assert res.status_code == 422
    assert fake_queue == []


def test_repo_link_validation_and_scoping(client):
    headers = _register(client, "gh-repos@test.local")
    _enroll(client, headers)
    assert client.post("/api/github/repos", json={"full_name": "bad name!!"}, headers=headers).status_code == 422
    repo = _link(client, headers, "student/dup-repo")
    dupe = client.post("/api/github/repos", json={"full_name": "student/dup-repo"}, headers=headers)
    assert dupe.status_code == 409
    # Unauthenticated.
    assert client.get("/api/github/status").status_code in (401, 403)
    status = client.get("/api/github/status", headers=headers).json()
    assert status["app_configured"] is False
    assert len(status["repos"]) == 1
    # Unlink.
    assert client.delete(f"/api/github/repos/{repo['id']}", headers=headers).status_code == 204
    assert client.get("/api/submissions", headers=headers).json() == []
