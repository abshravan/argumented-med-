"""Model provider factory + a resilient structured-output helper.

Two providers are supported:
  * ``gemini``     — Google AI Studio via ``langchain-google-genai``
  * ``openrouter`` — any OpenRouter model via the OpenAI-compatible endpoint
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional, Type, TypeVar

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from .config import get_settings

T = TypeVar("T", bound=BaseModel)


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
# Structured output
# --------------------------------------------------------------------------
_JSON_BLOCK = re.compile(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", re.DOTALL)


def _extract_json(text: str) -> Any:
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


async def structured(
    llm: BaseChatModel,
    schema: Type[T],
    system: str,
    user: str,
) -> T:
    """Ask the model for a ``schema``-shaped answer.

    Tries native structured output first (function calling / response schema);
    falls back to prompted JSON with tolerant parsing, since OpenRouter model
    support for tool calling varies by model.
    """
    messages = [SystemMessage(content=system), HumanMessage(content=user)]

    try:
        result = await llm.with_structured_output(schema).ainvoke(messages)
        if isinstance(result, schema):
            return result
        if isinstance(result, dict):
            return schema.model_validate(result)
    except Exception:
        pass  # fall through to prompted JSON

    schema_json = json.dumps(schema.model_json_schema(), indent=2)
    fallback_system = (
        f"{system}\n\n"
        "Respond with a SINGLE valid JSON object and nothing else — no prose, no code fence.\n"
        f"It must conform to this JSON Schema:\n{schema_json}"
    )
    response = await llm.ainvoke(
        [SystemMessage(content=fallback_system), HumanMessage(content=user)]
    )
    text = response.content if isinstance(response.content, str) else str(response.content)
    return schema.model_validate(_extract_json(text))
