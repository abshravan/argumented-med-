"use client";

import { useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  UserSearch,
  AlertTriangle,
  Phone,
  CalendarDays,
  Pill,
  ArrowRight,
  X,
  Building2,
} from "lucide-react";
import {
  PRIORITIES,
  PmsPatient,
  VISIT_TYPES,
  formatDob,
  generateMrn,
  searchPatients,
  toWorkspacePatient,
} from "@/lib/pms";
import type { Patient } from "@/lib/types";
import { ViewShell, EmptyHint, TONE_CHIP } from "./ViewShell";
import { MagicCard } from "@/components/magicui/magic-card";
import { BlurFade } from "@/components/magicui/blur-fade";
import { BorderBeam } from "@/components/magicui/border-beam";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  background: "var(--bg)",
  border: "1px solid var(--border-strong)",
  borderRadius: 9,
  padding: "0 12px",
  color: "var(--text)",
  fontSize: 13,
};

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6 }}>{children}</div>;
}

/** Chief complaint + visit type + triage priority — shared by both tabs. */
function ConsultationDetails({
  complaint,
  setComplaint,
  visitType,
  setVisitType,
  priority,
  setPriority,
}: {
  complaint: string;
  setComplaint: (v: string) => void;
  visitType: string;
  setVisitType: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
}) {
  return (
    <>
      <div>
        <Label>Chief complaint</Label>
        <input
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          placeholder="e.g. Severe right lower quadrant abdominal pain since 24 hours"
          style={inputStyle}
          autoFocus
        />
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 5 }}>
          Leave blank to pick a starting prompt instead.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label>Visit type</Label>
          <select value={visitType} onChange={(e) => setVisitType(e.target.value)} style={inputStyle}>
            {VISIT_TYPES.map((v) => (
              <option key={v} value={v} style={{ background: "var(--card)" }}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Triage priority</Label>
          <div style={{ display: "flex", gap: 6 }}>
            {PRIORITIES.map((p) => {
              const tone = TONE_CHIP[p];
              const active = priority === p;
              return (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 9,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `1px solid ${active ? tone.c : "var(--border)"}`,
                    background: active ? tone.bg : "transparent",
                    color: active ? tone.c : "var(--text-dim)",
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default function NewConsultationView({
  onStart,
  onSkip,
}: {
  onStart: (patient: Patient, chiefComplaint: string) => void;
  onSkip: () => void;
}) {
  const [tab, setTab] = useState<"search" | "new">("search");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PmsPatient | null>(null);

  // consultation details
  const [complaint, setComplaint] = useState("");
  const [visitType, setVisitType] = useState(VISIT_TYPES[0]);
  const [priority, setPriority] = useState<string>("Routine");

  // manual patient form
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    bloodGroup: "",
    weight: "",
    height: "",
    mrn: generateMrn(),
    allergies: "",
  });
  const [formError, setFormError] = useState("");

  const results = useMemo(() => searchPatients(query), [query]);

  const startFromPms = (record: PmsPatient) => {
    onStart(toWorkspacePatient(record, { chiefComplaint: complaint, visitType, priority }), complaint);
  };

  const startFromForm = () => {
    if (!form.name.trim()) {
      setFormError("Enter the patient's name.");
      return;
    }
    const age = Number(form.age);
    if (!form.age || Number.isNaN(age) || age < 0 || age > 130) {
      setFormError("Enter a valid age.");
      return;
    }
    setFormError("");
    onStart(
      toWorkspacePatient(
        {
          name: form.name.trim(),
          age,
          gender: form.gender as PmsPatient["gender"],
          weight: form.weight.trim() || "—",
          height: form.height.trim() || "—",
          bloodGroup: form.bloodGroup.trim() || "—",
          mrn: form.mrn,
        },
        { chiefComplaint: complaint, visitType, priority },
      ),
      complaint,
    );
  };

  return (
    <ViewShell
      icon={UserSearch}
      title="New Consultation"
      subtitle="Look up a patient in the PMS or register a new one"
      actions={
        <button
          onClick={onSkip}
          style={{
            height: 36,
            padding: "0 14px",
            borderRadius: 9,
            border: "1px solid var(--border-strong)",
            background: "transparent",
            color: "var(--text-dim)",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Skip — start without a record
        </button>
      }
    >
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {(
          [
            { id: "search", label: "Search PMS", icon: Search },
            { id: "new", label: "Add new patient", icon: UserPlus },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setSelected(null);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 38,
              padding: "0 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: `1px solid ${tab === t.id ? "rgba(45,212,191,0.35)" : "var(--border)"}`,
              background: tab === t.id ? "rgba(45,212,191,0.12)" : "transparent",
              color: tab === t.id ? "var(--teal-bright)" : "var(--text-dim)",
            }}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "search" ? (
        <>
          <div style={{ position: "relative", marginBottom: 16, maxWidth: 520 }}>
            <Search
              size={16}
              color="var(--text-faint)"
              style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="Search by name, MRN, phone or date of birth…"
              autoFocus
              style={{ ...inputStyle, height: 44, padding: "0 14px 0 38px", fontSize: 13.5 }}
            />
          </div>

          <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 12 }}>
            {results.length} {results.length === 1 ? "patient" : "patients"}
            {query ? " matching" : " · recently seen"}
          </div>

          {results.length === 0 ? (
            <EmptyHint
              icon={UserSearch}
              title="No matching patient"
              hint="Check the spelling or MRN, or switch to “Add new patient” to register them."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {results.map((p, i) => {
                const isSelected = selected?.id === p.id;
                return (
                  <BlurFade key={p.id} delay={Math.min(i * 0.03, 0.2)}>
                    <MagicCard
                      className="rounded-[14px] border border-[color:var(--border)]"
                      gradientFrom="#34d399"
                      gradientTo="#8b5cf6"
                      gradientColor="#0f1a27"
                    >
                      <div style={{ padding: "15px 17px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 11,
                              background: "rgba(56,189,248,0.12)",
                              border: "1px solid rgba(56,189,248,0.22)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#38bdf8",
                              fontWeight: 800,
                              fontSize: 13,
                              flex: "none",
                            }}
                          >
                            {p.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-bright)" }}>
                                {p.name}
                              </span>
                              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                                {p.age} yrs · {p.gender}
                              </span>
                              {p.allergies.length > 0 && (
                                <span
                                  className="chip"
                                  style={{ color: "#fca5a5", background: "rgba(239,68,68,0.14)" }}
                                >
                                  <AlertTriangle size={11} /> {p.allergies.join(", ")}
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 16,
                                marginTop: 6,
                                fontSize: 11.5,
                                color: "var(--text-dim)",
                                flexWrap: "wrap",
                              }}
                            >
                              <span>{p.mrn}</span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <CalendarDays size={12} /> DOB {formatDob(p.dob)}
                              </span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <Phone size={12} /> {p.phone}
                              </span>
                              {p.ward && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                  <Building2 size={12} /> {p.ward}
                                </span>
                              )}
                            </div>
                            {p.activeProblems.length > 0 && (
                              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
                                <span style={{ color: "var(--text-faint)" }}>Active: </span>
                                {p.activeProblems.join(" · ")}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => setSelected(isSelected ? null : p)}
                            style={{
                              height: 36,
                              padding: "0 15px",
                              borderRadius: 10,
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              flex: "none",
                              border: `1px solid ${isSelected ? "var(--border-strong)" : "rgba(37,99,235,0.35)"}`,
                              background: isSelected
                                ? "transparent"
                                : "linear-gradient(135deg,rgba(37,99,235,0.22),rgba(37,99,235,0.10))",
                              color: isSelected ? "var(--text-dim)" : "#dbe6ff",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {isSelected ? (
                              <>
                                <X size={14} /> Cancel
                              </>
                            ) : (
                              "Select"
                            )}
                          </button>
                        </div>

                        {/* Consultation details for the selected patient */}
                        {isSelected && (
                          <div
                            className="enter"
                            style={{
                              position: "relative",
                              marginTop: 15,
                              paddingTop: 15,
                              borderTop: "1px solid var(--border-faint)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 13,
                            }}
                          >
                            {p.medications.length > 0 && (
                              <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                                <Pill size={12} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                                {p.medications.join(" · ")}
                              </div>
                            )}
                            <ConsultationDetails
                              complaint={complaint}
                              setComplaint={setComplaint}
                              visitType={visitType}
                              setVisitType={setVisitType}
                              priority={priority}
                              setPriority={setPriority}
                            />
                            <button
                              onClick={() => startFromPms(p)}
                              style={{
                                height: 42,
                                borderRadius: 10,
                                border: "none",
                                background: "linear-gradient(135deg,#34d399,#10b981)",
                                color: "#062018",
                                fontSize: 13.5,
                                fontWeight: 800,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                boxShadow: "0 6px 18px rgba(16,185,129,0.28)",
                              }}
                            >
                              Start consultation <ArrowRight size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </MagicCard>
                  </BlurFade>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ---------- Add new patient ---------- */
        <div className="card" style={{ position: "relative", overflow: "hidden", padding: "20px 22px", maxWidth: 720 }}>
          <BorderBeam size={80} duration={8} colorFrom="#34d399" colorTo="#8b5cf6" />
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-bright)" }}>Patient details</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3 }}>
            Registers the patient for this session only — nothing is written back to the PMS.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 18 }}>
            <div style={{ gridColumn: "span 2" }}>
              <Label>Full name</Label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
                style={inputStyle}
              />
            </div>
            <div>
              <Label>MRN</Label>
              <input value={form.mrn} onChange={(e) => setForm({ ...form, mrn: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <Label>Age</Label>
              <input
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="45"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Sex</Label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                style={inputStyle}
              >
                {["Male", "Female", "Other"].map((g) => (
                  <option key={g} value={g} style={{ background: "var(--card)" }}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Blood group</Label>
              <input
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                placeholder="O+"
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Weight</Label>
              <input
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                placeholder="72 kg"
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Height</Label>
              <input
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
                placeholder="175 cm"
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Known allergies</Label>
              <input
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                placeholder="Penicillin"
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--border-faint)",
              display: "flex",
              flexDirection: "column",
              gap: 13,
            }}
          >
            <ConsultationDetails
              complaint={complaint}
              setComplaint={setComplaint}
              visitType={visitType}
              setVisitType={setVisitType}
              priority={priority}
              setPriority={setPriority}
            />

            {formError && (
              <div style={{ fontSize: 12.5, color: "var(--red-light)" }}>{formError}</div>
            )}

            <button
              onClick={startFromForm}
              style={{
                height: 42,
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#34d399,#10b981)",
                color: "#062018",
                fontSize: 13.5,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 6px 18px rgba(16,185,129,0.28)",
              }}
            >
              Create &amp; start consultation <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </ViewShell>
  );
}
