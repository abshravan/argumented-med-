CLAUDE.md

Project Name

Clinical AI Copilot for Diagnostic Assistance

---

Overview

This project aims to build an AI-powered clinical assistant that helps doctors collect patient information more efficiently, generate relevant follow-up questions, and provide structured diagnostic support.

The system is not intended to replace physicians and should always function as a Clinical Decision Support System (CDSS).

---

Primary Objectives

1. Reduce physician documentation burden.
2. Improve completeness of patient history collection.
3. Generate adaptive follow-up questions based on symptoms.
4. Provide structured summaries for clinicians.
5. Suggest possible differential diagnoses.
6. Integrate with existing PMS/EHR systems.

---

Core Principles

Doctor-in-the-loop

The physician always has final authority.

AI outputs must be presented as:

- Suggestions
- Possible diagnoses
- Missing information indicators

Never present AI outputs as definitive medical advice.

---

Safety First

Forbidden Behaviors

The AI must never:

- Make final diagnoses.
- Prescribe medications autonomously.
- Recommend emergency actions without physician review.
- Hide uncertainty.
- Fabricate patient information.

---

Explainability

Every recommendation should include reasoning.

Example:

{
  "possible_condition": "Pneumonia",
  "reasoning": [
    "Persistent fever",
    "Productive cough",
    "Shortness of breath"
  ]
}

---

System Workflow

PMS/EHR Data
        ↓
Patient Context Builder
        ↓
Symptom Collection
        ↓
Adaptive Question Generator
        ↓
Clinical Summary Generator
        ↓
Differential Diagnosis Engine
        ↓
Doctor Dashboard

---

Modules

---

1. PMS Integration Module

Responsibilities

- Fetch patient demographics.
- Retrieve previous diagnoses.
- Retrieve medications.
- Retrieve allergies.
- Retrieve laboratory reports.
- Retrieve imaging reports.
- Retrieve visit history.

Preferred Standards

- FHIR
- HL7

---

2. Patient Context Builder

Inputs

- Age
- Gender
- Medical history
- Family history
- Current medications
- Allergies
- Previous encounters

Output

Structured patient profile.

Example:

{
  "age": 58,
  "gender": "Male",
  "conditions": [
    "Diabetes",
    "Hypertension"
  ],
  "medications": [
    "Metformin"
  ]
}

---

3. Symptom Intake Module

The patient may provide symptoms through:

- Chat interface
- Voice interface
- Doctor input
- Form input

Example:

"I have chest pain and sweating."

---

4. Adaptive Question Engine

This is the core intelligence component.

The system should generate follow-up questions dynamically.

Example:

Initial Symptom:
Chest pain

Questions:

- When did the pain start?
- Is it radiating to the arm?
- Any shortness of breath?
- Any nausea?
- History of heart disease?

Questions should depend on:

- Existing diseases
- Age
- Previous history
- Current symptoms

---

5. Missing Information Detector

Identify clinically important missing information.

Example:

{
  "missing_information": [
    "Smoking history",
    "Drug allergies",
    "Family history of CAD"
  ]
}

---

6. Clinical Summary Generator

Generate structured notes.

SOAP Format

Subjective

Patient complaints.

Objective

Vitals, labs, imaging.

Assessment

Possible conditions.

Plan

Physician review required.

---

7. Differential Diagnosis Engine

Provide ranked possibilities.

Example:

{
  "differential_diagnosis": [
    {
      "condition": "Acute Coronary Syndrome",
      "confidence": 0.72
    },
    {
      "condition": "GERD",
      "confidence": 0.18
    }
  ]
}

---

AI Architecture

Agent 1

Patient Context Agent

Agent 2

Symptom Understanding Agent

Agent 3

Question Generation Agent

Agent 4

Clinical Reasoning Agent

Agent 5

Summary Generation Agent

---

Suggested Tech Stack

Backend

- FastAPI
- PostgreSQL
- Redis
- Celery

AI

- GPT-5 / Claude / Gemini
- MedGemma
- Meditron
- BioMistral

Embeddings

- BioClinicalBERT
- Instructor-xl
- MedCPT

Vector Database

- Qdrant
- pgvector

---

Knowledge Sources

Potential retrieval sources:

- SNOMED CT
- ICD-10
- MeSH
- PubMed
- Clinical Practice Guidelines
- WHO guidelines
- NICE guidelines

---

Prompting Rules

The AI should:

1. Ask concise questions.
2. Avoid unnecessary questions.
3. Prioritize life-threatening conditions.
4. Explain uncertainty.
5. Generate structured outputs.

---

Emergency Escalation Rules

If symptoms indicate possible emergencies:

Examples:

- Stroke
- Myocardial infarction
- Sepsis
- Severe respiratory distress

The system should:

Flag as High Priority
Recommend immediate physician review
Do not provide independent recommendations

---

Security Requirements

- HIPAA compliant architecture.
- Encryption at rest.
- Encryption in transit.
- Audit logs.
- Role-based access control.
- PII minimization.

---

Non-Goals

This project does NOT aim to:

- Replace doctors.
- Provide autonomous treatment.
- Provide direct patient diagnosis.
- Operate without physician oversight.

---

Future Features

Phase 2

- Voice consultation support.
- Multimodal analysis.
- Lab interpretation.
- Radiology report understanding.
- Longitudinal patient monitoring.

Phase 3

- AI-assisted triage.
- Predictive risk scoring.
- Population analytics.
- Clinical outcome prediction.

---

Vision

Create an AI Clinical Copilot that enables physicians to spend less time on documentation and more time treating patients while improving completeness and quality of clinical decision making.