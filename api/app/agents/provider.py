"""Typed LLM provider interface and errors. No network code here."""

from typing import Protocol


class ProviderError(RuntimeError):
    """The model provider is unavailable or misconfigured. Never carries secrets."""


class LLMResponse:
    def __init__(self, text: str, model: str, mock: bool = False) -> None:
        self.text = text
        self.model = model
        self.mock = mock


class LLMProvider(Protocol):
    """Single interface every model backend implements.

    Implementations must never log or return credentials. An empty or
    whitespace-only response is treated as a provider failure upstream.
    """

    name: str

    def respond(
        self,
        *,
        persona: str,
        system_prompt: str,
        context: str,
        history: list[dict[str, str]],
        user_message: str,
    ) -> LLMResponse:
        """Generate one teammate reply. history entries are {role, content}."""
        ...
