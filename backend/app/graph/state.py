"""Shared state for the clinical LangGraph."""

from __future__ import annotations

from typing import Optional

from typing_extensions import TypedDict

from ..schemas import (
    Diagnosis,
    Differential,
    Investigation,
    PatientSummary,
    RedFlag,
    Reference,
    Soap,
)


class ClinicalState(TypedDict, total=False):
    # --- inputs ---
    transcript: str
    """The full consultation rendered as text (doctor + AI turns)."""

    latest: str
    """The clinician's most recent message."""

    provider: Optional[str]
    model: Optional[str]
    temperature: Optional[float]

    # --- node outputs ---
    patient: PatientSummary
    assessment: str
    """The narrative markdown answer streamed into the conversation."""

    diagnosis: Optional[Diagnosis]
    differentials: list[Differential]
    investigations: list[Investigation]
    redFlags: list[RedFlag]
    followUps: list[str]
    soap: Soap
    references: list[Reference]
