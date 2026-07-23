"use client";

import { Activity, ArrowRight, ShieldCheck, Brain, ClipboardList, Plus } from "lucide-react";
import { STARTERS } from "@/lib/scenarios";
import { Ripple } from "@/components/magicui/ripple";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { BlurFade } from "@/components/magicui/blur-fade";
import { cn } from "@/lib/utils";

export default function EmptyState({ onStart }: { onStart: (query: string) => void }) {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 32px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <DotPattern
        cr={0.9}
        className={cn(
          "fill-emerald-400/25 [mask-image:radial-gradient(560px_circle_at_center,white,transparent)]",
        )}
      />

      {/* Illustration with ripple */}
      <div style={{ position: "relative", width: 260, height: 200, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Ripple mainCircleSize={120} numCircles={6} mainCircleOpacity={0.18} />
        <BlurFade delay={0.05}>
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 30,
              background:
                "radial-gradient(120% 120% at 30% 10%, rgba(52,211,153,0.28), transparent 60%), radial-gradient(120% 120% at 90% 100%, rgba(139,92,246,0.32), transparent 55%), var(--card)",
              border: "1px solid var(--border-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 24px 60px -30px rgba(52,211,153,0.5)",
              position: "relative",
            }}
          >
            <Activity size={46} color="var(--teal-bright)" strokeWidth={1.7} />
          </div>
        </BlurFade>
      </div>

      <BlurFade delay={0.12}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.6px", margin: 0 }}>
          <span style={{ color: "var(--text-bright)" }}>Start a New </span>
          <AnimatedGradientText colorFrom="#34d399" colorTo="#8b5cf6">
            Clinical Consultation
          </AnimatedGradientText>
        </h1>
      </BlurFade>

      <BlurFade delay={0.18}>
        <p style={{ fontSize: 14.5, color: "var(--text-muted)", maxWidth: 470, lineHeight: 1.6, margin: "12px 0 0" }}>
          Enter patient information and begin collaborating with AI. MediAssist keeps every suggestion explainable —
          <span style={{ color: "var(--text-soft)" }}> you remain the decision-maker.</span>
        </p>
      </BlurFade>

      {/* Trust markers */}
      <BlurFade delay={0.24}>
        <div style={{ display: "flex", gap: 20, margin: "22px 0 28px", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { icon: ShieldCheck, label: "Evidence-first, cited" },
            { icon: Brain, label: "Confidence & reasoning" },
            { icon: ClipboardList, label: "Human-in-the-loop" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-dim)" }}>
              <Icon size={15} color="var(--teal)" />
              {label}
            </div>
          ))}
        </div>
      </BlurFade>

      {/* Starters */}
      <div style={{ width: "100%", maxWidth: 580, position: "relative" }}>
        <BlurFade delay={0.3}>
          <div style={{ marginBottom: 12 }}>
            <AnimatedShinyText className="text-[11.5px] uppercase tracking-[0.6px]">
              Suggested starting points
            </AnimatedShinyText>
          </div>
        </BlurFade>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 10 }}>
          {STARTERS.map((s, i) => (
            <BlurFade key={s.label} delay={0.34 + i * 0.05}>
              <button
                onClick={() => onStart(s.query)}
                style={{ width: "100%", border: "none", background: "transparent", padding: 0, cursor: "pointer", borderRadius: 14 }}
              >
                <MagicCard
                  className="rounded-[14px] border border-[color:var(--border)] shadow-[var(--shadow-card)]"
                  gradientFrom="#34d399"
                  gradientTo="#8b5cf6"
                  gradientColor="#0f1a27"
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "14px 16px",
                      color: "var(--text-soft)",
                      fontSize: 13.5,
                      fontWeight: 600,
                      textAlign: "left",
                    }}
                  >
                    {s.label}
                    <ArrowRight size={15} color="var(--teal)" />
                  </div>
                </MagicCard>
              </button>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.7}>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
            <ShimmerButton
              onClick={() => onStart("general consultation")}
              background="linear-gradient(135deg,#10b981,#0d9488)"
              shimmerColor="#d1fae5"
              borderRadius="12px"
              className="text-[13px] font-bold !text-[#062018]"
            >
              <Plus size={16} style={{ marginRight: 8 }} />
              Start a blank consultation
            </ShimmerButton>
          </div>
        </BlurFade>
      </div>
    </div>
  );
}
