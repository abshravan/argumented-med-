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

```bash
npm install
npm run dev
```

Open http://localhost:3000.

> Requires Node.js 18.17+ (Next.js 14). If `node`/`npm` aren't found, install Node LTS from https://nodejs.org first.

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

## Keyboard shortcuts

- `Ctrl/⌘ + B` — collapse / expand sidebar
- `Ctrl/⌘ + I` — show / hide the insights panel
- `Enter` send · `Shift+Enter` new line

## Extensibility

Cards and the engine are decoupled behind typed models (`lib/types.ts`), so future modules — Medical Imaging, Lab Viewer, ECG Analysis, Voice Consultation, EMR/FHIR integration, RAG, Drug Interaction Checker, DICOM viewer — can be added as new insight cards or scenarios without redesign.

_All clinical content is mock / illustrative for decision-support demonstration only — not medical advice._
