import uuid


def _unique_email() -> str:
    return f"student-{uuid.uuid4().hex[:8]}@example.com"


def test_register_login_me_logout(client):
    email = _unique_email()
    res = client.post("/api/auth/register", json={"email": email, "password": "SecurePass123!", "full_name": "Test Student"})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["user"]["email"] == email
    assert body["access_token"]

    # Login with wrong password fails
    bad = client.post("/api/auth/login", json={"email": email, "password": "wrong-password"})
    assert bad.status_code == 401

    # Login succeeds
    ok = client.post("/api/auth/login", json={"email": email, "password": "SecurePass123!"})
    assert ok.status_code == 200
    token = ok.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email

    # Cookie path also works (TestClient persists cookies from login)
    me_cookie = client.get("/api/auth/me")
    assert me_cookie.status_code == 200

    # Logout clears session; subsequent cookie-only /me requires auth again.
    # Bearer token is stateless, so we only assert logout endpoint succeeds.
    out = client.post("/api/auth/logout")
    assert out.status_code == 204


def test_register_duplicate_email_conflict(client):
    email = _unique_email()
    first = client.post("/api/auth/register", json={"email": email, "password": "SecurePass123!", "full_name": "A"})
    assert first.status_code == 201
    second = client.post("/api/auth/register", json={"email": email, "password": "SecurePass123!", "full_name": "B"})
    assert second.status_code == 409


def test_me_requires_auth(client):
    # Fresh client without cookies
    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as fresh:
        res = fresh.get("/api/auth/me")
        assert res.status_code == 401


def test_seeded_demo_login(client, demo_token):
    assert demo_token
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {demo_token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "demo@devspace.ai"
