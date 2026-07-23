"use client";

import { useState } from "react";
import {
  Copy,
  Save,
  RefreshCw,
  Maximize2,
  Minimize2,
  BookOpen,
  Download,
  Bookmark,
  Pencil,
  Check,
  ChevronDown,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import type { Message } from "@/lib/types";
import Markdown from "./Markdown";
import { BlurFade } from "@/components/magicui/blur-fade";

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 28,
        padding: "0 9px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: active ? "rgba(45,212,191,0.14)" : "transparent",
        color: active ? "var(--teal-bright)" : "var(--text-dim)",
        fontSize: 11.5,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.14s var(--ease)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = "var(--text-bright)";
          e.currentTarget.style.background = "rgba(148,163,184,0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = "var(--text-dim)";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <Icon size={13} />
      <span>{label}</span>
    </button>
  );
}

export default function MessageCard({
  message,
  onRegenerate,
  onBookmark,
  onEdit,
}: {
  message: Message;
  onRegenerate: (id: string) => void;
  onBookmark: (id: string) => void;
  onEdit: (id: string, content: string) => void;
}) {
  const isAI = message.role === "ai";
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const copy = () => {
    navigator.clipboard?.writeText(message.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const saveEdit = () => {
    onEdit(message.id, draft);
    setEditing(false);
  };

  return (
    <BlurFade
      offset={8}
      duration={0.45}
      className="flex w-full"
      style={{
        gap: 12,
        flexDirection: isAI ? "row" : "row-reverse",
        maxWidth: expanded ? "100%" : 760,
        marginLeft: isAI ? 0 : "auto",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
          background: isAI
            ? "linear-gradient(135deg,#8b5cf6,#22d3ee)"
            : "linear-gradient(135deg,#6366f1,#8b5cf6)",
          color: "#fff",
        }}
      >
        {isAI ? <Sparkles size={17} /> : <Stethoscope size={16} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Meta row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
            flexDirection: isAI ? "row" : "row-reverse",
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700, color: isAI ? "var(--purple-light)" : "var(--text)" }}>
            {isAI ? "MediAssist AI" : "Dr. John Doe"}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{timeLabel(message.timestamp)}</span>
          {message.bookmarked && <Bookmark size={12} color="var(--amber)" fill="var(--amber)" />}
        </div>

        {/* Card */}
        <div
          style={{
            background: isAI ? "var(--card)" : "var(--card-2)",
            border: `1px solid ${isAI ? "var(--border)" : "var(--border-strong)"}`,
            borderRadius: 14,
            padding: editing ? 12 : "14px 16px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {editing ? (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  minHeight: 90,
                  resize: "vertical",
                  background: "var(--bg)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 10,
                  padding: 12,
                  color: "var(--text)",
                  fontSize: 13.5,
                  lineHeight: 1.6,
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setEditing(false); setDraft(message.content); }}
                  style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  style={{ height: 30, padding: "0 14px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : isAI ? (
            <>
              {message.content ? (
                <Markdown content={message.content} />
              ) : (
                <div className="typing" style={{ padding: "4px 0" }}>
                  <span />
                  <span />
                  <span />
                </div>
              )}
              {message.streaming && message.content && <span className="stream-caret" />}

              {/* Expandable full reasoning */}
              {message.detail && !message.streaming && (
                <div style={{ marginTop: 4 }}>
                  <button
                    onClick={() => setShowDetail((v) => !v)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      border: "none",
                      color: "var(--primary-soft)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {message.detailLabel || "Show more"}
                    <ChevronDown size={14} style={{ transform: showDetail ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>
                  {showDetail && (
                    <div
                      className="enter-fade"
                      style={{
                        marginTop: 10,
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: "var(--text-muted)",
                      }}
                    >
                      {message.detail}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap" }}>
              {message.content}
            </div>
          )}
        </div>

        {/* Toolbar */}
        {!editing && !message.streaming && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 8,
              flexDirection: isAI ? "row" : "row-reverse",
            }}
          >
            {isAI ? (
              <>
                <ToolbarButton icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} active={copied} onClick={copy} />
                <ToolbarButton icon={Save} label="Save" onClick={() => onBookmark(message.id)} active={message.bookmarked} />
                <ToolbarButton icon={RefreshCw} label="Regenerate" onClick={() => onRegenerate(message.id)} />
                <ToolbarButton icon={expanded ? Minimize2 : Maximize2} label="Expand" onClick={() => setExpanded((v) => !v)} />
                <ToolbarButton icon={BookOpen} label="Reference" />
                <ToolbarButton icon={Download} label="Export" />
              </>
            ) : (
              <>
                <ToolbarButton icon={Pencil} label="Edit" onClick={() => { setEditing(true); setDraft(message.content); }} />
                <ToolbarButton icon={message.bookmarked ? Check : Bookmark} label={message.bookmarked ? "Bookmarked" : "Bookmark"} active={message.bookmarked} onClick={() => onBookmark(message.id)} />
                <ToolbarButton icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} active={copied} onClick={copy} />
              </>
            )}
          </div>
        )}
      </div>
    </BlurFade>
  );
}
