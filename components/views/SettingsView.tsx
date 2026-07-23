"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Check, X, Loader2, ShieldCheck, Sun, Moon, Trash2 } from "lucide-react";
import { AppSettings, MODEL_SUGGESTIONS, Provider, loadSettings, saveSettings } from "@/lib/settings";
import { checkHealth, HealthInfo } from "@/lib/api";
import { clearAll } from "@/lib/store";
import { Session, getSession } from "@/lib/auth";
import { ViewShell } from "./ViewShell";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-bright)" }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3 }}>{hint}</div>}
      <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 38,
  minWidth: 260,
  background: "var(--bg)",
  border: "1px solid var(--border-strong)",
  borderRadius: 9,
  padding: "0 12px",
  color: "var(--text)",
  fontSize: 13,
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 20,
        border: "1px solid var(--border-strong)",
        background: on ? "rgba(52,211,153,0.25)" : "rgba(148,163,184,0.12)",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flex: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: on ? "var(--teal)" : "var(--text-faint)",
          transition: "left 0.2s var(--ease)",
        }}
      />
    </button>
  );
}

export default function SettingsView({
  theme,
  onToggleTheme,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
    setSession(getSession());
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const test = async () => {
    setStatus("testing");
    setMessage("");
    try {
      const info = await checkHealth(settings.apiBaseUrl);
      setHealth(info);
      setStatus("ok");
      const configured = info.availableProviders.includes(settings.provider);
      setMessage(
        configured
          ? `Connected. ${settings.provider} is configured (${info.models[settings.provider] ?? "default model"}).`
          : `Connected, but no API key is set for ${settings.provider} on the server. Add it to backend/.env.`,
      );
    } catch (e) {
      setStatus("fail");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ViewShell icon={SettingsIcon} title="Settings" subtitle="Model provider, workspace and data controls">
      <div style={{ maxWidth: 820 }}>
        <Section
          title="AI Engine"
          hint="The workspace talks to a local LangGraph backend. Turn this off to run entirely on seeded demo scenarios."
        >
          <Row label="Use AI backend" hint="When off, the workspace uses built-in demo cases (no API key needed)">
            <Toggle on={settings.useBackend} onChange={(v) => update({ useBackend: v })} />
          </Row>
          <Row label="Backend URL" hint="Where the FastAPI server is running">
            <input
              value={settings.apiBaseUrl}
              onChange={(e) => update({ apiBaseUrl: e.target.value })}
              style={inputStyle}
              placeholder="http://localhost:8000"
            />
          </Row>
          <Row label="Provider" hint="Gemini uses Google AI Studio; OpenRouter proxies many models">
            <div style={{ display: "flex", gap: 8 }}>
              {(["gemini", "openrouter"] as Provider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => update({ provider: p, model: "" })}
                  style={{
                    height: 36,
                    padding: "0 16px",
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    border: `1px solid ${settings.provider === p ? "rgba(45,212,191,0.35)" : "var(--border)"}`,
                    background: settings.provider === p ? "rgba(45,212,191,0.14)" : "transparent",
                    color: settings.provider === p ? "var(--teal-bright)" : "var(--text-dim)",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Model" hint="Leave blank to use the server default">
            <input
              value={settings.model}
              onChange={(e) => update({ model: e.target.value })}
              list="model-suggestions"
              style={inputStyle}
              placeholder={MODEL_SUGGESTIONS[settings.provider][0]}
            />
            <datalist id="model-suggestions">
              {MODEL_SUGGESTIONS[settings.provider].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Row>
          <Row label="Temperature" hint="Lower is more deterministic — recommended for clinical use">
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260 }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={settings.temperature}
                onChange={(e) => update({ temperature: Number(e.target.value) })}
                style={{ flex: 1, accentColor: "var(--teal)" }}
              />
              <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", width: 30 }}>
                {settings.temperature.toFixed(1)}
              </span>
            </div>
          </Row>
          <Row label="Connection" hint="Verify the backend is reachable and the key is configured">
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={test}
                disabled={status === "testing"}
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 9,
                  border: "1px solid rgba(37,99,235,0.35)",
                  background: "linear-gradient(135deg,rgba(37,99,235,0.22),rgba(37,99,235,0.10))",
                  color: "#dbe6ff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {status === "testing" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : status === "ok" ? (
                  <Check size={14} />
                ) : status === "fail" ? (
                  <X size={14} />
                ) : null}
                Test connection
              </button>
            </div>
          </Row>
          {message && (
            <div
              style={{
                fontSize: 12.5,
                padding: "10px 13px",
                borderRadius: 9,
                lineHeight: 1.5,
                color: status === "ok" ? "var(--teal-bright)" : "var(--red-light)",
                background: status === "ok" ? "rgba(45,212,191,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${status === "ok" ? "rgba(45,212,191,0.25)" : "rgba(239,68,68,0.25)"}`,
              }}
            >
              {message}
              {health && status === "ok" && (
                <div style={{ color: "var(--text-dim)", marginTop: 5 }}>
                  Server default: {health.defaultProvider} · Configured:{" "}
                  {health.availableProviders.length ? health.availableProviders.join(", ") : "none"}
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title="Workspace">
          <Row label="Theme" hint="Dark is optimised for low-light clinical environments">
            <button
              onClick={onToggleTheme}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 9,
                border: "1px solid var(--border-strong)",
                background: "transparent",
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
              {theme === "dark" ? "Dark" : "Light"}
            </button>
          </Row>
          <Row label="Keyboard shortcuts" hint="Ctrl/⌘+B sidebar · Ctrl/⌘+I insights · Enter send">
            <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Always on</span>
          </Row>
        </Section>

        <Section title="Profile" hint="From the account you signed in with">
          <Row label="Name" hint="Shown on notes and signatures">
            <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{session?.name ?? "—"}</span>
          </Row>
          <Row label="Email">
            <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{session?.email ?? "—"}</span>
          </Row>
          <Row label="Role">
            <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{session?.role ?? "—"}</span>
          </Row>
          <Row label="Specialty">
            <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{session?.specialty || "—"}</span>
          </Row>
          <Row label="Organization">
            <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{session?.organization || "—"}</span>
          </Row>
        </Section>

        <Section title="Data & Safety">
          <Row label="Where consultations are stored" hint="This browser's local storage only — nothing is uploaded">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--teal)" }}>
              <ShieldCheck size={15} /> Local only
            </span>
          </Row>
          <Row label="Clear all consultations" hint="Deletes history, saved cases and favorites from this browser">
            <button
              onClick={() => {
                if (confirm("Delete all stored consultations from this browser? This cannot be undone.")) clearAll();
              }}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 9,
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)",
                color: "var(--red-light)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Trash2 size={14} /> Clear data
            </button>
          </Row>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.55 }}>
            MediAssist is a clinical decision-support tool. It does not diagnose, treat, or replace professional
            medical judgment. Every suggestion requires clinician review.
          </div>
        </Section>
      </div>
    </ViewShell>
  );
}
