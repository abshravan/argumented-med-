"use client";

import { useEffect, useState } from "react";
import { User, Clock, Bell, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { Patient } from "@/lib/types";
import { BorderBeam } from "@/components/magicui/border-beam";

const TONE: Record<string, { color: string; bg: string; border: string }> = {
  emergency: { color: "#fca5a5", bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.3)" },
  urgent: { color: "#fcd34d", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.3)" },
  routine: { color: "#5eead4", bg: "rgba(45,212,191,0.14)", border: "rgba(45,212,191,0.3)" },
  stable: { color: "#93c5fd", bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.3)" },
};

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.4px" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

export default function PatientHeader({
  patient,
  insightsHidden,
  onToggleInsights,
}: {
  patient: Patient;
  insightsHidden: boolean;
  onToggleInsights: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const tone = TONE[patient.status.tone] || TONE.stable;
  const emergency = patient.status.tone === "emergency";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        padding: "12px 22px",
        background: "color-mix(in srgb, var(--bg) 86%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        className="card enter"
        style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 18, padding: "12px 18px", flexWrap: "wrap" }}
      >
        {emergency && <BorderBeam size={90} duration={6} colorFrom="#f87171" colorTo="#fbbf24" />}
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "rgba(56,189,248,0.12)",
            border: "1px solid rgba(56,189,248,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <User size={24} color="#38bdf8" strokeWidth={1.8} />
        </div>

        <div style={{ flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-bright)", letterSpacing: "-0.3px" }}>
              {patient.name}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              {patient.age > 0 ? `${patient.age} yrs · ${patient.gender}` : patient.gender}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 3 }}>{patient.mrn}</div>
        </div>

        <div style={{ width: 1, height: 36, background: "var(--border-strong)" }} />

        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <Field label="Blood" value={patient.bloodGroup} />
          <Field label="Weight" value={patient.weight} />
          <Field label="Height" value={patient.height} />
          <Field label="Visit" value={patient.visitType} />
        </div>

        <div style={{ width: 1, height: 36, background: "var(--border-strong)" }} />

        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Chief Complaint
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-bright)" }}>{patient.chiefComplaint}</div>
        </div>

        {/* Consultation duration */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 12px",
            borderRadius: 10,
            background: "var(--card-2)",
            border: "1px solid var(--border)",
            flex: "none",
          }}
          title="Consultation duration"
        >
          <Clock size={14} color="var(--text-muted)" />
          <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            {mm}:{ss}
          </span>
        </div>

        {/* Status badge */}
        <span
          className="chip"
          style={{
            color: tone.color,
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            padding: "5px 12px",
            fontSize: 12,
            ...(emergency ? { animation: "pulseRing 2s infinite" } : {}),
          }}
        >
          {emergency && <Bell size={12} />}
          {patient.status.label}
        </span>

        <button
          className="icon-btn"
          title={insightsHidden ? "Show AI insights" : "Hide AI insights"}
          onClick={onToggleInsights}
          style={{ width: 38, height: 38, flex: "none" }}
        >
          {insightsHidden ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
        </button>
      </div>
    </div>
  );
}
