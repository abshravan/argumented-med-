"""LangGraph nodes.

The whole consultation is ONE model call. `consult` streams that call; `parse` is
pure Python (no LLM) and splits the result into the narrative plus the insight cards.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel

from ..config import get_settings
from ..llm import (
    FATAL,
    INVALID,
    RATE_LIMIT,
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


async def consult(state: ClinicalState, config: RunnableConfig) -> dict:
    """The single LLM call, with retry + model fallback on transient provider errors.

    Providers return 503 "high demand" fairly often on popular models. We retry the
    primary model, then fall back to configured alternatives.

    Retrying is only safe *before* any token has been emitted — LangGraph forwards
    tokens to the client as they arrive, so restarting mid-stream would duplicate
    text. If a failure happens after partial output we keep what we have.

    NOTE: ``config`` MUST be forwarded to ``astream``. On Python <= 3.10 LangChain
    cannot propagate the callback manager through contextvars, so without it
    ``stream_mode="messages"`` receives no tokens and the chat stays empty while the
    insights panel still fills in.
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
    deadline = asyncio.get_event_loop().time() + settings.request_budget_seconds
    allow_thinking_budget = True
    attempt = -1

    while attempt + 1 < len(plan):
        attempt += 1
        model = plan[attempt]
        last_model = model
        parts: list[str] = []
        try:
            llm = build_llm(
                provider=provider,
                model=model,
                temperature=state.get("temperature"),
                streaming=True,
                allow_thinking_budget=allow_thinking_budget,
            )
            finish_reason = ""
            async for chunk in llm.astream(messages, config=config):
                text = _chunk_text(chunk.content)
                if text:
                    parts.append(text)
                meta = getattr(chunk, "response_metadata", None) or {}
                finish_reason = meta.get("finish_reason") or finish_reason

            if attempt:
                log.info("consult succeeded on attempt %d using %s", attempt + 1, model)
            return {"raw": "".join(parts), "finish_reason": str(finish_reason)}

        except asyncio.CancelledError:
            raise  # client disconnected — don't swallow

        except Exception as exc:  # noqa: BLE001
            kind = classify_error(exc)
            last_exc = exc

            if parts:
                # Tokens already reached the client; a retry would duplicate them.
                log.warning("stream failed after %d chunks on %s: %s", len(parts), model, exc)
                return {"raw": "".join(parts)}

            # A 400 caused by thinking_budget is recoverable: drop it and retry once.
            if (
                kind == INVALID
                and allow_thinking_budget
                and settings.gemini_thinking_budget is not None
                and provider == "gemini"
            ):
                log.warning(
                    "%s rejected thinking_budget=%s (400) — retrying without it",
                    model,
                    settings.gemini_thinking_budget,
                )
                allow_thinking_budget = False
                attempt -= 1  # re-run this same model
                continue

            if kind in FATAL:
                raise ModelUnavailable(friendly_error(exc, model, provider)) from exc

            # Quota is not going to free up in a couple of seconds. Skip the remaining
            # attempts on THIS model and move straight to the next distinct one.
            if kind == RATE_LIMIT:
                log.warning("quota exhausted on %s — skipping to next model", model)
                while attempt + 1 < len(plan) and plan[attempt + 1] == model:
                    attempt += 1
                continue

            if attempt >= len(plan) - 1:
                break

            delay = settings.retry_base_delay * (2**attempt)
            if asyncio.get_event_loop().time() + delay > deadline:
                log.warning("consult budget of %.0fs exhausted", settings.request_budget_seconds)
                break

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
    """Split the single response into narrative + structured insights. No LLM call.

    Always returns the full key set — even on failure — so the UI's insight cards
    resolve instead of showing skeleton loaders forever.
    """
    raw = state.get("raw", "")
    finish_reason = (state.get("finish_reason") or "").upper()
    narrative, _, tail = raw.partition(prompts.DELIMITER)

    # Safe defaults for every card.
    result: dict = {
        "assessment": narrative.strip(),
        "diagnosis": None,
        "differentials": [],
        "investigations": [],
        "redFlags": [],
        "followUps": [],
        "soap": Soap(),
        "references": [],
        "notice": "",
    }

    truncated = finish_reason in {"MAX_TOKENS", "LENGTH"}

    if not tail.strip():
        log.warning(
            "model response contained no %s block (response was %d chars, finish_reason=%s)",
            prompts.DELIMITER,
            len(raw),
            finish_reason or "unknown",
        )
        result["notice"] = (
            "The model stopped before producing the insights block — its output limit was "
            "reached. Raise MAX_OUTPUT_TOKENS in backend/.env, or set GEMINI_THINKING_BUDGET=0 "
            "(thinking models spend that budget on reasoning)."
            if truncated
            else "The model replied without the insights block, so the panel is empty. "
            "Try again, or switch model in Settings."
        )
        return result

    try:
        data = extract_json(tail)
    except Exception as exc:
        # Log enough to diagnose which part of the JSON the model got wrong.
        log.warning(
            "could not parse insights JSON (finish_reason=%s): %s\n"
            "--- tail (first 600 chars) ---\n%s\n--- end ---",
            finish_reason or "unknown",
            exc,
            tail.strip()[:600],
        )
        result["notice"] = (
            "The insights JSON was cut off by the model's output limit. Raise "
            "MAX_OUTPUT_TOKENS in backend/.env."
            if truncated
            else "The model returned malformed insights JSON, so the panel is empty."
        )
        return result

    if not isinstance(data, dict):
        result["notice"] = "The model returned an unexpected insights shape."
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
