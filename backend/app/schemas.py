"""Pydantic models — these mirror `lib/types.ts` on the frontend."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

Urgency = Literal["Critical", "High", "Moderate", "Routine"]
Severity = Literal["Severe", "Moderate", "Mild"]
Priority = Literal["Immediate", "High", "Medium", "Low"]
FlagLevel = Literal["emergency", "warning", "contraindication"]


# --------------------------------------------------------------------------
# Structured clinical output
# --------------------------------------------------------------------------
class PatientSummary(BaseModel):
    name: str = Field(default="New Patient", description="Patient name, or 'New Patient' if not stated")
    age: int = Field(default=0, description="Age in years, 0 if unknown")
    gender: str = Field(default="—")
    weight: str = Field(default="—", description="e.g. '72 kg'")
    height: str = Field(default="—", description="e.g. '175 cm'")
    bloodGroup: str = Field(default="—")
    chiefComplaint: str = Field(default="Awaiting history")
    visitType: str = Field(default="OPD · Consultation")
    mrn: str = Field(default="MRN — pending")
    statusLabel: Literal["Emergency", "Urgent", "Routine", "Stable"] = "Stable"


class Diagnosis(BaseModel):
    name: str
    confidence: int = Field(ge=0, le=100)
    urgency: Urgency = "Routine"
    severity: Severity = "Mild"
    reasoning: str


class Differential(BaseModel):
    name: str
    confidence: int = Field(ge=0, le=100)
    note: str = Field(description="One short line of supporting/opposing reasoning")


class Investigation(BaseModel):
    name: str
    priority: Priority = "Medium"
    reason: str
    cost: Optional[str] = None


class RedFlag(BaseModel):
    text: str
    level: FlagLevel = "warning"


class Reference(BaseModel):
    source: str = Field(description="e.g. NICE, PubMed, WHO, WSES, ESC, Cochrane")
    title: str
    meta: str = Field(description="Journal/body and year")
    relevance: int = Field(default=80, ge=0, le=100)


class Soap(BaseModel):
    s: str = ""
    o: str = ""
    a: str = ""
    p: str = ""


class Insights(BaseModel):
    diagnosis: Optional[Diagnosis] = None
    differentials: list[Differential] = Field(default_factory=list)
    investigations: list[Investigation] = Field(default_factory=list)
    redFlags: list[RedFlag] = Field(default_factory=list)
    followUps: list[str] = Field(default_factory=list)
    soap: Soap = Field(default_factory=Soap)
    references: list[Reference] = Field(default_factory=list)


# ---- intermediate node payloads (what each LLM call returns) ----
class DiagnosisBundle(BaseModel):
    """Primary working diagnosis plus the ranked differential list."""

    diagnosis: Diagnosis
    differentials: list[Differential] = Field(
        default_factory=list, description="Ranked most→least likely, including the primary"
    )


class WorkupBundle(BaseModel):
    investigations: list[Investigation] = Field(default_factory=list)
    redFlags: list[RedFlag] = Field(default_factory=list)


class FollowUpBundle(BaseModel):
    followUps: list[str] = Field(
        default_factory=list, description="Questions the clinician should ask the patient next"
    )


class EvidenceBundle(BaseModel):
    references: list[Reference] = Field(default_factory=list)


# --------------------------------------------------------------------------
# API request / response
# --------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: Literal["doctor", "ai"]
    content: str


class ConsultRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    patient: Optional[PatientSummary] = None
    provider: Optional[Literal["gemini", "openrouter"]] = None
    model: Optional[str] = None
    temperature: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    defaultProvider: str
    availableProviders: list[str]
    models: dict[str, str]
