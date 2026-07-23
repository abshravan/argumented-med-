"use client";

import { useState } from "react";
import {
  Target,
  ListOrdered,
  FlaskConical,
  AlertTriangle,
  HelpCircle,
  FileText,
  BookMarked,
  ChevronDown,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  Ban,
  Sparkles,
} from "lucide-react";
import type { Insights } from "@/lib/types";
import type { RevealKey } from "@/lib/useClinicalEngine";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BorderBeam } from "@/components/magicui/border-beam";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { BlurFade } from "@/components/magicui/blur-fade";

/* ---------- shared card shell ---------- */
function InsightCard({
  icon: Icon,
  iconColor,
  title,
  action,
  revealed,
  streaming,
  children,
  skeletonRows = 3,
  defaultOpen = true,
  beam = false,
}: {
  icon: typeof Target;
  iconColor: string;
  title: string;
  action?: React.ReactNode;
  revealed: boolean;
  streaming: boolean;
  children: React.ReactNode;
  skeletonRows?: number;
  defaultOpen?: boolean;
  beam?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`card ${revealed ? "enter" : ""}`}
      style={{ position: "relative", overflow: "hidden", padding: "15px 16px", opacity: revealed ? 1 : 0.8 }}
    >
      {beam && revealed && <BorderBeam size={70} duration={7} colorFrom="#8b5cf6" colorTo="#22d3ee" />}
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: `${iconColor}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <Icon size={15} color={iconColor} />
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-bright)", flex: 1 }}>{title}</span>
        {action}
        <button
          onClick={() => setOpen((v) => !v)}
          className="icon-btn"
          style={{ width: 24, height: 24, border: "none" }}
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronDown size={15} style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.2s" }} />
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 13 }}>
          {revealed ? (
            children
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 12, width: `${90 - i * 12}%` }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- badge helpers ---------- */
const PRIORITY: Record<string, { c: string; bg: string }> = {
  Immediate: { c: "#fca5a5", bg: "rgba(239,68,68,0.16)" },
  High: { c: "#c4b5fd", bg: "rgba(139,92,246,0.16)" },
  Medium: { c: "#fcd34d", bg: "rgba(245,158,11,0.14)" },
  Low: { c: "#93c5fd", bg: "rgba(59,130,246,0.14)" },
};
const URGENCY: Record<string, { c: string; bg: string }> = {
  Critical: { c: "#fca5a5", bg: "rgba(239,68,68,0.16)" },
  High: { c: "#fcd34d", bg: "rgba(245,158,11,0.14)" },
  Moderate: { c: "#93c5fd", bg: "rgba(59,130,246,0.14)" },
  Routine: { c: "#5eead4", bg: "rgba(45,212,191,0.14)" },
};
const FLAG: Record<string, { c: string; bg: string; border: string; icon: typeof AlertTriangle; label: string }> = {
  emergency: { c: "#fca5a5", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.32)", icon: ShieldAlert, label: "Emergency" },
  warning: { c: "#fcd34d", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.28)", icon: AlertTriangle, label: "Warning" },
  contraindication: { c: "#f0abfc", bg: "rgba(217,70,239,0.07)", border: "rgba(217,70,239,0.28)", icon: Ban, label: "Contraindication" },
};
const SRC: Record<string, { c: string; bg: string }> = {
  PubMed: { c: "#93c5fd", bg: "rgba(59,130,246,0.14)" },
  NICE: { c: "#5eead4", bg: "rgba(45,212,191,0.14)" },
  WHO: { c: "#c4b5fd", bg: "rgba(139,92,246,0.14)" },
  WSES: { c: "#fcd34d", bg: "rgba(245,158,11,0.14)" },
  ESC: { c: "#fca5a5", bg: "rgba(239,68,68,0.14)" },
  BTS: { c: "#7dd3fc", bg: "rgba(56,189,248,0.14)" },
  ADA: { c: "#6ee7b7", bg: "rgba(16,185,129,0.14)" },
  Cochrane: { c: "#c4b5fd", bg: "rgba(139,92,246,0.14)" },
  Radiology: { c: "#93c5fd", bg: "rgba(59,130,246,0.14)" },
};

/** Shown when a card has resolved but the model returned nothing for it. */
function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 }}>{text}</div>;
}

function Badge({ text, map }: { text: string; map: Record<string, { c: string; bg: string }> }) {
  const s = map[text] || { c: "var(--text-muted)", bg: "rgba(148,163,184,0.1)" };
  return (
    <span className="chip" style={{ color: s.c, background: s.bg }}>
      {text}
    </span>
  );
}

/* ---------- panel ---------- */
export default function InsightsPanel({
  insights,
  revealed,
  streaming,
  onAskFollowUp,
}: {
  insights: Insights;
  revealed: Record<RevealKey, boolean>;
  streaming: boolean;
  onAskFollowUp: (q: string) => void;
}) {
  const [soapTab, setSoapTab] = useState<"s" | "o" | "a" | "p">("a");
  const dx = insights.diagnosis;

  return (
    <div
      style={{
        height: "100vh",
        borderLeft: "1px solid var(--border)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* header */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)", flex: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Sparkles size={17} color="var(--purple-light)" />
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-bright)", letterSpacing: "-0.2px" }}>
            AI Clinical Insights
          </span>
          {streaming && (
            <span className="typing" style={{ marginLeft: 4 }}>
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, marginTop: 4 }}>
          <AnimatedShinyText className="text-[11.5px]" shimmerWidth={120}>
            Live decision support · updates as you work
          </AnimatedShinyText>
        </div>
      </div>

      {/* scroll body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Most Likely Diagnosis */}
        <InsightCard
          icon={Target}
          iconColor="#b794f6"
          title="Most Likely Diagnosis"
          revealed={revealed.diagnosis}
          streaming={streaming}
          skeletonRows={3}
          beam={!!dx}
        >
          {!dx && <Empty text="No working diagnosis yet — add history or examination findings." />}

          {dx && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#b794f6", letterSpacing: "-0.3px", lineHeight: 1.2 }}>{dx.name}</span>
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                <Badge text={dx.urgency} map={URGENCY} />
                <span className="chip" style={{ color: "var(--text-soft)", background: "rgba(148,163,184,0.1)" }}>
                  {dx.severity}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0 7px" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Confidence</span>
                <span className="tabular" style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text-bright)" }}>
                  <NumberTicker value={dx.confidence} />%
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${dx.confidence}%`, background: "linear-gradient(90deg,#8b5cf6,#c084fc)" }} />
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55, marginTop: 13 }}>{dx.reasoning}</div>
            </>
          )}
        </InsightCard>

        {/* Differential Diagnoses */}
        <InsightCard icon={ListOrdered} iconColor="#5b9bff" title="Differential Diagnoses" revealed={revealed.differentials} streaming={streaming} skeletonRows={4}>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {insights.differentials.length === 0 && <Empty text="No differentials ranked yet." />}
            {insights.differentials.map((d, i) => (
              <div key={d.name} style={{ transition: "all 0.4s var(--ease)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    <span style={{ color: "var(--text-faint)", marginRight: 6 }}>{i + 1}</span>
                    {d.name}
                  </span>
                  <span className="tabular" style={{ fontSize: 12.5, fontWeight: 700, color: i === 0 ? "#b794f6" : "var(--primary-soft)" }}>
                    <NumberTicker value={d.confidence} />%
                  </span>
                </div>
                <div className="bar-track" style={{ height: 6 }}>
                  <div className="bar-fill" style={{ width: `${d.confidence}%`, background: i === 0 ? "#b794f6" : "var(--primary-soft)" }} />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 5 }}>{d.note}</div>
              </div>
            ))}
          </div>
        </InsightCard>

        {/* Recommended Investigations */}
        <InsightCard
          icon={FlaskConical}
          iconColor="#5eead4"
          title="Recommended Investigations"
          revealed={revealed.investigations}
          streaming={streaming}
          skeletonRows={4}
          action={
            <button className="icon-btn" style={{ width: 24, height: 24, border: "none" }} title="Add investigation">
              <Plus size={15} />
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {insights.investigations.length === 0 && <Empty text="No investigations suggested yet." />}
            {insights.investigations.map((inv) => (
              <div key={inv.name}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{inv.name}</span>
                  <Badge text={inv.priority} map={PRIORITY} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                  <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{inv.reason}</span>
                  {inv.cost && <span className="tabular" style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>{inv.cost}</span>}
                </div>
              </div>
            ))}
          </div>
        </InsightCard>

        {/* Clinical Red Flags */}
        <InsightCard icon={AlertTriangle} iconColor="#f87171" title="Clinical Red Flags" revealed={revealed.redflags} streaming={streaming} skeletonRows={2}>
          {insights.redFlags.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>No red flags detected at this time.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {insights.redFlags.map((f, i) => {
                const s = FLAG[f.level];
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                    }}
                  >
                    <Icon size={16} color={s.c} style={{ flex: "none", marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: s.c, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.45 }}>{f.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </InsightCard>

        {/* Suggested Follow-up Questions */}
        <InsightCard icon={HelpCircle} iconColor="#7dd3fc" title="Suggested Follow-up Questions" revealed={revealed.followups} streaming={streaming} skeletonRows={3}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.followUps.length === 0 && <Empty text="No follow-up questions suggested yet." />}
            {insights.followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => onAskFollowUp(q)}
                disabled={streaming}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--card-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-soft)",
                  fontSize: 12.5,
                  cursor: streaming ? "default" : "pointer",
                  opacity: streaming ? 0.55 : 1,
                  transition: "all 0.14s var(--ease)",
                }}
                onMouseEnter={(e) => {
                  if (streaming) return;
                  e.currentTarget.style.borderColor = "rgba(56,189,248,0.35)";
                  e.currentTarget.style.color = "var(--text-bright)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-soft)";
                }}
              >
                {q}
                <ArrowUpRight size={14} color="#7dd3fc" style={{ flex: "none" }} />
              </button>
            ))}
          </div>
        </InsightCard>

        {/* Clinical Summary (SOAP) */}
        <InsightCard icon={FileText} iconColor="#6ee7b7" title="Clinical Summary" revealed={revealed.soap} streaming={streaming} skeletonRows={3}>
          <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
            {([
              ["s", "Subjective"],
              ["o", "Objective"],
              ["a", "Assessment"],
              ["p", "Plan"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSoapTab(k)}
                title={label}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid " + (soapTab === k ? "rgba(45,212,191,0.3)" : "var(--border)"),
                  background: soapTab === k ? "rgba(45,212,191,0.12)" : "transparent",
                  color: soapTab === k ? "var(--teal-bright)" : "var(--text-dim)",
                  transition: "all 0.14s var(--ease)",
                }}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-soft)", minHeight: 60 }}>
            {insights.soap[soapTab] || <span style={{ color: "var(--text-dim)" }}>Not yet documented.</span>}
          </div>
        </InsightCard>

        {/* References */}
        <InsightCard icon={BookMarked} iconColor="#c4b5fd" title="References" revealed={revealed.references} streaming={streaming} skeletonRows={3}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insights.references.length === 0 && <Empty text="No references cited yet." />}
            {insights.references.map((r, i) => (
              <div key={i} style={{ padding: "11px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Badge text={r.source} map={SRC} />
                  <span style={{ fontSize: 10.5, color: "var(--teal-bright)", fontWeight: 700 }}>
                    <NumberTicker value={r.relevance} />% match
                  </span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{r.meta}</div>
              </div>
            ))}
          </div>
        </InsightCard>

        <div style={{ height: 4 }} />
      </div>
    </div>
  );
}
