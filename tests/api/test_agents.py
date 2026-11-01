"""Phase 03 chat tests: auth, ownership, role separation, provider failures."""

import pytest
from app.agents.mock import MockAdapter
from app.agents.orchestrator import FALLBACK_REPLY, get_provider, respond
from app.agents.provider import ProviderError
from app.config import get_settings


def _register(client, email):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Test Student"},
    )
    assert res.status_code == 201, res.text
    # Register sets a session cookie; clear it so the shared client keeps
    # acting as the demo user (cookie auth takes precedence over Bearer).
    client.cookies.clear()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_chat_requires_auth(client):
    assert client.post("/api/agents/tech-lead/messages", json={"content": "hi"}).status_code == 401


def test_unknown_persona_is_404(client, auth_headers):
    res = client.post("/api/agents/dean/messages", json={"content": "hi"}, headers=auth_headers)
    assert res.status_code == 404


def test_chat_requires_enrollment(client):
    headers = _register(client, "unenrolled@test.local")
    res = client.post("/api/agents/tech-lead/messages", json={"content": "hi"}, headers=headers)
    assert res.status_code == 403


def test_roundtrip_persists_and_uses_context(client, auth_headers):
    send = client.post(
        "/api/agents/tech-lead/messages",
        json={"content": "What should I do on AI-001?"},
        headers=auth_headers,
    )
    assert send.status_code == 200, send.text
    body = send.json()
    assert body["mock"] is True
    assert body["model"] == "mock-teammate-v1"
    assert "AI-001" in body["message"]["content"]
    conv_id = body["conversation_id"]

    again = client.post(
        "/api/agents/tech-lead/messages",
        json={"content": "And its tests?", "conversation_id": conv_id},
        headers=auth_headers,
    )
    assert again.status_code == 200, again.text
    assert again.json()["conversation_id"] == conv_id

    convs = client.get("/api/agents/tech-lead/conversations", headers=auth_headers)
    assert convs.status_code == 200
    assert any(c["id"] == conv_id for c in convs.json())

    msgs = client.get(f"/api/agents/conversations/{conv_id}/messages", headers=auth_headers)
    assert msgs.status_code == 200, msgs.text
    roles = [m["role"] for m in msgs.json()]
    assert roles == ["user", "assistant", "user", "assistant"]


def test_personas_have_isolated_conversations(client, auth_headers):
    a = client.post("/api/agents/tech-lead/messages", json={"content": "hi"}, headers=auth_headers)
    b = client.post(
        "/api/agents/scrum-master/messages", json={"content": "hi"}, headers=auth_headers
    )
    assert a.status_code == b.status_code == 200
    assert a.json()["conversation_id"] != b.json()["conversation_id"]


def test_cannot_read_or_use_other_users_conversation(client, auth_headers):
    send = client.post(
        "/api/agents/tech-lead/messages", json={"content": "hi"}, headers=auth_headers
    )
    conv_id = send.json()["conversation_id"]
    other = _register(client, "other@test.local")
    assert (
        client.get(f"/api/agents/conversations/{conv_id}/messages", headers=other).status_code
        == 404
    )
    assert (
        client.post(
            "/api/agents/scrum-master/messages",
            json={"content": "hi", "conversation_id": conv_id},
            headers=auth_headers,
        ).status_code
        == 422
    )


def test_empty_content_rejected(client, auth_headers):
    res = client.post(
        "/api/agents/tech-lead/messages", json={"content": "   "}, headers=auth_headers
    )
    assert res.status_code in (422, 400)


def test_empty_model_output_falls_back(db_session, seeded):
    from app.models import User

    class EmptyProvider:
        name = "empty"

        def respond(self, **kwargs):
            from app.agents.provider import LLMResponse

            return LLMResponse(text="   ", model="empty", mock=True)

    user = db_session.query(User).filter(User.email == "demo@devspace.ai").first()
    _conv, msg = respond(
        db_session, user, EmptyProvider(), persona="qa-engineer", content="hello"
    )
    assert msg.content == FALLBACK_REPLY


def test_unknown_provider_name_fails_closed(client, auth_headers, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "llm_provider", "bogus-no-such-provider")
    try:
        res = client.post(
            "/api/agents/tech-lead/messages", json={"content": "hi"}, headers=auth_headers
        )
        assert res.status_code == 502
    finally:
        monkeypatch.setattr(settings, "llm_provider", "mock")


def test_meta_adapter_requires_key_and_model():
    from app.agents.meta import MetaAdapter

    with pytest.raises(ProviderError):
        MetaAdapter(base_url="https://api.meta.ai/v1", api_key="", model="muse-spark-1.3")
    with pytest.raises(ProviderError):
        MetaAdapter(base_url="https://api.meta.ai/v1", api_key="k", model="")


def test_get_provider_rejects_unknown_name():
    with pytest.raises(ProviderError):
        get_provider("nope", get_settings())


def test_mock_forced_failure_surfaces_as_unavailable():
    settings = get_settings()
    provider = get_provider("mock", settings)
    with pytest.raises(ProviderError):
        provider.respond(
            persona="tech-lead",
            system_prompt="sys",
            context="ctx",
            history=[],
            user_message="please raise-error now",
        )


def test_mock_replies_are_labeled():
    provider = MockAdapter()
    out = provider.respond(
        persona="tech-lead", system_prompt="sys", context="Sprint: S1", history=[], user_message="hi"
    )
    assert out.mock is True
    assert out.text.startswith("[mock]")
