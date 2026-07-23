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
- Graph: `START → intake → assess → {diagnose, workup, followups, documentation, evidence} → END`.
  The fan-out nodes run in parallel and write disjoint state keys (no reducer needed).
- `app/graph/prompts.py` holds the clinical guardrails — keep them on every node.
- `app/llm.py::structured()` tries native structured output, falls back to prompted JSON
  (OpenRouter tool-calling support varies by model).
- SSE from `/api/consult/stream`: `token` frames = assessment text (only from the `assess`
  node), `insight` frames = one card's structured payload per finished node.

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
