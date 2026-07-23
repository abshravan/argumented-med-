"use client";

import { AlertCircle } from "lucide-react";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 7 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  background: "var(--card)",
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  padding: "0 14px",
  color: "var(--text)",
  fontSize: 13.5,
};

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 46,
        width: "100%",
        background: disabled ? "var(--card-2)" : "linear-gradient(135deg,#34d399,#10b981)",
        border: "none",
        borderRadius: 10,
        color: disabled ? "var(--text-faint)" : "#062018",
        fontSize: 14,
        fontWeight: 800,
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled ? "none" : "0 6px 18px rgba(16,185,129,0.28)",
        transition: "transform 0.12s var(--ease)",
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
    >
      {children}
    </button>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      className="enter"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        padding: "10px 12px",
        borderRadius: 9,
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.28)",
        color: "var(--red-soft)",
        fontSize: 12.5,
        lineHeight: 1.5,
      }}
    >
      <AlertCircle size={15} style={{ flex: "none", marginTop: 1 }} />
      <span>{message}</span>
    </div>
  );
}

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}>
      <span style={{ flex: 1, height: 1, background: "var(--border-strong)" }} />
      <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "var(--border-strong)" }} />
    </div>
  );
}

export function SsoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 44,
        width: "100%",
        background: "rgba(148,163,184,0.06)",
        border: "1px solid var(--border-strong)",
        borderRadius: 10,
        color: "var(--text-soft)",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          background: "linear-gradient(135deg,#38bdf8,#6366f1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 9,
          fontWeight: 800,
        }}
      >
        SSO
      </span>
      Continue with hospital SSO
    </button>
  );
}

export function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 12.5,
    fontWeight: 600,
    padding: "7px 13px",
    borderRadius: 8,
    cursor: "pointer",
    border: active ? "1px solid transparent" : "1px solid var(--border-strong)",
    color: active ? "#062018" : "var(--text-soft)",
    background: active ? "var(--teal)" : "rgba(148,163,184,0.08)",
    transition: "all 0.14s var(--ease)",
  };
}
