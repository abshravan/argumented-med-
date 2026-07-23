"""Model provider factory + JSON extraction.

Two providers are supported:
  * ``gemini``     — Google AI Studio via ``langchain-google-genai``
  * ``openrouter`` — any OpenRouter model via the OpenAI-compatible endpoint

Note: there is deliberately no ``with_structured_output`` helper here. Native
structured output costs an extra round-trip when it falls back, and the app is
built around a single request per message — the model returns its JSON inline
and :func:`extract_json` pulls it out.
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional

from langchain_core.language_models.chat_models import BaseChatModel

from .config import get_settings


class ProviderError(RuntimeError):
    """Raised when a provider is requested but not configured."""


def build_llm(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    streaming: bool = False,
) -> BaseChatModel:
    settings = get_settings()
    provider = (provider or settings.provider or "gemini").lower()
    temperature = settings.temperature if temperature is None else temperature

    if provider == "gemini":
        if not settings.google_api_key:
            raise ProviderError(
                "GOOGLE_API_KEY is not set. Add it to backend/.env or switch the provider to 'openrouter'."
            )
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=model or settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=temperature,
            max_output_tokens=settings.max_output_tokens,
            disable_streaming=not streaming,
        )

    if provider == "openrouter":
        if not settings.openrouter_api_key:
            raise ProviderError(
                "OPENROUTER_API_KEY is not set. Add it to backend/.env or switch the provider to 'gemini'."
            )
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=model or settings.openrouter_model,
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            temperature=temperature,
            max_tokens=settings.max_output_tokens,
            streaming=streaming,
            default_headers={
                "HTTP-Referer": settings.openrouter_site_url,
                "X-Title": settings.openrouter_app_name,
            },
        )

    raise ProviderError(f"Unknown provider '{provider}'. Use 'gemini' or 'openrouter'.")


# --------------------------------------------------------------------------
# JSON extraction
# --------------------------------------------------------------------------
_JSON_BLOCK = re.compile(r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```", re.DOTALL)


def extract_json(text: str) -> Any:
    """Pull a JSON object out of a model response that may be fenced or chatty."""
    match = _JSON_BLOCK.search(text)
    if match:
        return json.loads(match.group(1))

    # Fall back to the outermost {...} span.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        return json.loads(text[start : end + 1])

    raise ValueError("No JSON object found in model output")
