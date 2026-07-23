"use client";

import type { Patient } from "./types";

/**
 * Dummy Practice Management System (PMS) directory.
 *
 * Stands in for a real PMS/EMR patient lookup (FHIR `Patient` search, HL7 ADT feed,
 * or a vendor API). Swap `searchPatients` for a network call when integrating —
 * the rest of the UI only depends on the `PmsPatient` shape.
 */

export interface PmsPatient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  dob: string;
  gender: "Male" | "Female" | "Other";
  phone: string;
  bloodGroup: string;
  weight: string;
  height: string;
  allergies: string[];
  activeProblems: string[];
  medications: string[];
  lastVisit: string;
  primaryPhysician: string;
  insurance: string;
  ward?: string;
}

export const VISIT_TYPES = [
  "OPD · Consultation",
  "Emergency · Resus",
  "Emergency · OPD",
  "Urgent · OPD",
  "Routine · Follow-up",
  "Telemedicine",
  "Inpatient · Ward round",
];

export const PRIORITIES: Patient["status"]["label"][] = ["Emergency", "Urgent", "Routine", "Stable"];

export const PMS_PATIENTS: PmsPatient[] = [
  {
    id: "p1",
    mrn: "MRN-1234567",
    name: "John Doe",
    age: 56,
    dob: "1970-03-14",
    gender: "Male",
    phone: "+1 415 555 0142",
    bloodGroup: "O+",
    weight: "72 kg",
    height: "175 cm",
    allergies: ["Penicillin"],
    activeProblems: ["Hypertension", "Stable angina"],
    medications: ["Amlodipine 5mg OD", "Atorvastatin 20mg ON"],
    lastVisit: "2026-03-04",
    primaryPhysician: "Dr. R. Anand",
    insurance: "BlueCross · PPO",
    ward: "OPD-3",
  },
  {
    id: "p2",
    mrn: "MRN-2231001",
    name: "Sarah Malik",
    age: 54,
    dob: "1972-08-02",
    gender: "Female",
    phone: "+1 415 555 0198",
    bloodGroup: "A+",
    weight: "68 kg",
    height: "162 cm",
    allergies: ["Sulfonamides"],
    activeProblems: ["Type 2 diabetes", "Dyslipidaemia"],
    medications: ["Metformin 500mg BD", "Rosuvastatin 10mg ON"],
    lastVisit: "2026-06-19",
    primaryPhysician: "Dr. J. Doe",
    insurance: "Aetna · HMO",
    ward: "ED-Resus",
  },
  {
    id: "p3",
    mrn: "MRN-1902334",
    name: "Rahul Anand",
    age: 41,
    dob: "1985-01-27",
    gender: "Male",
    phone: "+91 98200 41122",
    bloodGroup: "B+",
    weight: "78 kg",
    height: "178 cm",
    allergies: [],
    activeProblems: ["Asthma (mild intermittent)"],
    medications: ["Salbutamol PRN"],
    lastVisit: "2026-05-11",
    primaryPhysician: "Dr. P. Lal",
    insurance: "Star Health",
    ward: "OPD-1",
  },
  {
    id: "p4",
    mrn: "MRN-7781120",
    name: "Elena Novak",
    age: 29,
    dob: "1997-06-09",
    gender: "Female",
    phone: "+420 601 224 887",
    bloodGroup: "AB-",
    weight: "61 kg",
    height: "168 cm",
    allergies: ["Latex"],
    activeProblems: ["Migraine with aura"],
    medications: ["Sumatriptan 50mg PRN"],
    lastVisit: "2026-07-02",
    primaryPhysician: "Dr. M. Owusu",
    insurance: "VZP",
    ward: "OPD-2",
  },
  {
    id: "p5",
    mrn: "MRN-3345098",
    name: "Marcus Owusu",
    age: 63,
    dob: "1963-11-30",
    gender: "Male",
    phone: "+44 7700 900321",
    bloodGroup: "AB+",
    weight: "88 kg",
    height: "180 cm",
    allergies: ["ACE inhibitors (cough)"],
    activeProblems: ["Hypertension", "CKD stage 2"],
    medications: ["Amlodipine 10mg OD", "Indapamide 2.5mg OD"],
    lastVisit: "2026-07-15",
    primaryPhysician: "Dr. J. Doe",
    insurance: "NHS",
    ward: "OPD-3",
  },
  {
    id: "p6",
    mrn: "MRN-5567201",
    name: "Priya Lal",
    age: 47,
    dob: "1979-02-18",
    gender: "Female",
    phone: "+91 99100 55221",
    bloodGroup: "O-",
    weight: "81 kg",
    height: "160 cm",
    allergies: [],
    activeProblems: ["Type 2 diabetes", "Hypothyroidism"],
    medications: ["Metformin 1g BD", "Levothyroxine 75mcg OD"],
    lastVisit: "2026-04-22",
    primaryPhysician: "Dr. R. Anand",
    insurance: "HDFC Ergo",
    ward: "OPD-1",
  },
  {
    id: "p7",
    mrn: "MRN-6690012",
    name: "David Kim",
    age: 48,
    dob: "1978-09-05",
    gender: "Male",
    phone: "+82 10 2255 7788",
    bloodGroup: "A-",
    weight: "75 kg",
    height: "172 cm",
    allergies: ["NSAIDs"],
    activeProblems: ["Chronic lower back pain"],
    medications: ["Paracetamol PRN", "Physiotherapy"],
    lastVisit: "2026-07-18",
    primaryPhysician: "Dr. E. Novak",
    insurance: "Samsung Fire",
    ward: "OPD-4",
  },
  {
    id: "p8",
    mrn: "MRN-4412876",
    name: "Amina Yusuf",
    age: 34,
    dob: "1992-04-21",
    gender: "Female",
    phone: "+254 712 445 909",
    bloodGroup: "B-",
    weight: "64 kg",
    height: "165 cm",
    allergies: ["Codeine"],
    activeProblems: ["Iron deficiency anaemia"],
    medications: ["Ferrous sulfate 200mg OD"],
    lastVisit: "2026-06-30",
    primaryPhysician: "Dr. P. Lal",
    insurance: "NHIF",
    ward: "OPD-2",
  },
  {
    id: "p9",
    mrn: "MRN-8834110",
    name: "Tomás Herrera",
    age: 71,
    dob: "1955-12-11",
    gender: "Male",
    phone: "+34 611 220 334",
    bloodGroup: "O+",
    weight: "69 kg",
    height: "170 cm",
    allergies: ["Penicillin", "Contrast media"],
    activeProblems: ["Atrial fibrillation", "Heart failure (HFpEF)"],
    medications: ["Apixaban 5mg BD", "Bisoprolol 2.5mg OD", "Furosemide 40mg OD"],
    lastVisit: "2026-07-20",
    primaryPhysician: "Dr. J. Doe",
    insurance: "Sanitas",
    ward: "Ward-6B",
  },
  {
    id: "p10",
    mrn: "MRN-9902551",
    name: "Grace Chen",
    age: 8,
    dob: "2018-05-16",
    gender: "Female",
    phone: "+1 650 555 0177",
    bloodGroup: "A+",
    weight: "26 kg",
    height: "128 cm",
    allergies: ["Peanuts (anaphylaxis)"],
    activeProblems: ["Atopic eczema"],
    medications: ["Emollient BD", "EpiPen Jr"],
    lastVisit: "2026-07-21",
    primaryPhysician: "Dr. E. Novak",
    insurance: "Kaiser",
    ward: "Paeds-OPD",
  },
];

