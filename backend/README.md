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

## The graph — one LLM request per message

```
START → consult → parse → END
```

- **`consult`** is the only node that talks to the model — **exactly one request per chat
  message**. It streams a response shaped as:

  ```
  ## Working assessment
  ...markdown for the clinician...
  ---INSIGHTS---
  { "patient": {...}, "diagnosis": {...}, "differentials": [...], ... }
  ```

- **`parse`** is pure Python (no LLM): it splits on the delimiter, validates each section
  independently, and returns the insight cards. A malformed section is dropped rather than
  failing the whole response; if the delimiter never appears, the narrative is still shown.

The SSE layer buffers tokens and holds back anything that could be a partial delimiter, so
the raw JSON never leaks into the conversation. Insight frames are then replayed group by
group with a ~120 ms gap so the panel still animates card by card — at no extra API cost.

> An earlier version fanned out to five parallel LLM nodes plus `intake` and `assess`.
> That was **7+ requests per message** (more when structured-output fell back) and tripped
> free-tier rate limits, so it was folded into a single call.

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
