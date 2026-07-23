"""LangGraph nodes. Each node owns one clinical reasoning step."""

from __future__ import annotations

import logging

from langchain_core.messages import HumanMessage, SystemMessage

from ..llm import build_llm, structured
from ..schemas import (
    DiagnosisBundle,
    EvidenceBundle,
    FollowUpBundle,
    PatientSummary,
    Soap,
    WorkupBundle,
)
from . import prompts
from .state import ClinicalState

log = logging.getLogger(__name__)


def _llm(state: ClinicalState, streaming: bool = False):
    return build_llm(
        provider=state.get("provider"),
        model=state.get("model"),
        temperature=state.get("temperature"),
        streaming=streaming,
    )


def _context(state: ClinicalState) -> str:
    transcript = state.get("transcript", "").strip()
    latest = state.get("latest", "").strip()
    parts = []
    if transcript:
        parts.append(f"CONSULTATION SO FAR:\n{transcript}")
    if latest:
        parts.append(f"CLINICIAN'S LATEST INPUT:\n{latest}")
    return "\n\n".join(parts) or "No information provided yet."


def _case_summary(state: ClinicalState) -> str:
    """Context plus the assessment, for the downstream structured nodes."""
    assessment = state.get("assessment", "").strip()
    ctx = _context(state)
    if assessment:
        return f"{ctx}\n\nYOUR NARRATIVE ASSESSMENT:\n{assessment}"
    return ctx


# --------------------------------------------------------------------------
# Nodes
# --------------------------------------------------------------------------
async def intake(state: ClinicalState) -> dict:
    """Extract the structured patient summary from free text."""
    try:
        patient = await structured(
            _llm(state), PatientSummary, prompts.INTAKE_SYSTEM, _context(state)
        )
    except Exception as exc:  # keep the graph running on extraction failure
        log.warning("intake failed: %s", exc)
        patient = PatientSummary()
    return {"patient": patient}


async def assess(state: ClinicalState) -> dict:
    """The narrative markdown answer. Tokens from this node are streamed to the UI.

    Uses ``astream`` rather than ``ainvoke``: some providers (Gemini in particular)
    only emit token callbacks on the streaming path, and LangGraph's ``messages``
    stream mode relies on those callbacks to forward tokens to the client.
    """
    llm = _llm(state, streaming=True)
    messages = [
        SystemMessage(content=prompts.ASSESS_SYSTEM),
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

    return {"assessment": "".join(parts)}


async def diagnose(state: ClinicalState) -> dict:
    try:
        bundle = await structured(
            _llm(state), DiagnosisBundle, prompts.DIAGNOSIS_SYSTEM, _case_summary(state)
        )
    except Exception as exc:
        log.warning("diagnose failed: %s", exc)
        return {"diagnosis": None, "differentials": []}

    differentials = sorted(bundle.differentials, key=lambda d: d.confidence, reverse=True)
    return {"diagnosis": bundle.diagnosis, "differentials": differentials}


async def workup(state: ClinicalState) -> dict:
    try:
        bundle = await structured(
            _llm(state), WorkupBundle, prompts.WORKUP_SYSTEM, _case_summary(state)
        )
    except Exception as exc:
        log.warning("workup failed: %s", exc)
        return {"investigations": [], "redFlags": []}
    return {"investigations": bundle.investigations, "redFlags": bundle.redFlags}


async def followups(state: ClinicalState) -> dict:
    try:
        bundle = await structured(
            _llm(state), FollowUpBundle, prompts.FOLLOWUP_SYSTEM, _case_summary(state)
        )
    except Exception as exc:
        log.warning("followups failed: %s", exc)
        return {"followUps": []}
    return {"followUps": bundle.followUps}


async def documentation(state: ClinicalState) -> dict:
    try:
        soap = await structured(_llm(state), Soap, prompts.SOAP_SYSTEM, _case_summary(state))
    except Exception as exc:
        log.warning("documentation failed: %s", exc)
        soap = Soap()
    return {"soap": soap}


async def evidence(state: ClinicalState) -> dict:
    try:
        bundle = await structured(
            _llm(state), EvidenceBundle, prompts.EVIDENCE_SYSTEM, _case_summary(state)
        )
    except Exception as exc:
        log.warning("evidence failed: %s", exc)
        return {"references": []}
    return {"references": bundle.references}
