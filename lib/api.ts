"use client";

import type { Patient } from "./types";
import type { Provider } from "./settings";

export interface HealthInfo {
  status: string;
  defaultProvider: string;
  availableProviders: string[];
  models: Record<string, string>;
}

export class ConnectionError extends Error {}

export async function checkHealth(baseUrl: string, timeoutMs = 4000): Promise<HealthInfo> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`, {
      signal: ctrl.signal,
    });
    if (!res.ok) throw new ConnectionError(`Server responded ${res.status}`);
    return (await res.json()) as HealthInfo;
  } catch (e) {
    if (e instanceof ConnectionError) throw e; // keep the specific message
    throw new ConnectionError(
      e instanceof Error && e.name === "AbortError"
        ? "Timed out reaching the backend"
        : `Could not reach ${baseUrl}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Map the backend's status label onto the frontend patient badge tone. */
const TONE: Record<string, Patient["status"]["tone"]> = {
  Emergency: "emergency",
  Urgent: "urgent",
  Routine: "routine",
  Stable: "stable",
};

export function toPatient(raw: Record<string, unknown> | null | undefined): Patient | null {
  if (!raw) return null;
  const label = String(raw.statusLabel ?? "Stable");
  return {
    name: String(raw.name ?? "New Patient"),
    age: Number(raw.age ?? 0),
    gender: String(raw.gender ?? "—"),
    weight: String(raw.weight ?? "—"),
    height: String(raw.height ?? "—"),
    bloodGroup: String(raw.bloodGroup ?? "—"),
    chiefComplaint: String(raw.chiefComplaint ?? "Awaiting history"),
    visitType: String(raw.visitType ?? "OPD · Consultation"),
    mrn: String(raw.mrn ?? "MRN — pending"),
    status: { label, tone: TONE[label] ?? "stable" },
  };
}

export interface StreamHandlers {
  onToken: (text: string) => void;
  onInsight: (node: string, data: Record<string, unknown>) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

export interface StreamOptions extends StreamHandlers {
  baseUrl: string;
  provider: Provider;
  model?: string;
  temperature?: number;
  messages: { role: "doctor" | "ai"; content: string }[];
  /** Confirmed demographics from the PMS, so the model doesn't have to infer them. */
  patient?: Patient | null;
  signal?: AbortSignal;
}

/** Frontend patient → backend PatientSummary shape. */
function toPatientSummary(p: Patient) {
  return {
    name: p.name,
    age: p.age,
    gender: p.gender,
    weight: p.weight,
    height: p.height,
    bloodGroup: p.bloodGroup,
    chiefComplaint: p.chiefComplaint,
    visitType: p.visitType,
    mrn: p.mrn,
    statusLabel: p.status.label,
  };
}

/**
 * POST to the SSE endpoint and dispatch `token` / `insight` / `error` frames.
 * Uses fetch + a stream reader because EventSource cannot issue POST requests.
 */
export async function streamConsult(opts: StreamOptions): Promise<void> {
  const { baseUrl, provider, model, temperature, messages, patient, signal } = opts;

  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/consult/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        provider,
        model: model || undefined,
        temperature,
        patient: patient ? toPatientSummary(patient) : undefined,
      }),
      signal,
    });
  } catch {
    throw new ConnectionError(`Could not reach ${baseUrl}`);
  }

  if (!res.ok) {
    let detail = `Server responded ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* keep the status-code message */
    }
    // 503 = provider not configured; that's actionable, not a connection failure.
    if (res.status === 503) {
      opts.onError(detail);
      opts.onDone();
      return;
    }
    throw new Error(detail);
  }

  if (!res.body) throw new ConnectionError("Streaming is not supported by this browser.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleFrame = (frame: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch {
      return;
    }

    if (event === "token") opts.onToken(String(payload.text ?? ""));
    else if (event === "insight")
      opts.onInsight(String(payload.node ?? ""), (payload.data as Record<string, unknown>) ?? {});
    else if (event === "error") opts.onError(String(payload.message ?? "Unknown error"));
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (frame.trim()) handleFrame(frame);
    }
  }
  if (buffer.trim()) handleFrame(buffer);

  opts.onDone();
}
