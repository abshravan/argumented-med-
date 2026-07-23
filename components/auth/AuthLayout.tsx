"use client";

import { Check } from "lucide-react";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { BlurFade } from "@/components/magicui/blur-fade";
import { cn } from "@/lib/utils";

const PERKS = [
  "Evidence-first answers with citations",
  "Confidence scores and reasoning on every suggestion",
  "Human-in-the-loop — you approve every action",
];

export function BrandMark({ size = 42 }: { size?: number }) {
  const inner = Math.round(size * 0.78);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "conic-gradient(from 140deg,#22d3ee,#34d399,#a78bfa,#22d3ee)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          borderRadius: inner * 0.28,
          background: "var(--bg-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--teal)",
          fontWeight: 800,
          fontSize: size * 0.4,
        }}
      >
        M
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
        background: "var(--bg)",
        overflow: "hidden",
      }}
      className="auth-grid"
    >
      {/* ---- brand panel ---- */}
      <div
        style={{
          position: "relative",
          padding: "48px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(120% 90% at 15% 10%, rgba(45,212,191,0.14), transparent 55%), radial-gradient(100% 80% at 90% 90%, rgba(139,92,246,0.16), transparent 55%), var(--bg-2)",
          borderRight: "1px solid var(--border)",
          overflow: "hidden",
        }}
        className="auth-brand"
      >
        <DotPattern
          cr={0.8}
          className={cn("fill-emerald-400/20 [mask-image:radial-gradient(500px_circle_at_20%_30%,white,transparent)]")}
        />

        <BlurFade>
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            <BrandMark />
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.2px" }}>
                <AnimatedGradientText colorFrom="#5eead4" colorTo="#a78bfa">
                  MediAssist
                </AnimatedGradientText>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>AI Doctor Companion</div>
            </div>
          </div>
        </BlurFade>

        <div style={{ position: "relative" }}>
          <BlurFade delay={0.1}>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: "var(--text-bright)",
                letterSpacing: "-0.8px",
                lineHeight: 1.15,
                maxWidth: 440,
              }}
            >
              Your clinical decision support copilot.
            </div>
          </BlurFade>
          <BlurFade delay={0.18}>
            <div
              style={{
                fontSize: 14.5,
                color: "var(--text-muted)",
                lineHeight: 1.6,
                maxWidth: 430,
                marginTop: 16,
              }}
            >
              Reduce documentation burden, surface evidence-based differentials, and keep every recommendation
              explainable — with you as the final decision-maker.
            </div>
          </BlurFade>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 30 }}>
            {PERKS.map((p, i) => (
              <BlurFade key={p} delay={0.26 + i * 0.07}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: "rgba(52,211,153,0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                    }}
                  >
                    <Check size={14} color="var(--teal)" strokeWidth={2.6} />
                  </span>
                  <span style={{ fontSize: 13.5, color: "var(--text-soft)" }}>{p}</span>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--text-faint)", maxWidth: 430, lineHeight: 1.5, position: "relative" }}>
          Clinical Decision Support System. Does not diagnose, treat, or replace professional medical judgment.
          HIPAA-ready · encrypted · audit-logged.
        </div>
      </div>

      {/* ---- form panel ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 390 }}>{children}</div>
      </div>
    </div>
  );
}
