"""STT/TTS provider interfaces with explicit mock adapters (Phase 08).

Live adapters are fail-closed stubs: they raise ProviderNotConfigured until a
verified provider is wired. Mock adapters are deterministic and labeled:

- MockSTT transcribes ONLY synthetic WAV test fixtures (a marker embedded in
  the audio comment field). Real microphone audio in mock mode is rejected
  with a clear error pointing at text fallback — never hallucinated.
- MockTTS synthesizes a short, clearly-labeled WAV tone (valid audio bytes so
  the playback pipeline works end-to-end) instead of speech.

No raw audio is persisted by any adapter.
"""

from __future__ import annotations

import io
import json
import math
import struct
import wave
from typing import Protocol

import httpx

MOCK_FIXTURE_MARKER = b"devspace-test-fixture"
MOCK_TRANSCRIPT = "Mock transcription of the test fixture: yesterday I set up the repo, today I will build the ticket API, no blockers."
MOCK_SAMPLE_RATE = 16000


class VoiceProviderError(RuntimeError):
    pass


class STTProvider(Protocol):
    name: str

    def transcribe(self, audio: bytes, *, content_type: str, language_hint: str | None = None) -> tuple[str, bool]:
        """Return (transcript, is_mock). Raise VoiceProviderError when unavailable."""
        ...


class TTSProvider(Protocol):
    name: str

    def synthesize(self, text: str, *, language_hint: str | None = None) -> tuple[bytes, bool]:
        """Return (wav_bytes, is_mock). Raise VoiceProviderError when unavailable."""
        ...


def make_fixture_wav(seconds: float = 1.0) -> bytes:
    """Generate a synthetic WAV test fixture the mock STT accepts."""
    frames = int(MOCK_SAMPLE_RATE * seconds)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(MOCK_SAMPLE_RATE)
        for i in range(frames):
            sample = int(1000 * math.sin(2 * math.pi * 440 * i / MOCK_SAMPLE_RATE))
            w.writeframes(struct.pack("<h", sample))
    raw = buf.getvalue()
    return raw + MOCK_FIXTURE_MARKER


def wav_duration_seconds(audio: bytes) -> float | None:
    """Parse WAV duration; None when the bytes are not a readable WAV."""
    try:
        with wave.open(io.BytesIO(audio), "rb") as w:
            frames = w.getnframes()
            rate = w.getframerate()
            if rate <= 0:
                return None
            return frames / float(rate)
    except (wave.Error, EOFError, ValueError):
        return None


class MockSTT:
    name = "mock-stt"

    def transcribe(self, audio: bytes, *, content_type: str, language_hint: str | None = None) -> tuple[str, bool]:
        if MOCK_FIXTURE_MARKER not in audio:
            raise VoiceProviderError(
                "Mock STT transcribes test fixtures only. Connect a live STT provider or use text input."
            )
        return MOCK_TRANSCRIPT, True


class MockTTS:
    name = "mock-tts"

    def synthesize(self, text: str, *, language_hint: str | None = None) -> tuple[bytes, bool]:
        # Short labeled tone: valid WAV so playback works, obviously not speech.
        seconds = min(3.0, max(0.5, len(text) / 200.0))
        frames = int(MOCK_SAMPLE_RATE * seconds)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(MOCK_SAMPLE_RATE)
            for i in range(frames):
                sample = int(2000 * math.sin(2 * math.pi * 660 * i / MOCK_SAMPLE_RATE))
                w.writeframes(struct.pack("<h", sample))
        return buf.getvalue(), True


class LiveSTTStub:
    """Fail-closed placeholder until a verified STT provider is wired (Q3)."""

    name = "live-stt"

    def transcribe(self, audio: bytes, *, content_type: str, language_hint: str | None = None) -> tuple[str, bool]:
        raise VoiceProviderError("No live STT provider configured (STT_PROVIDER/STT_API_KEY).")


LANGUAGE_NAMES = {"en": "English", "hi": "Hindi"}


class MetaSTT:
    """Meta Muse Voice Transcribe via POST {base}/asr/transcribe.

    Push-to-talk: one uploaded clip is one turn. Requires 16/24 kHz mono
    integer PCM WAV (what the web client encodes from the mic). Follows the
    public request/response schema at dev.meta.ai/docs/api-reference/voice —
    do not invent fields.
    """

    name = "meta-stt"

    def __init__(self, api_key: str, base_url: str, model: str) -> None:
        self._api_key = api_key
        self._endpoint = base_url.rstrip("/") + "/asr/transcribe"
        self._model = model

    def transcribe(self, audio: bytes, *, content_type: str, language_hint: str | None = None) -> tuple[str, bool]:
        try:
            with wave.open(io.BytesIO(audio), "rb") as w:
                if w.getnchannels() != 1 or w.getsampwidth() != 2 or w.getframerate() not in (16000, 24000):
                    raise VoiceProviderError(
                        "Meta STT needs 16/24 kHz mono PCM WAV; the web client converts the mic recording automatically."
                    )
        except (wave.Error, EOFError, ValueError) as exc:
            raise VoiceProviderError("Meta STT needs WAV audio; the upload was not a readable WAV file.") from exc
        request_part: dict[str, object] = {"model": self._model, "audioEncoding": "WAV", "mode": "PUSH_TO_TALK"}
        if language_hint in LANGUAGE_NAMES:
            request_part["languageBias"] = [LANGUAGE_NAMES[language_hint]]
        try:
            res = httpx.post(
                self._endpoint,
                headers={"Authorization": f"Bearer {self._api_key}", "Accept": "application/json"},
                files={
                    "request": (None, json.dumps(request_part), "application/json"),
                    "audio": ("turn.wav", audio, "audio/wav"),
                },
                timeout=60,
            )
            res.raise_for_status()
            transcript = res.json().get("transcript", "")
        except VoiceProviderError:
            raise
        except Exception as exc:
            raise VoiceProviderError(f"Meta STT request failed: {exc}") from exc
        return (transcript or "").strip(), False


class LiveTTSStub:
    """Fail-closed placeholder until a verified TTS provider is wired (Q3)."""

    name = "live-tts"

    def synthesize(self, text: str, *, language_hint: str | None = None) -> tuple[bytes, bool]:
        raise VoiceProviderError("No live TTS provider configured (TTS_PROVIDER/TTS_API_KEY).")


def get_stt(provider_name: str, settings) -> STTProvider:
    if provider_name == "mock":
        return MockSTT()
    if provider_name == "meta":
        key = getattr(settings, "stt_api_key", "") or getattr(settings, "model_api_key", "")
        if not key:
            raise VoiceProviderError("STT_API_KEY (or MODEL_API_KEY on the same Meta account) is not set.")
        return MetaSTT(
            api_key=key,
            base_url=getattr(settings, "model_api_base_url", "https://api.meta.ai/v1"),
            model=getattr(settings, "stt_model", "") or "muse-voice-transcribe-1.0",
        )
    if provider_name == "live":
        if not getattr(settings, "stt_api_key", ""):
            raise VoiceProviderError("STT_API_KEY is not set.")
        return LiveSTTStub()
    raise VoiceProviderError(f"unknown STT provider: {provider_name}")


def get_tts(provider_name: str, settings) -> TTSProvider:
    if provider_name == "mock":
        return MockTTS()
    if provider_name == "live":
        if not getattr(settings, "tts_api_key", ""):
            raise VoiceProviderError("TTS_API_KEY is not set.")
        return LiveTTSStub()
    raise VoiceProviderError(f"unknown TTS provider: {provider_name}")
