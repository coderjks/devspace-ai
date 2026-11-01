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
import math
import struct
import wave
from typing import Protocol

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


class LiveTTSStub:
    """Fail-closed placeholder until a verified TTS provider is wired (Q3)."""

    name = "live-tts"

    def synthesize(self, text: str, *, language_hint: str | None = None) -> tuple[bytes, bool]:
        raise VoiceProviderError("No live TTS provider configured (TTS_PROVIDER/TTS_API_KEY).")


def get_stt(provider_name: str, settings) -> STTProvider:
    if provider_name == "mock":
        return MockSTT()
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
