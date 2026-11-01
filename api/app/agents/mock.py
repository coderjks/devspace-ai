"""Explicit mock adapter. Deterministic, labeled replies for development and
for running Phase 03 without Meta credentials. Every reply is grounded in the
provided context string — never invented project state."""

from app.agents.provider import LLMProvider, LLMResponse


class MockAdapter(LLMProvider):
    name = "mock"
    mock_model = "mock-teammate-v1"

    def respond(
        self,
        *,
        persona: str,
        system_prompt: str,
        context: str,
        history: list[dict[str, str]],
        user_message: str,
    ) -> LLMResponse:
        lowered = user_message.strip().lower()
        focus = "your sprint"
        for ln in context.splitlines():
            if ln.strip().startswith("Current task:"):
                focus = ln.split("Current task:", 1)[1].strip()
                break
        if focus in ("none", ""):
            focus = next((ln for ln in context.splitlines() if ln.strip()), "your sprint")
        if "raise-error" in lowered:
            # Deterministic failure path for unavailable-provider tests.
            from app.agents.provider import ProviderError

            raise ProviderError("mock provider forced failure")
        if "blocker" in lowered or "blocked" in lowered or "stuck" in lowered:
            text = (
                f"Thanks for flagging that. I noted it against {focus}. "
                "Tell me what you tried so far and where exactly it fails, and "
                "we will break it into a smaller next step."
            )
        elif "test" in lowered:
            text = (
                f"Good instinct to check the tests first. For {focus}, start with "
                "the smallest failing case from the acceptance criteria, reproduce it, "
                "then fix one thing at a time."
            )
        elif "?" in user_message:
            text = (
                f"Good question about {focus}. Here is how I would think about it: "
                "restate the goal in one sentence, list what you know, then name the "
                "single unknown to resolve next. What is that unknown for you?"
            )
        else:
            text = (
                f"Noted — {focus} is the current focus. What is the smallest concrete "
                "step you can take on it in the next 30 minutes?"
            )
        return LLMResponse(text=f"[mock] {text}", mock=True, model=self.mock_model)
