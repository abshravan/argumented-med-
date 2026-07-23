"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Bookmark, Search, Trash2, MessageSquare, ArrowUpRight, Star } from "lucide-react";
import {
  ConsultationRecord,
  deleteConsultation,
  listConsultations,
  onStoreChange,
  setSaved,
} from "@/lib/store";
import { ViewShell, EmptyHint, TONE_CHIP, relativeTime } from "./ViewShell";
import { MagicCard } from "@/components/magicui/magic-card";

/** Backs both "Consultation History" and "Saved Cases" — same list, different filter. */
export default function ConsultationListView({
  variant,
  onOpen,
}: {
  variant: "history" | "saved";
  onOpen: (record: ConsultationRecord) => void;
}) {
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refresh = () => setRecords(listConsultations());
    refresh();
    return onStoreChange(refresh);
  }, []);

  const filtered = useMemo(() => {
    const base = variant === "saved" ? records.filter((r) => r.saved) : records;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.patient?.name.toLowerCase().includes(q) ||
        r.patient?.chiefComplaint.toLowerCase().includes(q) ||
        r.insights.diagnosis?.name.toLowerCase().includes(q),
    );
  }, [records, query, variant]);

  const isSaved = variant === "saved";

  return (
    <ViewShell
      icon={isSaved ? Bookmark : History}
      title={isSaved ? "Saved Cases" : "Consultation History"}
      subtitle={
        isSaved
          ? "Cases you've bookmarked for teaching, audit or follow-up"
          : "Every consultation from this workspace, most recent first"
      }
      actions={
        <div style={{ position: "relative", width: 260 }}>
          <Search
            size={15}
            color="var(--text-faint)"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases…"
            style={{
              width: "100%",
              height: 38,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "0 12px 0 34px",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyHint
          icon={isSaved ? Bookmark : History}
          title={isSaved ? "No saved cases yet" : "No consultations yet"}
          hint={
            isSaved
              ? "Open a consultation from History and press the star to save it here."
              : "Start a new consultation from the sidebar — it will be recorded here automatically."
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((r) => {
            const tone = TONE_CHIP[r.patient?.status.label ?? "Stable"] ?? TONE_CHIP.Stable;
            return (
              <MagicCard
                key={r.id}
                className="rounded-[14px] border border-[color:var(--border)]"
                gradientFrom="#34d399"
                gradientTo="#8b5cf6"
                gradientColor="#0f1a27"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "15px 17px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-bright)" }}>
                        {r.patient?.name && r.patient.name !== "New Patient" ? r.patient.name : r.title}
                      </span>
                      <span className="chip" style={{ color: tone.c, background: tone.bg }}>
                        {r.patient?.status.label ?? "Stable"}
                      </span>
                      <span
                        className="chip"
                        style={{
                          color: r.mode === "backend" ? "#c4b5fd" : "var(--text-dim)",
                          background: r.mode === "backend" ? "rgba(139,92,246,0.14)" : "rgba(148,163,184,0.1)",
                        }}
                      >
                        {r.mode === "backend" ? "AI" : "Demo"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 5 }}>
                      {r.insights.diagnosis?.name ?? r.patient?.chiefComplaint ?? r.title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginTop: 7,
                        fontSize: 11.5,
                        color: "var(--text-faint)",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <MessageSquare size={12} /> {r.messages.length} messages
                      </span>
                      <span>{relativeTime(r.updatedAt)}</span>
                      {r.insights.diagnosis && (
                        <span style={{ color: "var(--purple-light)", fontWeight: 600 }}>
                          {r.insights.diagnosis.confidence}% confidence
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    className="icon-btn"
                    title={r.saved ? "Remove from saved" : "Save case"}
                    onClick={() => setSaved(r.id, !r.saved)}
                    style={{ width: 34, height: 34, flex: "none", color: r.saved ? "var(--amber)" : undefined }}
                  >
                    <Star size={15} fill={r.saved ? "var(--amber)" : "none"} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Delete consultation"
                    onClick={() => deleteConsultation(r.id)}
                    style={{ width: 34, height: 34, flex: "none" }}
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => onOpen(r)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 34,
                      padding: "0 13px",
                      borderRadius: 10,
                      border: "1px solid rgba(37,99,235,0.35)",
                      background: "linear-gradient(135deg,rgba(37,99,235,0.22),rgba(37,99,235,0.10))",
                      color: "#dbe6ff",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      flex: "none",
                    }}
                  >
                    Open <ArrowUpRight size={14} />
                  </button>
                </div>
              </MagicCard>
            );
          })}
        </div>
      )}
    </ViewShell>
  );
}
