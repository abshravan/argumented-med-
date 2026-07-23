"""FastAPI surface for the MediAssist clinical graph."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import asyncio

from .config import get_settings
from .graph import get_graph
from .graph.builder import STREAMING_NODE
from .graph.nodes import ModelUnavailable
from .graph.prompts import DELIMITER
from .llm import ProviderError, build_llm
from .schemas import ConsultRequest, HealthResponse

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("mediassist")

settings = get_settings()

app = FastAPI(
    title="MediAssist Clinical API",
    description="LangGraph-powered clinical decision support. Assists; never replaces clinical judgement.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The parse node returns everything at once; these groups are replayed to the client
# as separate `insight` frames so the panel still reveals card by card.
INSIGHT_GROUPS: list[tuple[str, list[str]]] = [
    ("intake", ["patient"]),
    ("diagnose", ["diagnosis", "differentials"]),
    ("workup", ["investigations", "redFlags"]),
    ("followups", ["followUps"]),
    ("documentation", ["soap"]),
    ("evidence", ["references"]),
]


def _jsonable(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump()
    if isinstance(value, list):
        return [_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    return value


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _patient_block(req: ConsultRequest) -> str:
    """Confirmed PMS demographics, so the model doesn't have to infer them."""
    p = req.patient
    if not p:
        return ""
    fields = [
        ("Name", p.name),
        ("Age", f"{p.age}" if p.age else None),
        ("Sex", p.gender),
        ("Weight", p.weight),
        ("Height", p.height),
        ("Blood group", p.bloodGroup),
        ("MRN", p.mrn),
        ("Visit type", p.visitType),
        ("Triage", p.statusLabel),
        ("Chief complaint", p.chiefComplaint),
    ]
    lines = [f"- {label}: {value}" for label, value in fields if value and value != "—"]
    if not lines:
        return ""
    return "CONFIRMED PATIENT RECORD (from the PMS — treat as authoritative):\n" + "\n".join(lines)


def _transcript(req: ConsultRequest) -> tuple[str, str]:
    """Render the conversation, and pull out the clinician's latest turn."""
    lines = []
    for m in req.messages:
        speaker = "CLINICIAN" if m.role == "doctor" else "MEDIASSIST"
        lines.append(f"{speaker}: {m.content.strip()}")

    latest = ""
    for m in reversed(req.messages):
        if m.role == "doctor":
            latest = m.content.strip()
            break

    # Keep the last ~20 turns so long consultations stay within context.
    body = "\n\n".join(lines[-20:])
    patient = _patient_block(req)
    return (f"{patient}\n\n{body}" if patient else body), latest


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        defaultProvider=settings.provider,
        availableProviders=settings.available_providers(),
        models={
            "gemini": settings.gemini_model,
            "openrouter": settings.openrouter_model,
        },
    )


@app.get("/api/models")
async def models(provider: str | None = None) -> dict:
    """List models the configured key can actually use.

    Handy when a request fails with 404 (bad model id) or 503 (model overloaded) —
    `curl localhost:8000/api/models?provider=gemini`
    """
    import httpx

    target = (provider or settings.provider).lower()

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if target == "gemini":
                if not settings.google_api_key:
                    raise HTTPException(503, "GOOGLE_API_KEY is not set.")
                res = await client.get(
                    "https://generativelanguage.googleapis.com/v1beta/models",
                    params={"key": settings.google_api_key},
                )
                res.raise_for_status()
                names = [
                    m["name"].removeprefix("models/")
                    for m in res.json().get("models", [])
                    if "generateContent" in m.get("supportedGenerationMethods", [])
                ]
            elif target == "openrouter":
                if not settings.openrouter_api_key:
                    raise HTTPException(503, "OPENROUTER_API_KEY is not set.")
                res = await client.get(
                    f"{settings.openrouter_base_url}/models",
                    headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
                )
                res.raise_for_status()
                names = [m["id"] for m in res.json().get("data", [])]
            else:
                raise HTTPException(400, f"Unknown provider '{target}'.")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"Could not list models: {exc}") from exc

    return {
        "provider": target,
        "configured": settings.default_model_for(target),
        "fallbacks": settings.fallbacks_for(target),
        "count": len(names),
        "models": sorted(names),
    }


