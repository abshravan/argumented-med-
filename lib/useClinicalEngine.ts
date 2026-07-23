"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Insights, Message, Patient, Differential } from "./types";
import { GENERIC_SCENARIO, matchScenario } from "./scenarios";

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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function sortDiffs(d: Differential[]): Differential[] {
  return [...d].sort((a, b) => b.confidence - a.confidence);
}

export interface EngineState {
  started: boolean;
  patient: Patient | null;
  messages: Message[];
  insights: Insights;
  revealed: Record<RevealKey, boolean>;
  streaming: boolean;
  scenarioId: string;
}

const EMPTY_INSIGHTS: Insights = GENERIC_SCENARIO.insights;

export function useClinicalEngine() {
  const [state, setState] = useState<EngineState>({
    started: false,
    patient: null,
    messages: [],
    insights: EMPTY_INSIGHTS,
    revealed: {
      diagnosis: false,
      differentials: false,
      investigations: false,
      redflags: false,
      followups: false,
      soap: false,
      references: false,
    },
    scenarioId: "general",
  });

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (streamTimer.current) {
      clearInterval(streamTimer.current);
      streamTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /** Stream target text word-by-word into a given AI message. */
  const streamInto = useCallback((messageId: string, full: string, onDone?: () => void) => {
    const words = full.split(/(\s+)/); // keep whitespace tokens
    let i = 0;
    setState((s) => ({ ...s, streaming: true }));
    streamTimer.current = setInterval(() => {
      i += 2;
      const partial = words.slice(0, i).join("");
      const done = i >= words.length;
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, content: done ? full : partial, streaming: !done } : m
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

  /** Progressively reveal insight cards, one every ~380ms. */
  const revealInsights = useCallback((delayStart = 300) => {
    REVEAL_ORDER.forEach((key, idx) => {
      const t = setTimeout(() => {
        setState((s) => ({ ...s, revealed: { ...s.revealed, [key]: true } }));
      }, delayStart + idx * 380);
      timers.current.push(t);
    });
  }, []);

  const start = useCallback(
    (query: string) => {
      clearTimers();
      const scenario = matchScenario(query);
      const aiId = uid();
      const doctorNote: Message = {
        id: uid(),
        role: "doctor",
        content: query,
        timestamp: Date.now(),
      };
      const aiMsg: Message = {
        id: aiId,
        role: "ai",
        content: "",
        streaming: true,
        timestamp: Date.now() + 1,
        detail: scenario.aiOpeningDetail,
        detailLabel: "Show full reasoning",
      };

      setState({
        started: true,
        patient: scenario.patient,
        scenarioId: scenario.id,
        messages: [doctorNote, aiMsg],
        insights: { ...scenario.insights, differentials: sortDiffs(scenario.insights.differentials) },
        revealed: {
          diagnosis: false,
          differentials: false,
          investigations: false,
          redflags: false,
          followups: false,
          soap: false,
          references: false,
        },
        streaming: true,
      });

      // brief "thinking" pause, then stream + reveal
      const t = setTimeout(() => {
        streamInto(aiId, scenario.aiOpening);
        revealInsights(600);
      }, 620);
      timers.current.push(t);
    },
    [clearTimers, revealInsights, streamInto]
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!state.started) {
        start(trimmed);
        return;
      }
      clearTimers();
      const aiId = uid();
      const doctorMsg: Message = { id: uid(), role: "doctor", content: trimmed, timestamp: Date.now() };
      const aiMsg: Message = {
        id: aiId,
        role: "ai",
        content: "",
        streaming: true,
        timestamp: Date.now() + 1,
      };

      // Each new signal nudges confidence up and can re-rank differentials.
      setState((s) => {
        const dx = s.insights.diagnosis
          ? { ...s.insights.diagnosis, confidence: Math.min(97, s.insights.diagnosis.confidence + 3) }
          : null;
        const jittered = s.insights.differentials.map((d, idx) => ({
          ...d,
          confidence: Math.max(4, Math.min(97, d.confidence + (idx === 0 ? 3 : Math.round((Math.random() - 0.55) * 6)))),
        }));
        return {
          ...s,
          messages: [...s.messages, doctorMsg, aiMsg],
          insights: { ...s.insights, diagnosis: dx, differentials: sortDiffs(jittered) },
          streaming: true,
        };
      });

      const reply = buildReply(trimmed);
      const t = setTimeout(() => streamInto(aiId, reply), 500);
      timers.current.push(t);
    },
    [state.started, start, clearTimers, streamInto]
  );

  const regenerate = useCallback(
    (messageId: string) => {
      clearTimers();
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) => (m.id === messageId ? { ...m, content: "", streaming: true } : m)),
        streaming: true,
      }));
      const t = setTimeout(() => {
        const msg = state.messages.find((m) => m.id === messageId);
        streamInto(messageId, msg?.content || "Regenerated clinical response.");
      }, 450);
      timers.current.push(t);
    },
    [clearTimers, state.messages, streamInto]
  );

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
    setState({
      started: false,
      patient: null,
      messages: [],
      insights: EMPTY_INSIGHTS,
      revealed: {
        diagnosis: false,
        differentials: false,
        investigations: false,
        redflags: false,
        followups: false,
        soap: false,
        references: false,
      },
      scenarioId: "general",
    });
  }, [clearTimers]);

  /** Live "as the doctor types" nudge — very light, subtle confidence lift. */
  const draftSignal = useRef(0);
  const observeDraft = useCallback((draft: string) => {
    if (!state.started || state.streaming) return;
    const len = draft.trim().length;
    const bucket = Math.floor(len / 40);
    if (bucket > draftSignal.current && bucket <= 4) {
      draftSignal.current = bucket;
      setState((s) => {
        if (!s.insights.diagnosis) return s;
        return {
          ...s,
          insights: {
            ...s.insights,
            diagnosis: { ...s.insights.diagnosis, confidence: Math.min(96, s.insights.diagnosis.confidence + 1) },
          },
        };
      });
    }
  }, [state.started, state.streaming]);

  return {
    ...state,
    send,
    start,
    regenerate,
    toggleBookmark,
    editMessage,
    newConsultation,
    observeDraft,
  };
}

/** Canned contextual reply for follow-up messages. */
function buildReply(text: string): string {
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

I've re-ranked the differentials on the right as the confidence has shifted with the new information.

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

The *Plan* section of the live SOAP summary has been updated. Please tailor to allergies, comorbidities, and local policy — **you approve every action**.`;
  }
  if (t.includes("summar") || t.includes("soap") || t.includes("note")) {
    return `## Consultation summary

I've kept a structured **SOAP** note updating in the insights panel:

- **S** — the history in the patient's words
- **O** — examination and objective data
- **A** — the working assessment and confidence
- **P** — the proposed plan

You can **export** it to the record from the message toolbar once you're happy with it.`;
  }
  return `Noted — I've incorporated that into the assessment. The differential ranking, recommended investigations, and the live SOAP summary on the right have been updated accordingly.

Would you like me to **generate a differential**, **recommend investigations**, or **draft the SOAP note**? You remain the final decision-maker on every suggestion.`;
}
