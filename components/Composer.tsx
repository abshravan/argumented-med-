"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, ClipboardPaste, ArrowUp, Square } from "lucide-react";

const SUGGESTIONS = [
  "Generate differential diagnosis",
  "Recommend investigations",
  "Interpret lab results",
  "Summarize consultation",
  "Suggest treatment options",
];

export default function Composer({
  onSend,
  onDraftChange,
  disabled,
  streaming,
}: {
  onSend: (text: string) => void;
  onDraftChange?: (text: string) => void;
  disabled?: boolean;
  streaming?: boolean;
}) {
  const [value, setValue] = useState("");
  const [recording, setRecording] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  useEffect(() => {
    onDraftChange?.(value);
  }, [value, onDraftChange]);

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div style={{ padding: "10px 22px 18px", background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}>
      {/* Suggested prompts */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSend(s)}
            disabled={disabled}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-soft)",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: "6px 13px",
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.5 : 1,
              transition: "all 0.14s var(--ease)",
            }}
            onMouseEnter={(e) => {
              if (disabled) return;
              e.currentTarget.style.borderColor = "rgba(45,212,191,0.35)";
              e.currentTarget.style.color = "var(--teal-bright)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-soft)";
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        className="card"
        style={{
          padding: "12px 12px 10px 16px",
          borderRadius: 16,
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-pop)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "var(--card)",
        }}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="Describe the patient's symptoms, examination findings, laboratory results or ask a clinical question..."
          style={{
            width: "100%",
            resize: "none",
            border: "none",
            background: "transparent",
            color: "var(--text)",
            fontSize: 14,
            lineHeight: 1.55,
            maxHeight: 200,
            padding: "2px 0",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="icon-btn"
              title="Voice input"
              onClick={() => setRecording((v) => !v)}
              style={{
                width: 36,
                height: 36,
                color: recording ? "#fff" : "var(--text-dim)",
                background: recording ? "var(--red)" : "transparent",
                borderColor: recording ? "var(--red)" : "var(--border)",
                ...(recording ? { animation: "pulseRing 1.6s infinite" } : {}),
              }}
            >
              {recording ? <Square size={14} fill="#fff" /> : <Mic size={16} />}
            </button>
            <button className="icon-btn" title="Attach reports (PDF, JPG, DICOM)" style={{ width: 36, height: 36 }}>
              <Paperclip size={16} />
            </button>
            <button className="icon-btn" title="Paste clinical notes" style={{ width: 36, height: 36 }}>
              <ClipboardPaste size={16} />
            </button>
            {recording && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--red-light)", paddingLeft: 4, fontWeight: 600 }}>
                <span className="typing"><span style={{ background: "var(--red-light)" }} /><span style={{ background: "var(--red-light)" }} /><span style={{ background: "var(--red-light)" }} /></span>
                Listening…
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
              {streaming ? "AI is responding…" : "⏎ to send · ⇧⏎ new line"}
            </span>
            <button
              onClick={submit}
              disabled={!value.trim() || disabled}
              title="Send"
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                border: "none",
                cursor: value.trim() && !disabled ? "pointer" : "default",
                background: value.trim() && !disabled ? "linear-gradient(135deg,#34d399,#10b981)" : "var(--card-2)",
                color: value.trim() && !disabled ? "#062018" : "var(--text-faint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s var(--ease)",
                boxShadow: value.trim() && !disabled ? "0 6px 18px rgba(16,185,129,0.28)" : "none",
              }}
            >
              <ArrowUp size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 10 }}>
        AI responses are for clinical decision support only and not a substitute for professional medical judgment.
      </div>
    </div>
  );
}
