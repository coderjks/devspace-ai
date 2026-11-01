"""Voice sessions and turns (Phase 08).

- Consent is recorded before any audio is accepted; without it, uploads 403.
- Only scrum-master and tech-lead personas (no group meetings).
- Uploads are validated (audio/*, size cap, WAV duration cap, non-empty) and
  transcribed in memory. Raw audio is NEVER written to disk or the database.
- Transcription and submission are separate steps: the student edits the
  transcript, then explicitly submits. A voice transcript alone never
  authorizes consequential actions — standup confirmation still goes through
  the existing text propose/confirm flow (Phase 09 UI calls those endpoints).
- Replies route through the same AgentOrchestrator conversation as text chat,
  so switching modes preserves context. TTS audio is returned inline (base64)
  and never stored.
"""

from __future__ import annotations

import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import config as config_module
from app.agents.orchestrator import EnrollmentRequired, get_provider, respond
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, VoiceSession, VoiceTurn
from app.schemas import (
    VoiceSessionIn,
    VoiceSessionOut,
    VoiceSubmitIn,
    VoiceSubmitOut,
    VoiceTurnOut,
    VoiceTypedTurnIn,
)
from app.voice.providers import VoiceProviderError, get_stt, get_tts, wav_duration_seconds

router = APIRouter(tags=["voice"])

VOICE_PERSONAS = ("scrum-master", "tech-lead")


def get_settings():
    return config_module.get_settings()


def _out_session(s: VoiceSession, turn_count: int = 0) -> VoiceSessionOut:
    return VoiceSessionOut(
        id=s.id,
        persona=s.persona,
        consent=s.consent,
        language_hint=s.language_hint,
        turn_count=turn_count,
        created_at=s.created_at,
    )


def _out_turn(t: VoiceTurn) -> VoiceTurnOut:
    return VoiceTurnOut(
        id=t.id,
        session_id=t.session_id,
        sequence=t.sequence,
        input_mode=t.input_mode,
        transcript=t.transcript,
        submitted_text=t.submitted_text,
        stt_mock=t.stt_mock,
        reply_text=t.reply_text,
        tts_mock=t.tts_mock,
        audio_stored=t.audio_stored,
        duration_seconds=t.duration_seconds,
        created_at=t.created_at,
    )


def _owned_session(db: Session, user: User, session_id: str) -> VoiceSession:
    s = db.query(VoiceSession).filter(VoiceSession.id == session_id, VoiceSession.user_id == user.id).first()
    if s is None:
        raise HTTPException(status_code=404, detail="voice session not found")
    return s


