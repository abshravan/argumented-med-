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
# Error classification
# --------------------------------------------------------------------------
#: Errors worth retrying / falling back on. Everything else fails fast.
TRANSIENT = "transient"
AUTH = "auth"
NOT_FOUND = "not_found"
RATE_LIMIT = "rate_limit"
UNKNOWN = "unknown"


def classify_error(exc: BaseException) -> str:
    """Bucket a provider exception so we know whether retrying can help."""
    text = f"{type(exc).__name__} {exc}".lower()

    if any(k in text for k in ("401", "403", "api key", "unauthenticated", "permission denied")):
        return AUTH
    if any(k in text for k in ("404", "not found", "does not exist", "is not supported")):
        return NOT_FOUND
    if any(k in text for k in ("429", "resource_exhausted", "rate limit", "quota")):
        return RATE_LIMIT
    if any(
        k in text
        for k in (
            "503",
            "unavailable",
            "high demand",
            "overloaded",
            "500",
            "internal error",
            "502",
            "504",
            "timeout",
            "timed out",
            "connection",
        )
    ):
        return TRANSIENT
    return UNKNOWN


def friendly_error(exc: BaseException, model: str, provider: str) -> str:
    """A message a clinician-facing UI can actually show."""
    kind = classify_error(exc)
    if kind == AUTH:
        key = "GOOGLE_API_KEY" if provider == "gemini" else "OPENROUTER_API_KEY"
        return f"Authentication failed for {provider}. Check {key} in backend/.env."
    if kind == NOT_FOUND:
        return (
            f"The model '{model}' was not found on {provider}. "
            "Check the model id in Settings (or GEMINI_MODEL / OPENROUTER_MODEL in backend/.env)."
        )
    if kind == RATE_LIMIT:
        return (
            f"Rate limit or quota reached on {provider} for '{model}'. "
            "Wait a moment, or switch model/provider in Settings."
        )
    if kind == TRANSIENT:
        return (
            f"'{model}' is temporarily unavailable on {provider} (the provider reported high "
            "demand). Retries and fallback models were exhausted — try again shortly, or pick a "
            "different model in Settings."
        )
    return f"{type(exc).__name__}: {exc}"


def model_plan(primary: str, fallbacks: list[str], retries: int) -> list[str]:
    """Attempt order: the primary a few times, then each distinct fallback once."""
    plan = [primary] * max(1, retries)
    for candidate in fallbacks:
        if candidate and candidate != primary and candidate not in plan[retries:]:
            plan.append(candidate)
    return plan


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
