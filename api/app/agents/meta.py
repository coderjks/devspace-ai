"""Meta Model API adapter (OpenAI-compatible chat completions).

Uses only documented public API shape; base URL defaults to the documented
https://api.meta.ai/v1 and is overridable. The key and model ID come from
environment settings and are never logged. Fails closed when unconfigured.
Secrets must never reach logs, errors, or model prompts.
"""

import httpx

from app.agents.provider import LLMProvider, LLMResponse, ProviderError


class MetaAdapter(LLMProvider):
    name = "meta"

    def __init__(self, *, base_url: str, api_key: str, model: str, timeout_s: float = 30.0) -> None:
        if not api_key:
            raise ProviderError("MODEL_API_KEY is not configured")
        if not model:
            raise ProviderError("MODEL_ID is not configured")
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._model = model
        self._timeout_s = timeout_s

    def respond(
        self,
        *,
        persona: str,
        system_prompt: str,
        context: str,
        history: list[dict[str, str]],
        user_message: str,
    ) -> LLMResponse:
        messages = [{"role": "system", "content": f"{system_prompt}\n\nStudent context:\n{context}"}]
        messages.extend(history[-20:])
        messages.append({"role": "user", "content": user_message})
        try:
            resp = httpx.post(
                f"{self._base_url}/chat/completions",
                headers={"Authorization": "Bearer " + self._api_key, "Content-Type": "application/json"},
                json={"model": self._model, "messages": messages, "temperature": 0.3},
                timeout=self._timeout_s,
            )
            resp.raise_for_status()
            data = resp.json()
            text = (data["choices"][0]["message"].get("content") or "").strip()
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderError("model provider request failed") from exc
        if not text:
            raise ProviderError("model provider returned an empty response")
        return LLMResponse(text=text, model=self._model, mock=False)
