"""LangGraph nodes.

The whole consultation is ONE model call. `consult` streams that call; `parse` is
pure Python (no LLM) and splits the result into the narrative plus the insight cards.
"""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from ..llm import build_llm, extract_json
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


async def consult(state: ClinicalState) -> dict:
    """The single LLM call. Streamed so the UI can render tokens as they arrive."""
    llm = build_llm(
        provider=state.get("provider"),
        model=state.get("model"),
        temperature=state.get("temperature"),
        streaming=True,
    )
    messages = [
        SystemMessage(content=prompts.CONSULT_SYSTEM),
        HumanMessage(content=_context(state)),
    ]

    parts: list[str] = []
    async for chunk in llm.astream(messages):
        content = chunk.content
        if isinstance(content, str):
            parts.append(content)
        elif isinstance(content, list):  # providers that chunk as content blocks
            parts.append(
                "".join(
                    block.get("text", "") if isinstance(block, dict) else str(block)
                    for block in content
                )
            )

    return {"raw": "".join(parts)}


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
        log.warning("model response contained no %s block", prompts.DELIMITER)
        return result

    try:
        data = extract_json(tail)
    except Exception as exc:
        log.warning("could not parse insights JSON: %s", exc)
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