function normalise(value: string): string {
  return value.toLowerCase().replace(/[\s\-()+]/g, "");
}

/** Search by name, MRN, phone or date of birth. Empty query returns recent patients. */
export function searchPatients(query: string): PmsPatient[] {
  const q = query.trim();
  if (!q) {
    return [...PMS_PATIENTS].sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
  }
  const n = normalise(q);
  return PMS_PATIENTS.filter(
    (p) =>
      normalise(p.name).includes(n) ||
      normalise(p.mrn).includes(n) ||
      normalise(p.phone).includes(n) ||
      normalise(p.dob).includes(n) ||
      p.activeProblems.some((problem) => normalise(problem).includes(n)),
  );
}

const TONE: Record<string, Patient["status"]["tone"]> = {
  Emergency: "emergency",
  Urgent: "urgent",
  Routine: "routine",
  Stable: "stable",
};

/** Map a PMS record onto the workspace patient header model. */
export function toWorkspacePatient(
  record: Pick<
    PmsPatient,
    "name" | "age" | "gender" | "weight" | "height" | "bloodGroup" | "mrn"
  >,
  consultation: { chiefComplaint: string; visitType: string; priority: string },
): Patient {
  return {
    name: record.name,
    age: record.age,
    gender: record.gender,
    weight: record.weight,
    height: record.height,
    bloodGroup: record.bloodGroup,
    chiefComplaint: consultation.chiefComplaint || "Awaiting history",
    visitType: consultation.visitType,
    mrn: record.mrn,
    status: { label: consultation.priority, tone: TONE[consultation.priority] ?? "stable" },
  };
}

export function generateMrn(): string {
  return `MRN-${Math.floor(1000000 + Math.random() * 8999999)}`;
}

export function formatDob(dob: string): string {
  if (!dob) return "—";
  const d = new Date(dob);
  return Number.isNaN(d.getTime()) ? dob : d.toLocaleDateString();
}
