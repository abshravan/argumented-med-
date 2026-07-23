"""FastAPI surface for the MediAssist clinical graph."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .config import get_settings
from .graph import get_graph
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

# Which node fills which slice of the insights panel.
NODE_KEYS = {
    "intake": ["patient"],
    "diagnose": ["diagnosis", "differentials"],
    "workup": ["investigations", "redFlags"],
    "followups": ["followUps"],
    "documentation": ["soap"],
    "evidence": ["references"],
}


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
    return "\n\n".join(lines[-20:]), latest


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
        try:
            yield _sse("start", {"provider": req.provider or settings.provider})

            async for mode, chunk in graph.astream(
                state, stream_mode=["messages", "updates"]
            ):
                if mode == "messages":
                    message, meta = chunk
                    # Only the narrative node is echoed into the conversation.
                    if meta.get("langgraph_node") != "assess":
                        continue
                    text = message.content
                    if isinstance(text, list):  # some providers chunk as content blocks
                        text = "".join(
                            part.get("text", "") if isinstance(part, dict) else str(part)
                            for part in text
                        )
                    if text:
                        yield _sse("token", {"text": text})

                elif mode == "updates":
                    for node, update in (chunk or {}).items():
                        if not isinstance(update, dict):
                            continue
                        payload = {
                            key: _jsonable(update[key])
                            for key in NODE_KEYS.get(node, [])
                            if key in update
                        }
                        if payload:
                            yield _sse("insight", {"node": node, "data": payload})

            yield _sse("done", {})

        except ProviderError as exc:
            yield _sse("error", {"message": str(exc)})
        except Exception as exc:  # noqa: BLE001 - surface failures to the UI
            log.exception("consult stream failed")
            yield _sse("error", {"message": f"{type(exc).__name__}: {exc}"})

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
    """Non-streaming equivalent — returns the assessment and the full insights object."""
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