@router.post("/api/voice/sessions", response_model=VoiceSessionOut, status_code=201)
def create_session(
    body: VoiceSessionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VoiceSessionOut:
    if body.persona not in VOICE_PERSONAS:
        raise HTTPException(status_code=422, detail=f"persona must be one of {list(VOICE_PERSONAS)}")
    if not body.consent:
        raise HTTPException(status_code=422, detail="microphone consent is required to start a voice session")
    session = VoiceSession(user_id=current_user.id, persona=body.persona, consent=True, language_hint=body.language_hint)
    db.add(session)
    db.commit()
    db.refresh(session)
    return _out_session(session)


@router.get("/api/voice/sessions", response_model=list[VoiceSessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[VoiceSessionOut]:
    rows = (
        db.query(VoiceSession)
        .filter(VoiceSession.user_id == current_user.id)
        .order_by(VoiceSession.created_at.desc())
        .all()
    )
    return [
        _out_session(s, db.query(VoiceTurn).filter(VoiceTurn.session_id == s.id).count()) for s in rows
    ]


@router.delete("/api/voice/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    db.delete(_owned_session(db, current_user, session_id))
    db.commit()
    return None


@router.post("/api/voice/sessions/{session_id}/turns", response_model=VoiceTurnOut, status_code=201)
async def upload_turn(
    session_id: str,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VoiceTurnOut:
    settings = get_settings()
    session = _owned_session(db, current_user, session_id)
    if not session.consent:
        raise HTTPException(status_code=403, detail="voice consent was revoked for this session")
    content_type = (audio.content_type or "").lower()
    if not content_type.startswith("audio/"):
        raise HTTPException(status_code=422, detail=f"expected an audio upload, got {audio.content_type!r}")
    raw = await audio.read()
    if not raw:
        raise HTTPException(status_code=422, detail="empty audio: nothing was recorded (silence or permission issue)")
    if len(raw) > settings.voice_max_bytes:
        raise HTTPException(status_code=422, detail=f"audio exceeds {settings.voice_max_bytes} bytes; keep it under {settings.voice_max_seconds}s")
    duration = wav_duration_seconds(raw)
    if duration is not None:
        if duration <= 0.05:
            raise HTTPException(status_code=422, detail="audio is effectively silent; record again")
        if duration > settings.voice_max_seconds:
            raise HTTPException(status_code=422, detail=f"audio is {duration:.1f}s, over the {settings.voice_max_seconds}s limit")

    try:
        stt = get_stt(settings.stt_provider, settings)
    except VoiceProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    try:
        transcript, is_mock = stt.transcribe(raw, content_type=content_type, language_hint=session.language_hint)
    except VoiceProviderError as exc:
        raise HTTPException(status_code=502 if settings.stt_provider != "mock" else 422, detail=str(exc)) from exc
    # Raw bytes drop out of scope here: never persisted.
    del raw

    sequence = db.query(VoiceTurn).filter(VoiceTurn.session_id == session.id).count()
    turn = VoiceTurn(
        session_id=session.id,
        sequence=sequence,
        transcript=transcript,
        stt_mock=is_mock,
        duration_seconds=duration,
        audio_stored=False,
    )
    db.add(turn)
    db.commit()
    db.refresh(turn)
    return _out_turn(turn)


@router.post("/api/voice/sessions/{session_id}/typed-turns", response_model=VoiceTurnOut, status_code=201)
def create_typed_turn(
    session_id: str,
    body: VoiceTypedTurnIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VoiceTurnOut:
    """Text fallback / test path: creates a turn without audio.

    Labeled input_mode="typed" so transcripts are never mistaken for STT
    output. Follows the same edit-then-submit flow as voice turns.
    """
    session = _owned_session(db, current_user, session_id)
    if not session.consent:
        raise HTTPException(status_code=403, detail="voice consent was revoked for this session")
    sequence = db.query(VoiceTurn).filter(VoiceTurn.session_id == session.id).count()
    turn = VoiceTurn(
        session_id=session.id,
        sequence=sequence,
        input_mode="typed",
        transcript=body.text.strip(),
        stt_mock=False,
        audio_stored=False,
    )
    db.add(turn)
    db.commit()
    db.refresh(turn)
    return _out_turn(turn)


@router.get("/api/voice/sessions/{session_id}/turns", response_model=list[VoiceTurnOut])
def list_turns(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[VoiceTurnOut]:
    session = _owned_session(db, current_user, session_id)
    rows = (
        db.query(VoiceTurn)
        .filter(VoiceTurn.session_id == session.id)
        .order_by(VoiceTurn.sequence.asc())
        .all()
    )
    return [_out_turn(t) for t in rows]


@router.post("/api/voice/turns/{turn_id}/submit", response_model=VoiceSubmitOut)
def submit_turn(
    turn_id: str,
    body: VoiceSubmitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VoiceSubmitOut:
    settings = get_settings()
    turn = (
        db.query(VoiceTurn)
        .join(VoiceSession, VoiceTurn.session_id == VoiceSession.id)
        .filter(VoiceTurn.id == turn_id, VoiceSession.user_id == current_user.id)
        .first()
    )
    if turn is None:
        raise HTTPException(status_code=404, detail="voice turn not found")
    session = turn.session
    text = (body.edited_text or turn.transcript).strip()
    if not text:
        raise HTTPException(status_code=422, detail="nothing to submit: transcript is empty, edit it first or re-record")
    turn.submitted_text = text

    try:
        provider = get_provider(settings.llm_provider, settings)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"LLM provider unavailable: {exc}") from exc
    try:
        _conv, reply = respond(db, current_user, provider, persona=session.persona, content=text)
    except EnrollmentRequired as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        tts = get_tts(settings.tts_provider, settings)
        wav, tts_mock = tts.synthesize(reply.content, language_hint=session.language_hint)
        audio_b64 = base64.b64encode(wav).decode()
    except VoiceProviderError:
        # Spoken reply is best-effort: the text reply always survives.
        wav, tts_mock, audio_b64 = b"", True, None

    turn.reply_text = reply.content
    turn.tts_mock = tts_mock
    db.commit()
    db.refresh(turn)
    return VoiceSubmitOut(
        turn=_out_turn(turn),
        reply_text=reply.content,
        reply_mock=getattr(provider, "name", "") == "mock",
        audio_wav_base64=audio_b64,
        audio_mock=tts_mock,
    )
