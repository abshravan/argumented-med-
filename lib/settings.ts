"use client";

export type Provider = "gemini" | "openrouter";

export interface AppSettings {
  /** When false the workspace runs entirely on the seeded demo scenarios. */
  useBackend: boolean;
  apiBaseUrl: string;
  provider: Provider;
  /** Empty string = use whatever the server has configured. */
  model: string;
  temperature: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  useBackend: true,
  apiBaseUrl: "http://localhost:8000",
  provider: "gemini",
  model: "",
  temperature: 0.2,
};

const KEY = "mediassist:settings";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("mediassist:settings-changed"));
  } catch {
    /* storage unavailable — settings stay in-memory for this session */
  }
}

export const MODEL_SUGGESTIONS: Record<Provider, string[]> = {
  gemini: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"],
  openrouter: [
    "anthropic/claude-sonnet-4.5",
    "google/gemini-2.0-flash-001",
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.3-70b-instruct",
  ],
};
