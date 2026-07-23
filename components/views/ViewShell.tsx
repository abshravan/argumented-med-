"use client";

import type { LucideIcon } from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";

export function ViewShell({
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          flex: "none",
          padding: "18px 26px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "rgba(45,212,191,0.12)",
            border: "1px solid rgba(45,212,191,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <Icon size={19} color="var(--teal-bright)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text-bright)", letterSpacing: "-0.3px" }}>
            {title}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 2 }}>{subtitle}</div>
        </div>
        {actions}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 26px 28px" }}>
        <BlurFade>{children}</BlurFade>
      </div>
    </div>
  );
}

export function EmptyHint({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "70px 20px",
        textAlign: "center",
        gap: 10,
      }}
    >
      <span
        style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          background: "var(--card)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={24} color="var(--text-dim)" />
      </span>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 380, lineHeight: 1.55 }}>{hint}</div>
    </div>
  );
}

export const TONE_CHIP: Record<string, { c: string; bg: string }> = {
  Emergency: { c: "#fca5a5", bg: "rgba(239,68,68,0.14)" },
  Urgent: { c: "#fcd34d", bg: "rgba(245,158,11,0.14)" },
  Routine: { c: "#5eead4", bg: "rgba(45,212,191,0.14)" },
  Stable: { c: "#93c5fd", bg: "rgba(59,130,246,0.14)" },
};

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}