@app.post("/api/consult/stream")
async def consult_stream(req: ConsultRequest) -> StreamingResponse:
    """Stream the assessment tokens, then each insight card as its node finishes."""
    transcript, latest = _transcript(req)
    if not latest:
        raise HTTPException(status_code=400, detail="No clinician message to respond to.")

    # Fail fast with a clear message if the provider isn't configured.
    try:
        build_llm(provider=req.provider, model=req.model, temperature=req.temperature)
    except ProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    state = {
        "transcript": transcript,
        "latest": latest,
        "provider": req.provider,
        "model": req.model,
        "temperature": req.temperature,
    }

    async def generator() -> AsyncIterator[str]:
        graph = get_graph()
        # The single response is "narrative ---INSIGHTS--- {json}". We stream the
        # narrative and must never leak the JSON tail into the conversation, so we
        # buffer and hold back anything that could be the start of the delimiter.
        buffer = ""
        emitted = 0
        narrative_done = False

        try:
            yield _sse("start", {"provider": req.provider or settings.provider})

            async for mode, chunk in graph.astream(
                state, stream_mode=["messages", "updates"]
            ):
                if mode == "messages":
                    message, meta = chunk
                    if meta.get("langgraph_node") != STREAMING_NODE or narrative_done:
                        continue

                    text = message.content
                    if isinstance(text, list):  # some providers chunk as content blocks
                        text = "".join(
                            part.get("text", "") if isinstance(part, dict) else str(part)
                            for part in text
                        )
                    if not text:
                        continue

                    buffer += text
                    cut = buffer.find(DELIMITER)
                    if cut != -1:
                        if cut > emitted:
                            yield _sse("token", {"text": buffer[emitted:cut]})
                        emitted = cut
                        narrative_done = True
                        continue

                    # Hold back the last len(DELIMITER)-1 chars: they might be a
                    # partial delimiter that completes on the next chunk.
                    safe = max(emitted, len(buffer) - len(DELIMITER) + 1)
                    if safe > emitted:
                        yield _sse("token", {"text": buffer[emitted:safe]})
                        emitted = safe

                elif mode == "updates":
                    update = (chunk or {}).get("parse")
                    if not isinstance(update, dict):
                        continue

                    # Safety net: if token streaming produced nothing (e.g. callbacks
                    # didn't propagate), send the assessment in one frame so the chat
                    # is never left empty while the insights panel fills in.
                    if emitted == 0 and update.get("assessment"):
                        log.warning("no tokens streamed — emitting assessment as one frame")
                        yield _sse("token", {"text": update["assessment"]})
                        emitted = len(update["assessment"])
                        narrative_done = True

                    for node, keys in INSIGHT_GROUPS:
                        payload = {
                            key: _jsonable(update[key]) for key in keys if key in update
                        }
                        if payload:
                            yield _sse("insight", {"node": node, "data": payload})
                            # Tiny gap so the panel animates card by card. No extra cost.
                            await asyncio.sleep(0.12)

                    # Explain an empty panel rather than leaving the clinician guessing.
                    if update.get("notice"):
                        yield _sse("error", {"message": update["notice"]})

            # No delimiter arrived (model ignored the format) — flush what's left so
            # the clinician still sees the answer.
            if not narrative_done and len(buffer) > emitted:
                yield _sse("token", {"text": buffer[emitted:]})

            yield _sse("done", {})

        except asyncio.CancelledError:
            # Client navigated away or the server is shutting down. Nothing to report.
            log.info("consult stream cancelled by client")
            raise
        except (ProviderError, ModelUnavailable) as exc:
            log.warning("consult unavailable: %s", exc)
            yield _sse("error", {"message": str(exc)})
            yield _sse("done", {})
        except Exception as exc:  # noqa: BLE001 - surface failures to the UI
            log.exception("consult stream failed")
            yield _sse("error", {"message": f"{type(exc).__name__}: {exc}"})
            yield _sse("done", {})

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/consult")
async def consult(req: ConsultRequest) -> dict:
    """Non-streaming equivalent. Also exactly one LLM request."""
    transcript, latest = _transcript(req)
    if not latest:
        raise HTTPException(status_code=400, detail="No clinician message to respond to.")

    try:
        result = await get_graph().ainvoke(
            {
                "transcript": transcript,
                "latest": latest,
                "provider": req.provider,
                "model": req.model,
                "temperature": req.temperature,
            }
        )
    except ProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "assessment": result.get("assessment", ""),
        "patient": _jsonable(result.get("patient")),
        "insights": {
            "diagnosis": _jsonable(result.get("diagnosis")),
            "differentials": _jsonable(result.get("differentials", [])),
            "investigations": _jsonable(result.get("investigations", [])),
            "redFlags": _jsonable(result.get("redFlags", [])),
            "followUps": result.get("followUps", []),
            "soap": _jsonable(result.get("soap")),
            "references": _jsonable(result.get("references", [])),
        },
    }


def run() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)


if __name__ == "__main__":
    run()
