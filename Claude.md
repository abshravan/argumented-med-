# CLAUDE.md — Clinical Documentation Assistant (POC)

## What this is

A 3-week proof-of-concept for doctors across specialties (initially
radiologists and general physicians). A doctor inputs clinical text — findings,
consultation notes, or dictation — and the app drafts the document they need
(radiology report, consultation/SOAP note, prescription draft, referral letter,
patient instructions) in that doctor's own template and style. The doctor
edits the draft and exports it.

The goal of this POC is NOT technical impressiveness. It is to make real
doctors say "I'd only change two words" when they see a draft of their own
case, and agree to use it on real cases for two weeks.

**This tool never diagnoses, never recommends treatment, and never interprets
medical images.** It only restructures and drafts documents from text the
doctor provides. Never add image analysis, DICOM viewing, diagnostic
suggestions, or treatment recommendations — these turn the product into a
regulated medical device.

## Core design principle: specialties are configuration, not code

The app has exactly ONE flow. Specialties differ only in config files.

- Each doctor has a config: `/config/doctors/<doctor-id>.ts` defining their
  name, specialty, and which document types they use.
- Each document type is a prompt pack: `/prompts/<specialty>/<doc-type>/`
  containing `system.md` (instructions), `template.md` (their exact section
  structure), and `examples/` (3-4 real anonymized samples as few-shot).
- Adding a new specialty or doctor = adding config + prompt files. If a new
  specialty seems to require new application code, STOP and ask the developer.

## Hard scope rules (do not violate)

This is a POC. Simplicity beats architecture. Specifically:

- NEVER add: agents/multi-agent frameworks, vector databases, RAG pipelines,
  message queues, background workers, EMR/PACS integration, DICOM handling,
  admin dashboards, user management, or role-based access.
- NEVER add abstractions "for later" (repositories, service layers, plugin
  systems). Prefer the simplest working version, even if it looks naive.
- Auth is a single shared password via middleware. Doctor identity is just a
  dropdown/URL param selecting their config. Nothing more.
- One LLM provider, called directly via its official SDK. No LLM gateway,
  no provider abstraction.
- If a task seems to require any of the above, STOP and ask the developer.

## Stack

- Next.js 14+ (App Router), single-page UI + API routes. No separate backend.
- TypeScript. Tailwind for styling. Components in `/app` and `/components`.
- LLM calls happen ONLY in API routes (server-side), never from the browser.
  API key lives in `.env.local` and is never committed.
- No database for the core flow. If persistence is needed for trial logging,
  use a single SQLite file or Supabase table — nothing more.
- Speech input: browser Web Speech API first; only fall back to Whisper API
  if browser STT is unusable for the doctors' accents/languages.
- Deploy target: Vercel.

## Core flow (the only flow that matters)

1. Doctor is selected (dropdown or `?dr=` URL param) → loads their config.
2. Doctor picks a document type from THEIR list (e.g. a radiologist sees
   "Report"; a GP sees "Consult note", "Prescription", "Patient instructions").
3. Doctor enters input (textarea or dictation) and, where relevant, optional
   context — e.g. prior report for radiology, brief patient history for GP.
4. API route assembles the prompt (system + template + examples + input) and
   calls the LLM.
5. UI shows the draft in an editable text area. For radiology with a prior
   provided, also show a "Changes since prior" section.
6. Doctor edits, then copies or downloads the final text.
7. A visible timer shows time from submit to draft (demo metric).

## Prompt conventions (all specialties)

- All prompt text lives as readable files under `/prompts/`. Never bury
  prompts inside component code.
- Every system prompt must instruct the model to:
  - Follow the template's sections and the doctor's phrasing style exactly.
  - Use ONLY information present in the doctor's input. Never invent findings,
    measurements, medications, doses, or history not supported by the input.
  - Write "[REVIEW: ...]" for any template section the input doesn't cover,
    rather than guessing.
  - Never add diagnostic conclusions or treatment suggestions beyond what the
    doctor stated.

### Specialty-specific notes

- **Radiology (report):** support optional prior report input → produce a
  short "Changes since prior" list (new / resolved / unchanged / progressed).
  Keep the Impression section concise — verbose impressions are the most
  common complaint about AI drafts.
- **General practice (consult note):** default structure is SOAP unless the
  doctor's template says otherwise. Separate what the patient reported
  (Subjective) from what the doctor observed (Objective); never move content
  between them.
- **General practice (prescription draft):** output ONLY medications, doses,
  and durations explicitly stated by the doctor, formatted to their
  prescription layout. If a dose or duration is missing, write "[REVIEW:
  dose?]" — never fill it in.
- **Patient instructions:** plain language at a lay reading level. If the
  doctor's config sets a local language (e.g. Malayalam), produce the
  instructions in that language with an English copy underneath.

## Evals

- Maintain `/eval/run-eval.ts`: runs the current prompts over all sample cases
  in `/eval/cases/<specialty>/` and writes outputs next to the doctors'
  original documents for side-by-side comparison.
- Run the eval after EVERY prompt change and summarize what changed before
  considering the task done. Prompt quality is the product; treat the eval
  like a test suite.
- Keep per-specialty cases separate so a prompt fix for GPs can't silently
  degrade radiology output, and vice versa.

## Data handling (non-negotiable)

- Only anonymized data enters this system, ever. No patient names, IDs, dates
  of birth, phone numbers, or addresses in sample data, prompts, logs, or
  commits.
- Never log request bodies containing clinical text. Trial logging records
  only: timestamp, doctor id, document type, input length, draft time, and
  whether the doctor copied/exported (an event, not the text).
- Real sample documents in `/eval/cases/` and `/prompts/**/examples/` are
  gitignored. Provide one fully synthetic example per document type so the
  structure is clear in the repo.
- `.env.local`, any `*.key`, and all real sample data are in `.gitignore`.

## Working style

- One feature per session. Build it end-to-end, run it, commit, then move on.
- Ugly-but-working beats elegant-but-half-done at every decision point.
- Ask before adding any new dependency. The dependency budget is nearly zero.
- When in doubt between "flexible" and "simple", choose simple. Flexibility
  lives in the prompt/config files, never in the code.

## Current status

<!-- Update this section at the end of each working session so the next
     session starts with context. -->
- [ ] Core loop: input → LLM → draft (end to end, one hardcoded doctor)
- [ ] Doctor config loading + document type selection
- [ ] Prompt packs: radiology report (1 real doctor's template + examples)
- [ ] Prompt packs: GP consult note (1 real doctor's template + examples)
- [ ] Editable output + copy/download
- [ ] Radiology: prior report comparison + "Changes since prior"
- [ ] GP: prescription draft + patient instructions doc types
- [ ] Dictation input
- [ ] Draft timer
- [ ] Password gate + per-doctor landing page
- [ ] Eval script over sample cases (per specialty)
- [ ] Trial logging (events only)
- [ ] Deployed to Vercel
