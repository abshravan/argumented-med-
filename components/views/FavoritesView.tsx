"use client";

import { useEffect, useState } from "react";
import { Star, ArrowUpRight, Sparkles, Stethoscope } from "lucide-react";
import { ConsultationRecord, FavoriteItem, getConsultation, listFavorites, onStoreChange } from "@/lib/store";
import { ViewShell, EmptyHint, relativeTime } from "./ViewShell";
import Markdown from "@/components/Markdown";

export default function FavoritesView({ onOpen }: { onOpen: (record: ConsultationRecord) => void }) {
  const [items, setItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(listFavorites());
    refresh();
    return onStoreChange(refresh);
  }, []);

  return (
    <ViewShell
      icon={Star}
      title="Favorites"
      subtitle="Findings and AI responses you've bookmarked across all consultations"
    >
      {items.length === 0 ? (
        <EmptyHint
          icon={Star}
          title="No bookmarked findings yet"
          hint="Use the Bookmark or Save action on any message in a consultation to pin it here for quick recall."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => {
            const isAI = item.message.role === "ai";
            return (
              <div key={item.message.id} className="card" style={{ padding: "15px 17px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isAI
                        ? "linear-gradient(135deg,#8b5cf6,#22d3ee)"
                        : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      color: "#fff",
                      flex: "none",
                    }}
                  >
                    {isAI ? <Sparkles size={14} /> : <Stethoscope size={13} />}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: isAI ? "var(--purple-light)" : "var(--text)" }}>
                    {isAI ? "MediAssist AI" : "Dr. John Doe"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    {relativeTime(item.message.timestamp)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{item.consultationTitle}</span>
                  <button
                    className="icon-btn"
                    title="Open consultation"
                    onClick={() => {
                      const record = getConsultation(item.consultationId);
                      if (record) onOpen(record);
                    }}
                    style={{ width: 30, height: 30, flex: "none" }}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                <div
                  style={{
                    borderTop: "1px solid var(--border-faint)",
                    paddingTop: 11,
                    maxHeight: 220,
                    overflow: "hidden",
                  }}
                >
                  {isAI ? (
                    <Markdown content={item.message.content} />
                  ) : (
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-soft)", whiteSpace: "pre-wrap" }}>
                      {item.message.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ViewShell>
  );
}
