# MediAssist — Clinical Workspace

The flagship **AI Doctor Companion** workspace: a premium clinical decision-support UI where the AI assists and **the doctor decides**. Built with Next.js (App Router) + TypeScript + **Tailwind CSS**, styled with the imported MediAssist dark-navy theme and animated with **[Magic UI](https://magicui.design)** (`motion`).

### Magic UI components used

Vendored under `components/magicui/` (MIT):

- **MagicCard** — spotlight-follow starter cards on the empty state
- **BorderBeam** — animated beam around the diagnosis card and emergency patient header
- **NumberTicker** — spring-animated confidence / relevance percentages
- **AnimatedGradientText** — brand wordmark + empty-state headline
- **AnimatedShinyText** — status ("Connected · Online"), insights subtitle, section labels
- **ShimmerButton** — "Start a blank consultation" primary CTA
- **BlurFade** — message entrance + staggered empty-state reveals
- **Ripple** + **DotPattern** — ambient backgrounds

## Run

**Frontend** (works on its own with seeded demo cases):

```bash
npm install
npm run dev
```

Open http://localhost:3000. Requires Node.js 18.17+.

**Backend** (LangGraph + Gemini / OpenRouter) — see [backend/README.md](backend/README.md):

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
cp .env.example .env      # add GOOGLE_API_KEY or OPENROUTER_API_KEY
uvicorn app.main:app --reload --port 8000
```

Then pick your provider in the **Settings** tab. With no backend running the workspace falls
back to demo scenarios automatically and tells you so.

## Backend architecture

FastAPI + LangGraph. `intake` extracts the patient, `assess` writes the streamed narrative,
then five nodes fan out **in parallel** to fill the insights panel:

```
START → intake → assess ─┬→ diagnose · workup · followups · documentation · evidence → END
```

Streaming is SSE: `token` frames carry the assessment text, `insight` frames carry each
card's structured payload as its node completes. Provider/model/temperature are sent per
request from Settings, so you can switch Gemini ↔ OpenRouter without restarting.

## Layout

A responsive **three-column** clinical operating system:

```
Sidebar  ·  Clinical Workspace (≈60–70%)  ·  AI Clinical Insights (≈25–30%)
```

- **Sidebar** — New Consultation, History, Saved Cases, Favorites, Settings, Profile; footer shows current AI model, connection status, theme toggle, and collapse button.
- **Patient Header** — sticky summary card (name, age, gender, weight, height, blood group, chief complaint, visit type, live consultation timer, status badge).
- **Clinical Conversation** — an intelligent clinical *notebook*, not a chat app. Doctor cards are darker, AI cards lighter, with markdown, tables, lists, expandable reasoning, streaming responses, and per-message quick actions (Copy, Save, Regenerate, Expand, Reference, Export). Doctor messages are editable and bookmarkable.
- **AI Composer** — auto-resizing input with voice / attach / paste, suggested prompts, and send.
- **AI Clinical Insights** — seven live cards: Most Likely Diagnosis (confidence, urgency, severity, reasoning), Differential Diagnoses (ranked, animated bars, re-ordering), Recommended Investigations (priority, reason, cost), Clinical Red Flags, Suggested Follow-up Questions (click to ask), auto-updating SOAP summary, and References.

## What makes it feel "alive"

- Streaming AI text with a typing indicator and caret.
- Insight cards reveal progressively with skeleton loaders, then confidence bars animate in.
- Each new message nudges diagnosis confidence and **re-ranks the differentials**.
- Typing in the composer subtly lifts confidence as more signal is gathered.
- No page refreshes; motion respects `prefers-reduced-motion`.

## Try it

From the empty state pick a starter (Abdominal Pain, Chest Pain, Fever, Diabetes Follow-up, Hypertension, General) or type a complaint. Each keyword maps to a seeded clinical scenario in `lib/scenarios.ts`.

## Structure

```
app/
  layout.tsx        # Inter font, metadata, root
  globals.css       # theme tokens (dark + light), animations, primitives
  page.tsx          # three-column shell, theme/collapse/insights state, shortcuts
components/
  Sidebar.tsx  PatientHeader.tsx  MessageCard.tsx  Composer.tsx
  InsightsPanel.tsx  EmptyState.tsx  Markdown.tsx
lib/
  types.ts  scenarios.ts  useClinicalEngine.ts   # mock "living" engine
design-source/       # the imported MediAssist.dc.html theme reference
```

## Sidebar tabs

All five are functional and backed by browser-local storage (nothing is uploaded):

| Tab | What it does |
| --- | --- |
| **New Consultation** | The three-column workspace. Resets to the empty state. |
| **Consultation History** | Every consultation, searchable; open, star, or delete. |
| **Saved Cases** | The starred subset, for teaching / audit / follow-up. |
| **Favorites** | Every bookmarked message across all consultations; jumps back to its case. |
| **Settings** | Provider (Gemini/OpenRouter), model, temperature, backend URL, **Test connection**, theme, and clear-data. |

Consultations are recorded automatically as you work, and re-open with their full message
history and insight cards intact.

## Keyboard shortcuts

- `Ctrl/⌘ + B` — collapse / expand sidebar
- `Ctrl/⌘ + I` — show / hide the insights panel
- `Enter` send · `Shift+Enter` new line

## Extensibility

Cards and the engine are decoupled behind typed models (`lib/types.ts`), so future modules — Medical Imaging, Lab Viewer, ECG Analysis, Voice Consultation, EMR/FHIR integration, RAG, Drug Interaction Checker, DICOM viewer — can be added as new insight cards or scenarios without redesign.

_All clinical content is mock / illustrative for decision-support demonstration only — not medical advice._
