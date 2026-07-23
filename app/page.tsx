"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PatientHeader from "@/components/PatientHeader";
import MessageCard from "@/components/MessageCard";
import Composer from "@/components/Composer";
import InsightsPanel from "@/components/InsightsPanel";
import EmptyState from "@/components/EmptyState";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { cn } from "@/lib/utils";
import { useClinicalEngine } from "@/lib/useClinicalEngine";

export default function Page() {
  const engine = useClinicalEngine();
  const [collapsed, setCollapsed] = useState(false);
  const [insightsHidden, setInsightsHidden] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeNav, setActiveNav] = useState("new");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Theme init + apply
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("ma-theme")) as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("ma-theme", theme);
    } catch {}
  }, [theme]);

  // Auto-scroll to newest content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [engine.messages]);

  // Keyboard: Ctrl/Cmd+B collapse, Ctrl/Cmd+I toggle insights
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setInsightsHidden((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleStart = useCallback((q: string) => { setActiveNav("new"); engine.start(q); }, [engine]);
  const handleNew = useCallback(() => { setActiveNav("new"); engine.newConsultation(); }, [engine]);

  const appClass = [
    "app",
    collapsed ? "collapsed" : "",
    insightsHidden || !engine.started ? "insights-hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClass}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onNewConsultation={handleNew}
        active={activeNav}
        onNavigate={setActiveNav}
      />

      {/* Center workspace */}
      <main style={{ position: "relative", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <DotPattern
          width={22}
          height={22}
          cr={0.7}
          className={cn(
            "fill-neutral-500/20 [mask-image:radial-gradient(70%_60%_at_50%_0%,white,transparent)]",
          )}
        />
        {engine.started && engine.patient ? (
          <>
            <PatientHeader
              patient={engine.patient}
              insightsHidden={insightsHidden}
              onToggleInsights={() => setInsightsHidden((v) => !v)}
            />
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "22px 22px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              {engine.messages.map((m) => (
                <MessageCard
                  key={m.id}
                  message={m}
                  onRegenerate={engine.regenerate}
                  onBookmark={engine.toggleBookmark}
                  onEdit={engine.editMessage}
                />
              ))}
            </div>
            <Composer
              onSend={engine.send}
              onDraftChange={engine.observeDraft}
              streaming={engine.streaming}
            />
          </>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <EmptyState onStart={handleStart} />
            </div>
            <Composer onSend={handleStart} />
          </>
        )}
      </main>

      {/* Right insights */}
      {engine.started && !insightsHidden && (
        <InsightsPanel
          insights={engine.insights}
          revealed={engine.revealed}
          streaming={engine.streaming}
          onAskFollowUp={engine.send}
        />
      )}
    </div>
  );
}
