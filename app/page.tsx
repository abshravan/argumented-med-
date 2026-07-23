"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PatientHeader from "@/components/PatientHeader";
import MessageCard from "@/components/MessageCard";
import Composer from "@/components/Composer";
import InsightsPanel from "@/components/InsightsPanel";
import EmptyState from "@/components/EmptyState";
import ConsultationListView from "@/components/views/ConsultationListView";
import FavoritesView from "@/components/views/FavoritesView";
import SettingsView from "@/components/views/SettingsView";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { cn } from "@/lib/utils";
import { useClinicalEngine } from "@/lib/useClinicalEngine";
import type { ConsultationRecord } from "@/lib/store";
import { Session, getSession, signOut } from "@/lib/auth";

type NavId = "new" | "history" | "saved" | "favorites" | "settings";

export default function Page() {
  const router = useRouter();
  const engine = useClinicalEngine();
  const [session, setSession] = useState<Session | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [insightsHidden, setInsightsHidden] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeNav, setActiveNav] = useState<NavId>("new");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Route guard — unauthenticated users go to /login, new accounts to /onboarding.
  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    if (!s.onboarded) {
      router.replace("/onboarding");
      return;
    }
    setSession(s);
    setCheckedAuth(true);
  }, [router]);

  const handleSignOut = useCallback(() => {
    signOut();
    router.replace("/login");
  }, [router]);

  // Theme init + apply
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("ma-theme")) as
      | "dark"
      | "light"
      | null;
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

  // Keyboard shortcuts
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

  const handleStart = useCallback(
    (q: string) => {
      setActiveNav("new");
      engine.start(q);
    },
    [engine],
  );

  const handleNew = useCallback(() => {
    setActiveNav("new");
    engine.newConsultation();
  }, [engine]);

  const handleOpenRecord = useCallback(
    (record: ConsultationRecord) => {
      engine.loadConsultation(record);
      setActiveNav("new");
    },
    [engine],
  );

  // Avoid flashing the workspace before the guard resolves.
  if (!checkedAuth || !session) return null;

  const isWorkspace = activeNav === "new";
  const showInsights = isWorkspace && engine.started && !insightsHidden;

  const appClass = ["app", collapsed ? "collapsed" : "", showInsights ? "" : "insights-hidden"]
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
        onNavigate={(id) => setActiveNav(id as NavId)}
        session={session}
        onSignOut={handleSignOut}
      />

      {/* Center column */}
      <main
        style={{
          position: "relative",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <DotPattern
          width={22}
          height={22}
          cr={0.7}
          className={cn(
            "fill-neutral-500/20 [mask-image:radial-gradient(70%_60%_at_50%_0%,white,transparent)]",
          )}
        />

        {/* Non-blocking error / fallback banner */}
        {isWorkspace && engine.error && (
          <div
            className="enter"
            style={{
              flex: "none",
              margin: "10px 22px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 13px",
              borderRadius: 10,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.28)",
              color: "var(--amber-soft)",
              fontSize: 12.5,
            }}
          >
            <AlertTriangle size={15} style={{ flex: "none" }} />
            <span style={{ flex: 1 }}>{engine.error}</span>
            <button
              className="icon-btn"
              onClick={engine.dismissError}
              style={{ width: 26, height: 26, border: "none" }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {activeNav === "history" && <ConsultationListView variant="history" onOpen={handleOpenRecord} />}
        {activeNav === "saved" && <ConsultationListView variant="saved" onOpen={handleOpenRecord} />}
        {activeNav === "favorites" && <FavoritesView onOpen={handleOpenRecord} />}
        {activeNav === "settings" && (
          <SettingsView theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
        )}

        {isWorkspace &&
          (engine.started && engine.patient ? (
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
                onStop={engine.stop}
              />
            </>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <EmptyState onStart={handleStart} />
              </div>
              <Composer onSend={handleStart} />
            </>
          ))}
      </main>

      {/* Right insights */}
      {showInsights && (
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
