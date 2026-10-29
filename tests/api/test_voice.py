"""Phase 08: consent, personas, audio validation, STT/TTS mocks, continuity."""

import io

import pytest

from app.voice.providers import (
    MOCK_FIXTURE_MARKER,
    MockSTT,
    MockTTS,
    VoiceProviderError,
    get_stt,
    get_tts,
    make_fixture_wav,
    wav_duration_seconds,
)


def _register(client, email):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Voice Student"},
    )
    assert res.status_code == 201, res.text
    client.cookies.clear()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _enroll(client, headers):
    res = client.post(
        "/api/enrollments",
        json={"track": "applied-ai-engineering", "skill_level": "beginner", "experience_level": "student", "goals": "phase 8"},
        headers=headers,
    )
    assert res.status_code in (200, 201), res.text


def _session(client, headers, persona="tech-lead"):
    res = client.post("/api/voice/sessions", json={"persona": persona, "consent": True}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()["id"]


def _upload(client, headers, sid, audio, filename="turn.wav", content_type="audio/wav"):
    return client.post(
        f"/api/voice/sessions/{sid}/turns",
        files={"audio": (filename, audio, content_type)},
        headers=headers,
    )


def test_consent_required_and_persona_allowlist(client):
    headers = _register(client, "voice-consent@test.local")
    _enroll(client, headers)
    res = client.post("/api/voice/sessions", json={"persona": "tech-lead", "consent": False}, headers=headers)
    assert res.status_code == 422
    res = client.post(
        "/api/voice/sessions", json={"persona": "engineering-manager", "consent": True}, headers=headers
    )
    assert res.status_code == 422
    assert client.post("/api/voice/sessions", json={"persona": "tech-lead", "consent": True}).status_code in (401, 403)


def test_mock_stt_accepts_only_fixtures():
    transcript, is_mock = MockSTT().transcribe(make_fixture_wav(), content_type="audio/wav")
    assert is_mock is True and len(transcript) > 0
    with pytest.raises(VoiceProviderError):
        MockSTT().transcribe(b"real microphone bytes", content_type="audio/wav")
    with pytest.raises(VoiceProviderError):
        get_stt("nope", None)
    with pytest.raises(VoiceProviderError):
        get_stt("live", type("S", (), {"stt_api_key": ""})())
    with pytest.raises(VoiceProviderError):
        get_tts("live", type("S", (), {"tts_api_key": ""})())


def test_mock_tts_returns_valid_wav():
    wav, is_mock = MockTTS().synthesize("hello there")
    assert is_mock is True
    assert wav_duration_seconds(wav) is not None


def test_upload_validates_audio(client):
    headers = _register(client, "voice-upload@test.local")
    _enroll(client, headers)
    sid = _session(client, headers)
    # Non-audio rejected.
    res = client.post(
        f"/api/voice/sessions/{sid}/turns",
        files={"audio": ("note.txt", b"hello", "text/plain")},
        headers=headers,
    )
    assert res.status_code == 422
    # Empty audio (silence path) rejected.
    res = _upload(client, headers, sid, b"", content_type="audio/wav")
    assert res.status_code == 422
    # Real (non-fixture) audio in mock mode rejected with guidance.
    res = _upload(client, headers, sid, make_fixture_wav().replace(MOCK_FIXTURE_MARKER, b""))
    assert res.status_code == 422
    assert "text" in res.json()["detail"].lower() or "mock" in res.json()["detail"].lower()
    # Fixture transcribes and stores transcript only — never audio.
    res = _upload(client, headers, sid, make_fixture_wav())
    assert res.status_code == 201, res.text
    turn = res.json()
    assert turn["stt_mock"] is True
    assert turn["audio_stored"] is False
    assert "Mock transcription" in turn["transcript"]


def test_submit_routes_through_orchestrator_with_continuity(client):
    headers = _register(client, "voice-submit@test.local")
    _enroll(client, headers)
    sid = _session(client, headers)
    # Text chat first, in the same persona conversation.
    first = client.post("/api/agents/tech-lead/messages", json={"content": "context seed"}, headers=headers)
    assert first.status_code == 200, first.text
    conv_id = first.json()["conversation_id"]

    turn_id = _upload(client, headers, sid, make_fixture_wav()).json()["id"]
    # Empty edit rejected: nothing to submit.
    res = client.post(f"/api/voice/turns/{turn_id}/submit", json={"edited_text": "  "}, headers=headers)
    assert res.status_code == 422
    # Submit the transcript (unedited).
    res = client.post(f"/api/voice/turns/{turn_id}/submit", json={}, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["turn"]["submitted_text"] is not None
    assert data["reply_text"]
    assert data["reply_mock"] is True
    assert data["audio_mock"] is True

    # Voice reply landed in the SAME conversation as the text message.
    convs = client.get("/api/agents/tech-lead/conversations", headers=headers).json()
    assert conv_id in [c["id"] for c in convs]
    history = client.get(f"/api/agents/conversations/{conv_id}/messages", headers=headers).json()
    messages = history["messages"] if isinstance(history, dict) else history
    roles = [m["role"] for m in messages]
    assert roles.count("user") >= 2 and "assistant" in roles


def test_typed_turn_follows_same_submit_flow(client):
    headers = _register(client, "voice-typed@test.local")
    _enroll(client, headers)
    sid = _session(client, headers)
    res = client.post(f"/api/voice/sessions/{sid}/typed-turns", json={"text": "What should I do next?"}, headers=headers)
    assert res.status_code == 201, res.text
    turn = res.json()
    assert turn["input_mode"] == "typed"
    assert turn["stt_mock"] is False
    sub = client.post(f"/api/voice/turns/{turn['id']}/submit", json={}, headers=headers)
    assert sub.status_code == 200, sub.text
    assert sub.json()["reply_text"]


def test_sessions_are_owner_scoped_and_deletable(client):
    headers = _register(client, "voice-owner@test.local")
    _enroll(client, headers)
    sid = _session(client, headers, persona="scrum-master")
    other = _register(client, "voice-stranger@test.local")
    _enroll(client, other)
    assert client.get(f"/api/voice/sessions/{sid}/turns", headers=other).status_code == 404
    assert client.get("/api/voice/sessions", headers=headers).json()[0]["turn_count"] == 0
    assert client.delete(f"/api/voice/sessions/{sid}", headers=headers).status_code == 204
    assert client.get("/api/voice/sessions", headers=headers).json() == []
