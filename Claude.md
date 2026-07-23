# MediAssist — Clinical Workspace

Next.js 14 (App Router) + TypeScript + Tailwind CSS app implementing the "Clinical Workspace — AI Doctor Companion".
Visual theme is imported from the MediAssist Design Canvas project (`design-source/MediAssist.dc.html`):
dark navy `#080b11`, `#0d131d` cards, teal/green AI accent, purple confidence, blue primary. Font: Inter.
Frontend animated with **Magic UI** components (vendored in `components/magicui/`, built on `motion`).

## Run
`npm install` then `npm run dev` → http://localhost:3000 (Node 18.17+).

## Architecture
- Three-column shell in `app/page.tsx`: Sidebar · Clinical Workspace · AI Clinical Insights.
- `lib/useClinicalEngine.ts` — client hook; the mock "living" engine (streaming text, staged
  insight reveals, confidence animation, differential re-ranking, live draft nudges).
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
