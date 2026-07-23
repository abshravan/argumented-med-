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
| GET    | `/api/models?provider=` | Models your key can actually use — use this to check a model id |
| POST   | `/api/consult/stream`  | SSE: `start` → `token`* → `insight`* → `done` (or `error`) |
| POST   | `/api/consult`         | Non-streaming; returns assessment + full insights object |

SSE frames:

```
event: token    data: {"text": "..."}                       # assessment tokens
event: insight  data: {"node": "diagnose", "data": {...}}    # one card's worth of state
event: error    data: {"message": "..."}
event: done     data: {}
```

## Thinking models (Gemini 2.5 / 3.x)

On thinking models `MAX_OUTPUT_TOKENS` covers **reasoning tokens as well as the answer**.
Set it too low and the model spends the budget thinking, then stops before writing PART 2 —
the log shows:

```
model response contained no ---INSIGHTS--- block (response was 438 chars, finish_reason=MAX_TOKENS)
```

The fix is simply a bigger budget:

```bash
MAX_OUTPUT_TOKENS=8192
```

> ⚠️ `GEMINI_THINKING_BUDGET` is **not accepted by Gemini 3.x** — setting it there causes
> `400 Bad Request` on a model that otherwise works. It only applies to Gemini 2.5. Leave it
> blank unless you have confirmed your model supports it. (If it is set and the model 400s,
> the backend drops it and retries automatically.)

`finish_reason` is captured from the stream, so truncation is reported explicitly rather
than showing up as mysteriously empty insight cards.

## When the provider fails

Google returns `503 UNAVAILABLE — "This model is currently experiencing high demand"`
fairly often on popular models. The `consult` node handles it:

1. Retries the primary model `LLM_MAX_RETRIES` times with exponential backoff.
2. Falls back through `GEMINI_FALLBACK_MODELS` / `OPENROUTER_FALLBACK_MODELS`.
3. Only then reports a readable message to the UI.

Not every failure is retried — that would waste quota:

| Error | Behaviour |
| --- | --- |
| 503 / timeout | retry same model, then fall back |
| 429 quota | **skip** remaining tries on that model, jump to the next distinct one |
| 400 invalid | fail immediately (retrying an identical bad request can't help) |
| 401 / 404 | fail immediately, message names the env var to fix |

A `429` reading `limit: 0` means your project has **no quota at all** for that model —
waiting won't help, so change the model rather than leaving it in the fallback list. Keep
`GEMINI_FALLBACK_MODELS` empty unless you've confirmed quota for the models in it.

`LLM_SDK_MAX_RETRIES=1` keeps the provider SDK from adding its own 30s+ backoff on top of
ours, and `LLM_REQUEST_BUDGET_SECONDS` is a hard ceiling so a request can never hang.

Retries only happen **before the first token** — LangGraph forwards tokens as they arrive,
so restarting mid-stream would duplicate text. After partial output we keep what we have.

Bad API keys (401) and bad model ids (404) **fail immediately** — retrying can't help, and
the error tells you which env var to fix.

Check a model id before using it:

```bash
curl "http://localhost:8000/api/models?provider=gemini"
```

## Switching provider at runtime

The frontend **Settings** tab sends `provider`, `model` and `temperature` with each request,
overriding the `.env` defaults — so you can flip between Gemini and OpenRouter without a restart.

## Safety

Every prompt carries the same guardrails: decision support only, evidence-first, calibrated
uncertainty, never fabricate citations, always respect allergies/contraindications, and the
clinician is the decision-maker. See `app/graph/prompts.py`.
