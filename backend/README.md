# MediAssist Backend — LangGraph clinical engine

FastAPI + LangGraph. Runs the clinical reasoning graph over **Google Gemini** or **OpenRouter**
(any model), and streams both the narrative answer and the structured insight cards to the
Next.js workspace.

## Setup

```bash
cd backend
python -m venv .venv
```

Activate it — PowerShell: `.venv\Scripts\Activate.ps1` · Git Bash: `source .venv/Scripts/activate` · macOS/Linux: `source .venv/bin/activate`

```bash
pip install -r requirements.txt
cp .env.example .env      # then add your API key
```

Add **one** key to `.env`:

- `GOOGLE_API_KEY` — from https://aistudio.google.com/app/apikey (set `LLM_PROVIDER=gemini`)
- `OPENROUTER_API_KEY` — from https://openrouter.ai/keys (set `LLM_PROVIDER=openrouter`)

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Docs at http://localhost:8000/docs · health at http://localhost:8000/api/health

## The graph

```
START → intake → assess ─┬→ diagnose        (diagnosis + ranked differentials)
                         ├→ workup          (investigations + red flags)
                         ├→ followups       (questions to ask the patient)
                         ├→ documentation   (SOAP note)
                         └→ evidence        (guidelines & references)
                                            → END
```

- `intake` extracts the structured patient summary from free text.
- `assess` writes the markdown answer — **its tokens are what stream into the conversation**.
- The five downstream nodes fan out **in parallel** to fill the AI Clinical Insights panel.
  They write disjoint state keys, so no reducer is required.

## Endpoints

| Method | Path                   | Purpose |
| ------ | ---------------------- | ------- |
| GET    | `/api/health`          | Status, default provider, which providers have keys |
| POST   | `/api/consult/stream`  | SSE: `start` → `token`* → `insight`* → `done` (or `error`) |
| POST   | `/api/consult`         | Non-streaming; returns assessment + full insights object |

SSE frames:

```
event: token    data: {"text": "..."}                       # assessment tokens
event: insight  data: {"node": "diagnose", "data": {...}}    # one card's worth of state
event: error    data: {"message": "..."}
event: done     data: {}
```

## Switching provider at runtime

The frontend **Settings** tab sends `provider`, `model` and `temperature` with each request,
overriding the `.env` defaults — so you can flip between Gemini and OpenRouter without a restart.

## Safety

Every prompt carries the same guardrails: decision support only, evidence-first, calibrated
uncertainty, never fabricate citations, always respect allergies/contraindications, and the
clinician is the decision-maker. See `app/graph/prompts.py`.
