# MediAssist — Clinical Workspace

Next.js 14 (App Router) + TypeScript + Tailwind CSS app implementing the "Clinical Workspace — AI Doctor Companion".
Visual theme is imported from the MediAssist Design Canvas project (`design-source/MediAssist.dc.html`):
dark navy `#080b11`, `#0d131d` cards, teal/green AI accent, purple confidence, blue primary. Font: Inter.
Frontend animated with **Magic UI** components (vendored in `components/magicui/`, built on `motion`).

## Run
Frontend: `npm install` then `npm run dev` → http://localhost:3000 (Node 18.17+).
Backend: `cd backend`, venv, `pip install -r requirements.txt`, `.env` from `.env.example`,
then `uvicorn app.main:app --reload --port 8000`. See `backend/README.md`.

## Backend (Python · FastAPI · LangGraph)
- Providers: **Gemini** (`langchain-google-genai`) and **OpenRouter** (`langchain-openai`
  against the OpenAI-compatible endpoint). Chosen per-request from the Settings tab.
- Graph: `START → consult → parse → END`. **`consult` is the only LLM call — keep it that
  way.** One request per chat message; the previous 7-call fan-out hit provider rate limits.
- The model returns `markdown ---INSIGHTS--- {json}` in one response. `parse` (pure Python)
  splits it and validates each section independently, dropping bad ones.
- `app/graph/prompts.py` holds the clinical guardrails + the response-format contract.
- SSE from `/api/consult/stream`: `token` frames = narrative only (main.py buffers and
  suppresses the JSON tail, holding back partial delimiters), `insight` frames replay the
  card groups with a small gap for the staged reveal.
- Frontend also guards concurrency: `dispatch`/`regenerate` bail when `streaming`, and the
  composer/follow-up buttons lock during a request.

## Architecture
- Routes: `/login`, `/signup`, `/onboarding`, `/` (workspace, client-side guarded).
- `lib/auth.ts` — **demo-only** client auth (localStorage session, no hashing). Test account:
  `doctor@mediassist.health` / `mediassist`. Swap for real SSO before clinical use.
- `components/auth/` — AuthLayout (two-panel brand screen from the design), shared form fields.
- Three-column shell in `app/page.tsx`: Sidebar · Clinical Workspace · AI Clinical Insights.
- `lib/useClinicalEngine.ts` — client hook with two paths: **backend** (SSE from FastAPI) and
  **demo** (seeded scenarios). Falls back to demo automatically if the backend is unreachable.
- `lib/api.ts` (SSE client), `lib/settings.ts` (provider/model, localStorage),
  `lib/store.ts` (consultation records → History / Saved / Favorites).
- `components/views/` — NewConsultationView (PMS search + new-patient intake),
  ConsultationListView (history + saved), FavoritesView, SettingsView.
- `lib/pms.ts` — dummy PMS directory + `searchPatients()` (swap for FHIR/PMS API) and
  `toWorkspacePatient()`. A selected record sets `patientLocked` on the engine, which stops
  both the demo scenarios and the backend `intake` node from overwriting it.
- `lib/scenarios.ts` — seeded clinical scenarios keyed by symptom keywords + empty-state starters.
- `lib/types.ts` — typed clinical models (Patient, Diagnosis, Differential, Insights, SOAP, …).
- `components/` — Sidebar, PatientHeader (sticky), MessageCard (notebook cards + toolbar + edit),
  Composer, InsightsPanel (7 cards), EmptyState, Markdown (mini renderer).
- Theme tokens + animations live in `app/globals.css` (dark + light via `data-theme`).
- `components/magicui/` — vendored Magic UI (MagicCard, BorderBeam, NumberTicker, AnimatedGradientText,
  AnimatedShinyText, ShimmerButton, BlurFade, Ripple, DotPattern). `lib/utils.ts` has `cn()`.
- Tailwind: `tailwind.config.ts` (custom keyframes for shiny-text/gradient/shimmer/ripple),
  `postcss.config.mjs`; `bg-background`/`foreground`/`border` map to CSS vars in `globals.css`.

## Conventions
- Color/spacing come from CSS custom properties in `globals.css`; dynamic values use inline styles.
  Magic UI components use Tailwind classes; the two coexist (inline style wins where both apply).
- Icons: `lucide-react`. Keep all clinical data mock/illustrative — decision support, not advice.
- The doctor is the decision-maker; every AI suggestion stays explainable.
