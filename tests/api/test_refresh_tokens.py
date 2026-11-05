"""Refresh-token flow: rotation, reuse detection, logout revocation."""

DEMO = {"email": "demo@devspace.ai", "password": "DemoPass123!"}


def _login(client):
    res = client.post("/api/auth/login", json=DEMO)
    assert res.status_code == 200, res.text
    raw = client.cookies.get("devspace_refresh")
    assert raw, "login must set a refresh cookie"
    return raw


def test_refresh_without_cookie_is_401(client):
    client.cookies.clear()
    res = client.post("/api/auth/refresh")
    assert res.status_code == 401


def test_refresh_rotates_and_reuse_revokes_family(client):
    old_refresh = _login(client)

    rotated = client.post("/api/auth/refresh")
    assert rotated.status_code == 200, rotated.text
    assert rotated.json()["access_token"]
    new_refresh = client.cookies.get("devspace_refresh")
    assert new_refresh and new_refresh != old_refresh

    # Replaying the rotated-out token is treated as theft...
    client.cookies.set("devspace_refresh", old_refresh)
    reuse = client.post("/api/auth/refresh")
    assert reuse.status_code == 401

    # ...and revokes the whole family, including the newest token.
    client.cookies.set("devspace_refresh", new_refresh)
    family = client.post("/api/auth/refresh")
    assert family.status_code == 401


def test_logout_revokes_refresh_token(client):
    raw = _login(client)
    out = client.post("/api/auth/logout")
    assert out.status_code == 204
    client.cookies.set("devspace_refresh", raw)
    res = client.post("/api/auth/refresh")
    assert res.status_code == 401


def test_refresh_issues_working_access_token(client):
    _login(client)
    rotated = client.post("/api/auth/refresh")
    assert rotated.status_code == 200, rotated.text
    token = rotated.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == DEMO["email"]
