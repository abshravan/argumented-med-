"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Differential, Insights, Message, Patient } from "./types";
import { GENERIC_SCENARIO, matchScenario } from "./scenarios";
import { ConnectionError, streamConsult, toPatient } from "./api";
import { loadSettings } from "./settings";
import {
  ConsultationRecord,
  getConsultation,
  titleFromText,
  upsertConsultation,
} from "./store";

export type RevealKey =
  | "diagnosis"
  | "differentials"
  | "investigations"
  | "redflags"
  | "followups"
  | "soap"
  | "references";

const REVEAL_ORDER: RevealKey[] = [
  "diagnosis",
  "differentials",
  "investigations",
  "redflags",
  "followups",
  "soap",
  "references",
];

const NO_REVEAL: Record<RevealKey, boolean> = {
  diagnosis: false,
  differentials: false,
  investigations: false,
  redflags: false,
  followups: false,
  soap: false,
  references: false,
};

/** Which reveal flags each backend graph node satisfies. */
const NODE_REVEALS: Record<string, RevealKey[]> = {
  diagnose: ["diagnosis", "differentials"],
  workup: ["investigations", "redflags"],
  followups: ["followups"],
  documentation: ["soap"],
  evidence: ["references"],
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function sortDiffs(d: Differential[]): Differential[] {
  return [...d].sort((a, b) => b.confidence - a.confidence);
}

function provisionalPatient(query: string): Patient {
  return {
    ...GENERIC_SCENARIO.patient,
    chiefComplaint: titleFromText(query),
    visitType: "OPD · Consultation",
  };
}

export interface EngineState {
  id: string;
  started: boolean;
  patient: Patient | null;
  /** True when the patient came from the PMS lookup / intake form — never overwrite it. */
  patientLocked: boolean;
  messages: Message[];
  insights: Insights;
  revealed: Record<RevealKey, boolean>;
  streaming: boolean;
  scenarioId: string;
  mode: "backend" | "demo";
  error: string | null;
  startedAt: number;
}

const EMPTY_INSIGHTS: Insights = GENERIC_SCENARIO.insights;

function freshState(): EngineState {
  return {
    id: uid(),
    started: false,
    patient: null,
    patientLocked: false,
    messages: [],
    insights: EMPTY_INSIGHTS,
    revealed: { ...NO_REVEAL },
    streaming: false,
    scenarioId: "general",
    mode: "demo",
    error: null,
    startedAt: Date.now(),
  };
}

export function useClinicalEngine() {
  const [state, setState] = useState<EngineState>(freshState);

  /** Mirror of state for reads inside callbacks (setState updaters may be deferred). */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (streamTimer.current) {
      clearInterval(streamTimer.current);
      streamTimer.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // ---- persistence -------------------------------------------------------
  useEffect(() => {
    if (!state.started || state.streaming) return;
    const firstDoctor = state.messages.find((m) => m.role === "doctor");
    const record: ConsultationRecord = {
      id: state.id,
      title: titleFromText(firstDoctor?.content ?? state.patient?.chiefComplaint ?? ""),
      startedAt: state.startedAt,
      updatedAt: Date.now(),
      patient: state.patient,
      messages: state.messages,
      insights: state.insights,
      // Never clobber a flag the user set from the Saved Cases view.
      saved: getConsultation(state.id)?.saved ?? false,
      mode: state.mode,
    };
    upsertConsultation(record);
  }, [state.started, state.streaming, state.messages, state.insights, state.patient, state.id, state.startedAt, state.mode]);

  // =======================================================================
  // Demo (offline) engine — the seeded scenarios
  // =======================================================================
  const streamInto = useCallback((messageId: string, full: string, onDone?: () => void) => {
    const words = full.split(/(\s+)/);
    let i = 0;
    setState((s) => ({ ...s, streaming: true }));
    streamTimer.current = setInterval(() => {
      i += 2;
      const partial = words.slice(0, i).join("");
      const done = i >= words.length;
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, content: done ? full : partial, streaming: !done } : m,
        ),
        streaming: !done,
      }));
      if (done && streamTimer.current) {
        clearInterval(streamTimer.current);
        streamTimer.current = null;
        onDone?.();
      }
    }, 26);
  }, []);

  const revealInsights = useCallback((delayStart = 300) => {
    REVEAL_ORDER.forEach((key, idx) => {
      const t = setTimeout(() => {
        setState((s) => ({ ...s, revealed: { ...s.revealed, [key]: true } }));
      }, delayStart + idx * 380);
      timers.current.push(t);
    });
  }, []);

  const runDemo = useCallback(
    (query: string, aiId: string, isFirst: boolean) => {
      const scenario = matchScenario(query);
      if (isFirst) {
        setState((s) => ({
          ...s,
          mode: "demo",
          // Keep a patient chosen from the PMS; only fall back to the scenario's.
          patient: s.patientLocked ? s.patient : scenario.patient,
          scenarioId: scenario.id,
          insights: { ...scenario.insights, differentials: sortDiffs(scenario.insights.differentials) },
          revealed: { ...NO_REVEAL },
          messages: s.messages.map((m) =>
            m.id === aiId
              ? { ...m, detail: scenario.aiOpeningDetail, detailLabel: "Show full reasoning" }
              : m,
          ),
        }));
        const t = setTimeout(() => {
          streamInto(aiId, scenario.aiOpening);
          revealInsights(600);
        }, 500);
        timers.current.push(t);
      } else {
        const t = setTimeout(() => streamInto(aiId, buildDemoReply(query)), 450);
        timers.current.push(t);
      }
    },
    [revealInsights, streamInto],
  );

  // =======================================================================
  // Backend engine — LangGraph over Gemini / OpenRouter
  // =======================================================================
  const applyInsight = useCallback((node: string, data: Record<string, unknown>) => {
    setState((s) => {
      const next: EngineState = { ...s, insights: { ...s.insights }, revealed: { ...s.revealed } };

      if (node === "intake" && data.patient) {
        // A PMS record is authoritative — don't let extraction overwrite it.
        if (s.patientLocked) return s;
        const p = toPatient(data.patient as Record<string, unknown>);
        if (p) next.patient = p;
        return next;
      }

      if (data.diagnosis !== undefined) next.insights.diagnosis = data.diagnosis as Insights["diagnosis"];
      if (Array.isArray(data.differentials))
        next.insights.differentials = sortDiffs(data.differentials as Differential[]);
      if (Array.isArray(data.investigations))
        next.insights.investigations = data.investigations as Insights["investigations"];
      if (Array.isArray(data.redFlags)) next.insights.redFlags = data.redFlags as Insights["redFlags"];
      if (Array.isArray(data.followUps)) next.insights.followUps = data.followUps as string[];
      if (data.soap) next.insights.soap = data.soap as Insights["soap"];
      if (Array.isArray(data.references))
        next.insights.references = data.references as Insights["references"];

      for (const key of NODE_REVEALS[node] ?? []) next.revealed[key] = true;
      return next;
    });
  }, []);

  const runBackend = useCallback(
    async (history: Message[], aiId: string, query: string, isFirst: boolean) => {
      const settings = loadSettings();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const payload = history
        .filter((m) => m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }));

      // Give the model the confirmed PMS demographics rather than making it guess.
      const current = stateRef.current;
      const patientContext = current.patientLocked ? current.patient : null;

      try {
        await streamConsult({
          baseUrl: settings.apiBaseUrl,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature,
          messages: payload,
          patient: patientContext,
          signal: ctrl.signal,
          onToken: (text) =>
            setState((s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === aiId ? { ...m, content: m.content + text } : m,
              ),
            })),
          onInsight: applyInsight,
          onError: (message) =>
            setState((s) => ({
              ...s,
              error: message,
              messages: s.messages.map((m) =>
                m.id === aiId && !m.content
                  ? { ...m, content: `## Unable to reach the model\n\n${message}` }
                  : m,
              ),
            })),
          onDone: () =>
            setState((s) => ({
              ...s,
              streaming: false,
              messages: s.messages.map((m) => (m.id === aiId ? { ...m, streaming: false } : m)),
            })),
        });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        // Backend unreachable → fall back to the seeded demo so the workspace still works.
        if (e instanceof ConnectionError) {
          setState((s) => ({
            ...s,
            mode: "demo",
            error: `${e.message} — running on demo data. Start the backend or switch to demo mode in Settings.`,
          }));
          runDemo(query, aiId, isFirst);
          return;
        }
        setState((s) => ({
          ...s,
          streaming: false,
          error: e instanceof Error ? e.message : String(e),
          messages: s.messages.map((m) => (m.id === aiId ? { ...m, streaming: false } : m)),
        }));
      }
    },
    [applyInsight, runDemo],
  );

  // =======================================================================
  // Public API
  // =======================================================================
  const dispatch = useCallback(
    (query: string, isFirst: boolean) => {
      clearTimers();
      const settings = loadSettings();
      const useBackend = settings.useBackend;
      const aiId = uid();

      const doctorMsg: Message = { id: uid(), role: "doctor", content: query, timestamp: Date.now() };
      const aiMsg: Message = {
        id: aiId,
        role: "ai",
        content: "",
        streaming: true,
        timestamp: Date.now() + 1,
      };

      // Compute the transcript up front — a deferred setState updater cannot be
      // relied on to produce it before the network call is made.
      const prev = stateRef.current;
      const priorMessages = isFirst ? [] : prev.messages;
      const messages = [...priorMessages, doctorMsg, aiMsg];
      // A patient chosen in the intake step survives the reset that starts a consultation.
      const lockedPatient = prev.patientLocked ? prev.patient : null;

      setState((s) => {
        const base: EngineState = isFirst
          ? { ...freshState(), id: s.id, started: true }
          : s;

        // Each new signal nudges the leading diagnosis in demo mode.
        const insights = isFirst
          ? base.insights
          : {
              ...s.insights,
              diagnosis: s.insights.diagnosis
                ? { ...s.insights.diagnosis, confidence: Math.min(97, s.insights.diagnosis.confidence + 3) }
                : null,
              differentials: sortDiffs(s.insights.differentials),
            };

        return {
          ...base,
          started: true,
          mode: useBackend ? "backend" : "demo",
          error: null,
          streaming: true,
          insights: useBackend && isFirst ? EMPTY_INSIGHTS : insights,
          patientLocked: isFirst ? !!lockedPatient : s.patientLocked,
          patient: isFirst
            ? lockedPatient ?? (useBackend ? provisionalPatient(query) : null)
            : s.patient,
          messages,
        };
      });

      if (useBackend) {
        // Send the conversation *including* the new doctor turn, minus the empty AI placeholder.
        void runBackend(messages.slice(0, -1), aiId, query, isFirst);
      } else {
        runDemo(query, aiId, isFirst);
      }
    },
    [clearTimers, runBackend, runDemo],
  );

  const start = useCallback((query: string) => dispatch(query.trim(), true), [dispatch]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      dispatch(trimmed, !stateRef.current.started);
    },
    [dispatch],
  );

  const regenerate = useCallback(
    (messageId: string) => {
      const idx = state.messages.findIndex((m) => m.id === messageId);
      if (idx <= 0) return;
      const prompt = [...state.messages.slice(0, idx)].reverse().find((m) => m.role === "doctor");
      if (!prompt) return;

      clearTimers();
      setState((s) => ({
        ...s,
        streaming: true,
        error: null,
        messages: s.messages.map((m) => (m.id === messageId ? { ...m, content: "", streaming: true } : m)),
      }));

      const settings = loadSettings();
      if (settings.useBackend && state.mode === "backend") {
        void runBackend(state.messages.slice(0, idx), messageId, prompt.content, false);
      } else {
        const t = setTimeout(() => streamInto(messageId, buildDemoReply(prompt.content)), 400);
        timers.current.push(t);
      }
    },
    [clearTimers, runBackend, state.messages, state.mode, streamInto],
  );

  const stop = useCallback(() => {
    clearTimers();
    setState((s) => ({
      ...s,
      streaming: false,
      messages: s.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    }));
  }, [clearTimers]);

  const toggleBookmark = useCallback((messageId: string) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m)),
    }));
  }, []);

  const editMessage = useCallback((messageId: string, content: string) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
    }));
  }, []);

  const newConsultation = useCallback(() => {
    clearTimers();
    setState(freshState());
  }, [clearTimers]);

  /** Attach a patient from the PMS lookup / intake form, before any message is sent. */
  const selectPatient = useCallback((patient: Patient) => {
    setState((s) => ({ ...s, patient, patientLocked: true }));
  }, []);

  /** Re-open a stored consultation (from History / Saved / Favorites). */
  const loadConsultation = useCallback(
    (record: ConsultationRecord) => {
      clearTimers();
      setState({
        id: record.id,
        started: true,
        patient: record.patient,
        patientLocked: !!record.patient,
        messages: record.messages,
        insights: record.insights,
        revealed: {
          diagnosis: !!record.insights.diagnosis,
          differentials: record.insights.differentials.length > 0,
          investigations: record.insights.investigations.length > 0,
          redflags: true,
          followups: record.insights.followUps.length > 0,
          soap: !!record.insights.soap?.a,
          references: record.insights.references.length > 0,
        },
        streaming: false,
        scenarioId: "general",
        mode: record.mode,
        error: null,
        startedAt: record.startedAt,
      });
    },
    [clearTimers],
  );

  const dismissError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  // Light "as the doctor types" confidence nudge (demo mode only).
  const draftSignal = useRef(0);
  const observeDraft = useCallback(
    (draft: string) => {
      if (!state.started || state.streaming || state.mode !== "demo") return;
      const bucket = Math.floor(draft.trim().length / 40);
      if (bucket > draftSignal.current && bucket <= 4) {
        draftSignal.current = bucket;
        setState((s) => {
          if (!s.insights.diagnosis) return s;
          return {
            ...s,
            insights: {
              ...s.insights,
              diagnosis: {
                ...s.insights.diagnosis,
                confidence: Math.min(96, s.insights.diagnosis.confidence + 1),
              },
            },
          };
        });
      }
    },
    [state.started, state.streaming, state.mode],
  );

  return {
    ...state,
    send,
    start,
    stop,
    regenerate,
    toggleBookmark,
    editMessage,
    newConsultation,
    loadConsultation,
    selectPatient,
    observeDraft,
    dismissError,
  };
}

