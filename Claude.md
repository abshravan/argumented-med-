# CLAUDE.md — Clinical Diagnostic Decision Support (POC)

## What this is

A 3-4 week proof-of-concept for doctors (initially general physicians and
radiologists). A doctor enters a clinical case — history, symptoms, exam
findings, lab values, or a written imaging findings description — and the
system produces a RANKED DIFFERENTIAL with transparent reasoning: why each
candidate fits, what argues against it, which guideline/literature sources
support it, and what workup would help discriminate between candidates.

The doctors evaluating this POC are technically curious and specifically want
to see HOW it works. The backend pipeline and a visible reasoning trace are
first-class parts of the product, not internals to hide.

## The regulatory line (non-negotiable, shapes every feature)

This is decision SUPPORT, not diagnosis. To stay outside medical-device
territory the system must always:

1. Output a differential (multiple ranked possibilities), NEVER a single
   diagnostic verdict.
2. Show the basis for every suggestion — reasoning, the specific input
   findings that support it, and citations — so the doctor can independently
   review and disagree.
3. Never analyze medical images, waveforms, or signals. Text descriptions of
   findings written by the doctor are fine; pixels are not. Never add DICOM,
   image upload for analysis, or ECG/signal processing.
4. Never output treatment directives or drug dosing. Suggested WORKUP to
   discriminate the differential is allowed; "give drug X" is not.
5. Address the doctor, never the patient. No patient-facing output.
6. Every response carries: "Decision support for licensed clinicians. Not a
   diagnosis. Clinical judgment required."

If a requested feature would violate any of these, STOP and ask the developer
instead of building it.

## Architecture (the backend IS the demo)

A single linear pipeline. No agent frameworks — a pipeline whose steps are
plain, readable functions is easier to demo, debug, and explain to doctors.

    Case input
      → 1. Case structuring      (LLM: extract findings, history, labs,
                                   demographics into a typed CaseSummary)
      → 2. Differential draft    (LLM: candidate conditions, each with
                                   supporting/contradicting findings from
                                   the case, ranked)
      → 3. Evidence retrieval    (PubMed E-utilities + local guidelines
                                   folder: fetch sources per candidate)
      → 4. Grounded revision     (LLM: revise/re-rank differential against
                                   retrieved evidence; attach citations;
                                   flag candidates with weak evidence)
      → 5. Discriminating workup (LLM: which findings/tests would best
                                   separate the top candidates)
      → Response + full trace

- Backend: FastAPI (Python). Each pipeline step is one pure function in
  `/backend/pipeline/`, with typed Pydantic models between steps.
- Every step's inputs, outputs, prompt, latency, and token counts are recorded
  into a Trace object returned with the response. The frontend renders this
  as an expandable "How this was generated" panel — this panel is a headline
  demo feature.
- Frontend: Next.js single page. Case input, differential display (each
  candidate expandable: reasoning / for-against findings / citations /
  suggested workup), trace panel, and a timer.
- Evidence sources for the POC: PubMed E-utilities API (free) and a
  `/guidelines/` folder of doctor-supplied guideline PDFs/text, searched with
  simple keyword + section matching. NO vector database yet — if naive
  retrieval proves insufficient in eval, ask the developer before adding one.
- One LLM provider via its official SDK. No gateway, no abstraction layer.

## Hard scope rules

- NEVER add: multi-agent frameworks, vector DBs (see above), queues,
  background workers, EMR integration, image/DICOM handling, drug-dosing
  logic, user management, or admin dashboards.
- Auth: single shared password. Doctor identity = dropdown/URL param.
- No database for core flow. Trial logging → single SQLite file.
- Ask before adding any dependency.

## Output contract (every differential item)

    {
      condition, rank,
      supporting_findings[],   // verbatim from the doctor's input
      contradicting_findings[],// verbatim from the doctor's input
      reasoning,               // 2-4 sentences, plain clinical language
      citations[],             // {source, title, year, url/id}
      evidence_strength,       // strong | moderate | weak | none-found
      discriminating_workup[]
    }

Rules the prompts must enforce:
- supporting/contradicting findings must QUOTE the doctor's input. If the
  model cannot point to input text, the finding doesn't exist.
- Rare-but-dangerous conditions ("can't-miss" diagnoses) that plausibly fit
  are always listed in a separate flagged section, even at low probability.
- If evidence retrieval finds nothing for a candidate, it is labeled
  "evidence: none-found", never silently kept with fabricated citations.
- Citations must come from step-3 retrieval results ONLY. The model must
  never generate a citation from memory — fabricated citations are the #1
  credibility killer with doctors.

## Evals (the real work)

- `/eval/cases/` holds anonymized real cases from the partner doctors, each
  with the doctor's own final diagnosis recorded as ground truth.
- `/eval/run-eval.py` runs the full pipeline over all cases and reports:
  top-1 / top-3 / top-5 hit rate of the ground-truth diagnosis, citation
  validity (do cited PMIDs exist and match?), and can't-miss coverage.
- Run after every prompt or pipeline change. Track scores over time in
  `/eval/history.md`. The demo claim you are building toward is "on your own
  cases, the correct diagnosis was in the top 3 X% of the time" — that number
  is the product.

## Data handling (non-negotiable)

- Only anonymized cases, ever. No names, IDs, DOBs, contacts in code, prompts,
  logs, or commits. Real cases in `/eval/cases/` are gitignored; keep one
  fully synthetic example case in the repo for structure.
- Never log case text in production. Log only: timestamp, doctor id, input
  length, per-step latency, and export events.
- `.env.local` / `.env`, keys, and real case data are gitignored.

## Working style

- One pipeline step per session: build it end-to-end with a stub after it,
  run the eval, commit.
- Ugly-but-working beats elegant-but-half-done. Flexibility lives in prompt
  files (`/backend/prompts/`), never in code abstractions.
- Update "Current status" below at the end of every session.

## Current status

- [ ] FastAPI skeleton + Next.js shell talking to it
- [ ] Step 1: case structuring → CaseSummary model
- [ ] Step 2: differential draft with for/against findings
- [ ] Step 3: PubMed retrieval + local guidelines search
- [ ] Step 4: grounded revision + citations + evidence strength
- [ ] Step 5: discriminating workup
- [ ] Trace object through all steps + frontend trace panel
- [ ] Can't-miss flagged section
- [ ] Eval harness + first scores on real cases
- [ ] Password gate, timer, disclaimer footer
- [ ] Trial logging (events only), deploy
