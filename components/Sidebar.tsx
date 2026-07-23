"use client";

import { useState } from "react";
import {
  PlusCircle,
  History,
  Bookmark,
  Star,
  Settings,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Cpu,
  Wifi,
} from "lucide-react";
import { LogOut } from "lucide-react";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import type { Session } from "@/lib/auth";

interface Props {
  collapsed: boolean;
  onToggleCollapse: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onNewConsultation: () => void;
  active: string;
  onNavigate: (id: string) => void;
  session?: Session | null;
  onSignOut?: () => void;
}

const NAV = [
  { id: "new", label: "New Consultation", icon: PlusCircle, primary: true },
  { id: "history", label: "Consultation History", icon: History },
  { id: "saved", label: "Saved Cases", icon: Bookmark },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  theme,
  onToggleTheme,
  onNewConsultation,
  active,
  onNavigate,
  session,
  onSignOut,
}: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const displayName = session?.name ?? "Dr. John Doe";
  const displayMeta = session?.specialty || session?.role || "Cardiology";
  const displayInitials = session?.initials ?? "JD";

  return (
    <aside
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--panel)",
        borderRight: "1px solid var(--border)",
        padding: collapsed ? "16px 10px 12px" : "16px 14px 12px",
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 4px 16px" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "conic-gradient(from 140deg,#22d3ee,#34d399,#a78bfa,#22d3ee)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "var(--panel)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--teal)",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            M
          </div>
        </div>
        {!collapsed && (
          <div className="enter-fade">
            <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.2px" }}>
              <AnimatedGradientText colorFrom="#5eead4" colorTo="#a78bfa">
                MediAssist
              </AnimatedGradientText>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>AI Doctor Companion</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              title={item.label}
              onClick={() => (item.id === "new" ? onNewConsultation() : onNavigate(item.id))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "10px" : "9px 11px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: isActive || item.primary ? 700 : 500,
                whiteSpace: "nowrap",
                border: `1px solid ${
                  item.primary
                    ? "rgba(37,99,235,0.35)"
                    : isActive
                    ? "rgba(45,212,191,0.28)"
                    : "transparent"
                }`,
                color: item.primary
                  ? "#dbe6ff"
                  : isActive
                  ? "#eafaf3"
                  : "var(--text-dim)",
                background: item.primary
                  ? "linear-gradient(135deg,rgba(37,99,235,0.22),rgba(37,99,235,0.10))"
                  : isActive
                  ? "rgba(45,212,191,0.10)"
                  : "transparent",
                transition: "all 0.15s var(--ease)",
              }}
            >
              <Icon size={18} style={{ flex: "none" }} strokeWidth={isActive || item.primary ? 2.2 : 1.8} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer: model / status / theme / collapse */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {!collapsed ? (
          <div
            className="card"
            style={{ padding: "12px 13px", background: "var(--card)", borderRadius: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-soft)", fontWeight: 600 }}>
              <Cpu size={14} color="var(--primary-soft)" /> Current AI Model
            </div>
            <div style={{ fontSize: 12.5, color: "var(--primary-soft)", fontWeight: 700, marginTop: 4 }}>
              MediAssist Pro 3.0
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, fontSize: 11.5 }}>
              <Wifi size={13} color="var(--teal)" />
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--teal)",
                  boxShadow: "0 0 8px var(--teal)",
                  display: "inline-block",
                }}
              />
              <AnimatedShinyText className="text-[11.5px]" shimmerWidth={70}>
                Connected · Online
              </AnimatedShinyText>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }} title="MediAssist Pro 3.0 · Online">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)", boxShadow: "0 0 8px var(--teal)" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: collapsed ? "center" : "space-between" }}>
          <button
            className="icon-btn"
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={onToggleTheme}
            style={{ width: 38, height: 34, flex: collapsed ? "none" : 1 }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {!collapsed && (
            <button
              className="icon-btn"
              title="Collapse sidebar"
              onClick={onToggleCollapse}
              style={{ width: 38, height: 34, flex: 1 }}
            >
              <PanelLeftClose size={16} />
            </button>
          )}
          {collapsed && (
            <button className="icon-btn" title="Expand sidebar" onClick={onToggleCollapse} style={{ width: 38, height: 34 }}>
              <PanelLeftOpen size={16} />
            </button>
          )}
        </div>

        {/* Profile */}
        <div style={{ borderTop: "1px solid var(--border-faint)", paddingTop: 10, position: "relative" }}>
          {profileOpen && !collapsed && (
            <div
              className="enter"
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "var(--card)",
                border: "1px solid var(--border-strong)",
                borderRadius: 11,
                padding: 6,
                boxShadow: "var(--shadow-pop)",
                zIndex: 30,
              }}
            >
              <div style={{ padding: "8px 10px 10px", borderBottom: "1px solid var(--border-faint)" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{displayName}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, wordBreak: "break-all" }}>
                  {session?.email ?? "—"}
                </div>
                {session?.organization && (
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>{session.organization}</div>
                )}
              </div>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  onSignOut?.();
                }}
                style={{
                  width: "100%",
                  marginTop: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "var(--red-light)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
          <button
            onClick={() => (collapsed ? onSignOut?.() : setProfileOpen((v) => !v))}
            title={collapsed ? "Sign out" : `${displayName} · ${displayMeta}`}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: collapsed ? 0 : "2px",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg,#34d399,#22d3ee)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#062018",
                fontWeight: 800,
                fontSize: 13,
                flex: "none",
              }}
            >
              {displayInitials}
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {displayName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{displayMeta}</div>
                </div>
                <ChevronDown size={15} color="var(--text-dim)" style={{ transform: profileOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