/** Canned contextual reply used when running without a backend. */
function buildDemoReply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("investigation") || t.includes("test") || t.includes("workup")) {
    return `## Recommended investigations

Based on the current picture, prioritise:

1. **First-line bedside / bloods** — fast, high-yield, low cost.
2. **Confirmatory imaging** — reserve higher-radiation studies for when first-line is inconclusive.
3. **Baseline safety labs** before any intervention.

I've refreshed the *Recommended Investigations* card with priority and rationale. Order per your local pathway.`;
  }
  if (t.includes("differential") || t.includes("cause") || t.includes("ddx")) {
    return `## Differential reasoning

I've re-ranked the differentials on the right as confidence shifted with the new information.

- The leading diagnosis remains most consistent with the history and exam.
- Lower-ranked items stay on the list until definitively excluded.

Ask me to *explain any single differential* for its supporting and opposing evidence.`;
  }
  if (t.includes("treat") || t.includes("manage") || t.includes("plan")) {
    return `## Suggested management

A pragmatic, guideline-aligned plan:

- **Stabilise & supportive care** first.
- **Targeted therapy** once the working diagnosis is confirmed.
- **Safety-netting** and clear review criteria.

The *Plan* section of the live SOAP summary has been updated. Tailor to allergies, comorbidities and local policy — **you approve every action**.`;
  }
  if (t.includes("summar") || t.includes("soap") || t.includes("note")) {
    return `## Consultation summary

I've kept a structured **SOAP** note updating in the insights panel:

- **S** — the history in the patient's words
- **O** — examination and objective data
- **A** — the working assessment and confidence
- **P** — the proposed plan

**Export** it to the record from the message toolbar once you're happy with it.`;
  }
  return `Noted — I've incorporated that into the assessment. The differential ranking, recommended investigations and the live SOAP summary on the right have been updated accordingly.

Would you like me to **generate a differential**, **recommend investigations**, or **draft the SOAP note**? You remain the final decision-maker on every suggestion.`;
}
