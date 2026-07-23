"""LangGraph nodes.

The whole consultation is ONE model call. `consult` streams that call; `parse` is
pure Python (no LLM) and splits the result into the narrative plus the insight cards.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from ..config import get_settings
from ..llm import (
    AUTH,
    NOT_FOUND,
    build_llm,
    classify_error,
    extract_json,
    friendly_error,
    model_plan,
)
from ..schemas import (
    Diagnosis,
    Differential,
    Investigation,
    PatientSummary,
    RedFlag,
    Reference,
    Soap,
)
from . import prompts
from .state import ClinicalState

log = logging.getLogger(__name__)


def _context(state: ClinicalState) -> str:
    transcript = state.get("transcript", "").strip()
    latest = state.get("latest", "").strip()
    parts = []
    if transcript:
        parts.append(f"CONSULTATION SO FAR:\n{transcript}")
    if latest:
        parts.append(f"CLINICIAN'S LATEST INPUT:\n{latest}")
    return "\n\n".join(parts) or "No information provided yet."


def _chunk_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):  # providers that chunk as content blocks
        return "".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        )
    return ""


class ModelUnavailable(RuntimeError):
    """All attempts failed. Carries a message safe to show in the UI."""


async def consult(state: ClinicalState) -> dict:
    """The single LLM call, with retry + model fallback on transient provider errors.

    Providers return 503 "high demand" fairly often on popular models. We retry the
    primary model, then fall back to configured alternatives.

    Retrying is only safe *before* any token has been emitted — LangGraph forwards
    tokens to the client as they arrive, so restarting mid-stream would duplicate
    text. If a failure happens after partial output we keep what we have.
    """
    settings = get_settings()
    provider = (state.get("provider") or settings.provider or "gemini").lower()
    primary = state.get("model") or settings.default_model_for(provider)
    plan = model_plan(primary, settings.fallbacks_for(provider), settings.max_retries)

    messages = [
        SystemMessage(content=prompts.CONSULT_SYSTEM),
        HumanMessage(content=_context(state)),
    ]

    last_exc: BaseException | None = None
    last_model = primary

    for attempt, model in enumerate(plan):
        last_model = model
        parts: list[str] = []
        try:
            llm = build_llm(
                provider=provider,
                model=model,
                temperature=state.get("temperature"),
                streaming=True,
            )
            async for chunk in llm.astream(messages):
                text = _chunk_text(chunk.content)
                if text:
                    parts.append(text)

            if attempt:
                log.info("consult succeeded on attempt %d using %s", attempt + 1, model)
            return {"raw": "".join(parts)}

        except asyncio.CancelledError:
            raise  # client disconnected — don't swallow

        except Exception as exc:  # noqa: BLE001
            kind = classify_error(exc)
            last_exc = exc

            if parts:
                # Tokens already reached the client; a retry would duplicate them.
                log.warning("stream failed after %d chunks on %s: %s", len(parts), model, exc)
                return {"raw": "".join(parts)}

            if kind in (AUTH, NOT_FOUND):
                raise ModelUnavailable(friendly_error(exc, model, provider)) from exc

            if attempt == len(plan) - 1:
                break

            delay = settings.retry_base_delay * (2**attempt)
            log.warning(
                "consult attempt %d/%d failed on %s (%s) — retrying in %.1fs",
                attempt + 1,
                len(plan),
                model,
                kind,
                delay,
            )
            await asyncio.sleep(delay)

    raise ModelUnavailable(
        friendly_error(last_exc or RuntimeError("unknown"), last_model, provider)
    ) from last_exc


def _coerce(model: type[BaseModel], value: Any) -> Any:
    """Validate one section, returning None instead of raising on bad shape."""
    try:
        return model.model_validate(value)
    except Exception as exc:
        log.warning("discarding malformed %s: %s", model.__name__, exc)
        return None


def _coerce_list(model: type[BaseModel], value: Any) -> list:
    if not isinstance(value, list):
        return []
    out = []
    for item in value:
        parsed = _coerce(model, item)
        if parsed is not None:
            out.append(parsed)
    return out


def parse(state: ClinicalState) -> dict:
    """Split the single response into narrative + structured insights. No LLM call."""
    raw = state.get("raw", "")
    narrative, _, tail = raw.partition(prompts.DELIMITER)

    result: dict = {"assessment": narrative.strip()}

    if not tail.strip():
        log.warning(
            "model response contained no %s block (response was %d chars)",
            prompts.DELIMITER,
            len(raw),
        )
        return result

    try:
        data = extract_json(tail)
    except Exception as exc:
        # Log enough to diagnose which part of the JSON the model got wrong.
        log.warning(
            "could not parse insights JSON: %s\n--- tail (first 600 chars) ---\n%s\n--- end ---",
            exc,
            tail.strip()[:600],
        )
        return result

    if not isinstance(data, dict):
        return result

    patient = _coerce(PatientSummary, data.get("patient"))
    if patient is not None:
        result["patient"] = patient

    diagnosis = _coerce(Diagnosis, data.get("diagnosis"))
    result["diagnosis"] = diagnosis

    differentials = _coerce_list(Differential, data.get("differentials"))
    result["differentials"] = sorted(differentials, key=lambda d: d.confidence, reverse=True)

    result["investigations"] = _coerce_list(Investigation, data.get("investigations"))
    result["redFlags"] = _coerce_list(RedFlag, data.get("redFlags"))

    follow_ups = data.get("followUps")
    result["followUps"] = [str(q) for q in follow_ups] if isinstance(follow_ups, list) else []

    soap = _coerce(Soap, data.get("soap"))
    result["soap"] = soap if soap is not None else Soap()

    result["references"] = _coerce_list(Reference, data.get("references"))

    return result
