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


def repair_json(text: str) -> str:
    """Best-effort cleanup of near-JSON emitted by an LLM.

    Handles the three things models actually get wrong: ``//`` and ``/* */`` comments,
    trailing commas, and truncated output (unclosed strings/brackets when the response
    hits the token limit). The scan is string-aware, so a ``//`` inside a URL or a comma
    inside a sentence is left alone.
    """
    out: list[str] = []
    stack: list[str] = []
    in_string = False
    escaped = False
    i = 0
    n = len(text)

    while i < n:
        char = text[i]

        if in_string:
            out.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            i += 1
            continue

        if char == '"':
            in_string = True
            out.append(char)
            i += 1
            continue

        # Comments (only outside strings)
        if char == "/" and i + 1 < n:
            if text[i + 1] == "/":
                while i < n and text[i] != "\n":
                    i += 1
                continue
            if text[i + 1] == "*":
                end = text.find("*/", i + 2)
                i = n if end == -1 else end + 2
                continue

        if char in "{[":
            stack.append("}" if char == "{" else "]")
            out.append(char)
            i += 1
            continue

        if char in "}]":
            if stack:
                stack.pop()
            out.append(char)
            i += 1
            continue

        # Trailing comma: drop if the next non-space char closes a container
        if char == ",":
            j = i + 1
            while j < n and text[j].isspace():
                j += 1
            if j < n and text[j] in "}]":
                i += 1
                continue
            out.append(char)
            i += 1
            continue

        out.append(char)
        i += 1

    body = "".join(out)

    # Truncation repair: close a dangling string, drop a dangling key/comma, close brackets.
    if in_string:
        body += '"'
    body = body.rstrip()
    while body and (body[-1] in ",:" or body.endswith('"":')):
        body = body[:-1].rstrip()
        # A dangling `"key":` leaves an orphan key — remove it too.
        match = re.search(r',\s*"[^"]*"$', body)
        if match:
            body = body[: match.start()].rstrip()
    body += "".join(reversed(stack))
    return body


def extract_json(text: str) -> Any:
    """Pull a JSON object out of a model response that may be fenced, chatty or malformed."""
    candidates: list[str] = []

    match = _JSON_BLOCK.search(text)
    if match:
        candidates.append(match.group(1))

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        candidates.append(text[start : end + 1])
    if start != -1:
        candidates.append(text[start:])  # truncated: no closing brace at all

    if not candidates:
        raise ValueError("No JSON object found in model output")

    # Strict first, then repaired.
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    errors = []
    for candidate in candidates:
        try:
            return json.loads(repair_json(candidate))
        except json.JSONDecodeError as exc:
            errors.append(str(exc))

    raise ValueError(f"Could not parse JSON even after repair: {errors[0] if errors else 'n/a'}")
