"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Stethoscope, Cpu, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/auth/AuthLayout";
import { chipStyle } from "@/components/auth/fields";
import { ROLES, Role, SPECIALTIES, Session, completeOnboarding, getSession } from "@/lib/auth";
import { loadSettings, saveSettings, Provider } from "@/lib/settings";
import { BlurFade } from "@/components/magicui/blur-fade";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Ripple } from "@/components/magicui/ripple";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";

const STEPS = [
  { id: 0, label: "Your role", icon: Stethoscope },
  { id: 1, label: "AI engine", icon: Cpu },
  { id: 2, label: "Ready", icon: ShieldCheck },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>("Physician");
  const [specialty, setSpecialty] = useState("Cardiology");
  const [provider, setProvider] = useState<Provider>("gemini");
  const [useBackend, setUseBackend] = useState(true);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    setRole(s.role);
    if (s.specialty) setSpecialty(s.specialty);
    const settings = loadSettings();
    setProvider(settings.provider);
    setUseBackend(settings.useBackend);
  }, [router]);

  if (!session) return null;

  const finish = () => {
    const settings = loadSettings();
    saveSettings({ ...settings, provider, useBackend });
    completeOnboarding({ role, specialty });
    router.replace("/");
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        overflow: "hidden",
        background:
          "radial-gradient(120% 80% at 12% -5%, rgba(45,212,191,0.09), transparent 55%), radial-gradient(90% 70% at 100% 100%, rgba(139,92,246,0.10), transparent 55%), var(--bg)",
      }}
    >
      <Ripple mainCircleSize={300} numCircles={5} mainCircleOpacity={0.1} />

      <div style={{ width: "100%", maxWidth: 560, position: "relative" }}>
        <BlurFade>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
            <BrandMark size={40} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.2px" }}>
                <AnimatedGradientText colorFrom="#5eead4" colorTo="#a78bfa">
                  Welcome, {session.name.replace(/^Dr\.?\s*/i, "")}
                </AnimatedGradientText>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                Two quick questions and your workspace is ready.
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    border: `1px solid ${active ? "rgba(45,212,191,0.35)" : done ? "rgba(45,212,191,0.2)" : "var(--border)"}`,
                    background: active ? "rgba(45,212,191,0.12)" : "transparent",
                    color: active ? "var(--teal-bright)" : done ? "var(--teal)" : "var(--text-faint)",
                  }}
                >
                  {done ? <Check size={13} /> : <s.icon size={13} />}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: done ? "rgba(45,212,191,0.3)" : "var(--border)" }} />
                )}
              </div>
            );
          })}
        </div>

        <div className="card" style={{ position: "relative", overflow: "hidden", padding: "24px 26px", minHeight: 290 }}>
          <BorderBeam size={80} duration={8} colorFrom="#34d399" colorTo="#8b5cf6" />

          {step === 0 && (
            <BlurFade key="s0">
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-bright)" }}>How do you practise?</div>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 5 }}>
                This tailors terminology and the default differential framing.
              </div>

              <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "20px 0 9px" }}>Role</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ROLES.map((r) => (
                  <button key={r} onClick={() => setRole(r)} style={chipStyle(role === r)}>
                    {r}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "20px 0 9px" }}>Specialty</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SPECIALTIES.map((s) => (
                  <button key={s} onClick={() => setSpecialty(s)} style={chipStyle(specialty === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </BlurFade>
          )}

          {step === 1 && (
            <BlurFade key="s1">
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-bright)" }}>Choose your AI engine</div>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 5 }}>
                You can change this any time in Settings.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
                {(
                  [
                    { id: "gemini", title: "Google Gemini", desc: "Fast, via Google AI Studio. Needs GOOGLE_API_KEY." },
                    { id: "openrouter", title: "OpenRouter", desc: "Any model — Claude, GPT, Llama. Needs OPENROUTER_API_KEY." },
                  ] as { id: Provider; title: string; desc: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProvider(p.id);
                      setUseBackend(true);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "13px 15px",
                      borderRadius: 11,
                      cursor: "pointer",
                      border: `1px solid ${useBackend && provider === p.id ? "rgba(45,212,191,0.35)" : "var(--border)"}`,
                      background: useBackend && provider === p.id ? "rgba(45,212,191,0.09)" : "var(--card-2)",
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-bright)" }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3 }}>{p.desc}</div>
                  </button>
                ))}

                <button
                  onClick={() => setUseBackend(false)}
                  style={{
                    textAlign: "left",
                    padding: "13px 15px",
                    borderRadius: 11,
                    cursor: "pointer",
                    border: `1px solid ${!useBackend ? "rgba(45,212,191,0.35)" : "var(--border)"}`,
                    background: !useBackend ? "rgba(45,212,191,0.09)" : "var(--card-2)",
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-bright)" }}>
                    Demo mode — no API key
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3 }}>
                    Explore with built-in clinical scenarios. Nothing leaves your browser.
                  </div>
                </button>
              </div>
            </BlurFade>
          )}

          {step === 2 && (
            <BlurFade key="s2">
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-bright)" }}>You're all set</div>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 5 }}>
                A quick reminder of how MediAssist works.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 20 }}>
                {[
                  "Every suggestion carries a confidence score and its reasoning.",
                  "Differentials, investigations and red flags update live as you type.",
                  "Nothing is actioned automatically — you approve every step.",
                  "Consultations are stored only in this browser.",
                ].map((t) => (
                  <div key={t} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        background: "rgba(52,211,153,0.14)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "none",
                        marginTop: 1,
                      }}
                    >
                      <Check size={12} color="var(--teal)" strokeWidth={3} />
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>{t}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 20,
                  fontSize: 11.5,
                  color: "var(--text-faint)",
                  lineHeight: 1.55,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border-faint)",
                }}
              >
                MediAssist is decision support. It does not diagnose, treat, or replace professional medical
                judgment.
              </div>
            </BlurFade>
          )}
        </div>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                height: 42,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid var(--border-strong)",
                background: "transparent",
                color: "var(--text-soft)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button
            onClick={() => (step < 2 ? setStep((s) => s + 1) : finish())}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg,#34d399,#10b981)",
              color: "#062018",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 6px 18px rgba(16,185,129,0.28)",
            }}
          >
            {step < 2 ? "Continue" : "Enter workspace"} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
