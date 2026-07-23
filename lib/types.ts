export type Role = "doctor" | "ai";

export type Urgency = "Critical" | "High" | "Moderate" | "Routine";
export type Severity = "Severe" | "Moderate" | "Mild";
export type Priority = "Immediate" | "High" | "Medium" | "Low";
export type FlagLevel = "emergency" | "warning" | "contraindication";

export interface Message {
  id: string;
  role: Role;
  /** Markdown-ish content. */
  content: string;
  timestamp: number;
  bookmarked?: boolean;
  /** true while the AI text is streaming in. */
  streaming?: boolean;
  /** Optional expandable clinical detail (e.g. full reasoning / note). */
  detail?: string;
  detailLabel?: string;
}

export interface Patient {
  name: string;
  age: number;
  gender: string;
  weight: string;
  height: string;
  bloodGroup: string;
  chiefComplaint: string;
  visitType: string;
  mrn: string;
  status: { label: string; tone: "emergency" | "urgent" | "routine" | "stable" };
}

export interface Diagnosis {
  name: string;
  confidence: number; // 0-100
  urgency: Urgency;
  severity: Severity;
  reasoning: string;
}

export interface Differential {
  name: string;
  confidence: number;
  note: string;
}

export interface Investigation {
  name: string;
  priority: Priority;
  reason: string;
  cost?: string;
}

export interface RedFlag {
  text: string;
  level: FlagLevel;
}

export interface Reference {
  source: string; // PubMed | NICE | WHO | WSES ...
  title: string;
  meta: string;
  relevance: number;
}

export interface Soap {
  s: string;
  o: string;
  a: string;
  p: string;
}

export interface Insights {
  diagnosis: Diagnosis | null;
  differentials: Differential[];
  investigations: Investigation[];
  redFlags: RedFlag[];
  followUps: string[];
  soap: Soap;
  references: Reference[];
}

export interface Scenario {
  id: string;
  triggers: string[];
  patient: Patient;
  /** The AI's opening assessment message (markdown). */
  aiOpening: string;
  aiOpeningDetail?: string;
  insights: Insights;
}
