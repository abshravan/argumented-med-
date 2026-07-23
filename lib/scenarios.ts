import type { Scenario } from "./types";

/**
 * Seed clinical scenarios. These drive the "living" insights panel: a scenario
 * is matched from the doctor's input (starting prompt or free text), then its
 * insight cards are revealed progressively to feel alive. All data is mock /
 * illustrative — MediAssist assists; the clinician decides.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "appendicitis",
    triggers: ["abdomen", "abdominal", "belly", "rlq", "appendic", "stomach", "flank"],
    patient: {
      name: "John Doe",
      age: 56,
      gender: "Male",
      weight: "72 kg",
      height: "175 cm",
      bloodGroup: "O+",
      chiefComplaint: "Severe right lower quadrant abdominal pain",
      visitType: "Emergency · OPD",
      mrn: "MRN-1234567",
      status: { label: "Emergency", tone: "emergency" },
    },
    aiOpening: `## Working assessment

The presentation is most consistent with **acute appendicitis**. Migratory periumbilical → RLQ pain with rebound tenderness and rising inflammatory markers gives a **high pre-test probability**.

**Key positives**
- Migratory pain to RLQ (McBurney's point)
- Rebound tenderness & guarding
- WBC 14.2 ×10⁹/L, CRP 32 mg/L
- Low-grade fever, anorexia

| Marker | Value | Ref |
| --- | --- | --- |
| WBC | 14.2 | 4.0–11.0 |
| Neutrophils | 82% | 40–75 |
| CRP | 32 | < 5 |

I've populated the insights panel with a ranked differential, recommended workup, and the relevant red flags. **You remain the decision-maker** — confirm the exam findings before proceeding.`,
    aiOpeningDetail: `Alvarado score ≈ 8/10 (migration, anorexia, nausea, RLQ tenderness, rebound, fever, leucocytosis, left shift) → high likelihood. Consider surgical review before imaging if the clinical picture is unambiguous. Document penicillin allergy prominently for peri-operative prophylaxis.`,
    insights: {
      diagnosis: {
        name: "Acute Appendicitis",
        confidence: 88,
        urgency: "High",
        severity: "Moderate",
        reasoning:
          "Migratory RLQ pain, rebound tenderness, leucocytosis with left shift and elevated CRP. Time-sensitive due to perforation risk.",
      },
      differentials: [
        { name: "Acute Appendicitis", confidence: 88, note: "Classic migratory pain + peritoneal signs" },
        { name: "Mesenteric Adenitis", confidence: 34, note: "Consider if recent viral illness" },
        { name: "Ureteric Colic", confidence: 21, note: "Assess for haematuria / loin-to-groin pain" },
        { name: "Gastroenteritis", confidence: 15, note: "Diarrhoea absent — lower likelihood" },
      ],
      investigations: [
        { name: "CBC with differential", priority: "High", reason: "Quantify leucocytosis / left shift", cost: "$18" },
        { name: "CRP", priority: "High", reason: "Inflammatory trend", cost: "$12" },
        { name: "Abdominal ultrasound", priority: "High", reason: "First-line imaging, non-compressible appendix", cost: "$120" },
        { name: "CT abdomen & pelvis", priority: "Medium", reason: "If ultrasound inconclusive", cost: "$480" },
      ],
      redFlags: [
        { text: "Rebound tenderness — evolving peritonitis", level: "emergency" },
        { text: "Delay increases perforation risk", level: "warning" },
        { text: "Penicillin allergy — avoid for prophylaxis", level: "contraindication" },
      ],
      followUps: [
        "Any prior appendectomy or abdominal surgery?",
        "Has the pain migrated from around the navel?",
        "Any vomiting, or only nausea and anorexia?",
        "When was the last oral intake? (surgical planning)",
        "Any urinary symptoms or haematuria?",
      ],
      soap: {
        s: "56M with 24h of severe RLQ pain, initially periumbilical then migrating. Nausea and anorexia, no vomiting. Low-grade fever since last night. Known penicillin allergy.",
        o: "T 37.8°C, HR 102, BP 128/78, RR 20, SpO₂ 98%. Abdomen soft, tender with guarding in RLQ; positive rebound and McBurney's point tenderness; Rovsing's positive. WBC 14.2, neutrophils 82%, CRP 32.",
        a: "Clinical and biochemical picture consistent with acute appendicitis (confidence 88%). Differential: mesenteric adenitis. No current signs of perforation.",
        p: "Keep NPO, IV fluids and analgesia. Urgent surgical consult. Abdominal ultrasound; CT if inconclusive. Serial exams. Consent for laparoscopic appendectomy if confirmed.",
      },
      references: [
        { source: "WSES", title: "Jerusalem guidelines for diagnosis & treatment of acute appendicitis", meta: "World J Emerg Surg · 2020", relevance: 96 },
        { source: "Cochrane", title: "Diagnostic accuracy of the Alvarado score", meta: "Cochrane Database · 2019", relevance: 91 },
        { source: "Radiology", title: "Ultrasound-first imaging strategy in suspected appendicitis", meta: "Radiology · 2021", relevance: 84 },
      ],
    },
  },
  {
    id: "acs",
    triggers: ["chest", "cardiac", "angina", "acs", "heart", "mi", "infarct", "palpitation"],
    patient: {
      name: "Sarah Malik",
      age: 54,
      gender: "Female",
      weight: "68 kg",
      height: "162 cm",
      bloodGroup: "A+",
      chiefComplaint: "Central chest tightness with diaphoresis",
      visitType: "Emergency · Resus",
      mrn: "MRN-2231001",
      status: { label: "Emergency", tone: "emergency" },
    },
    aiOpening: `## Time-critical — treat as ACS until excluded

Central chest tightness radiating to the left arm with diaphoresis is a **high-risk cardiac presentation**. Please prioritise the **ACS pathway**.

> ⚠️ Obtain a **12-lead ECG within 10 minutes** and serial high-sensitivity troponin.

**Immediate concerns**
- Exertional/rest chest pain with autonomic features
- Radiation to left arm/jaw
- Female patients may present atypically

I've raised the red-flag card and ordered the recommended workup. Confirm haemodynamics and do not delay ECG.`,
    aiOpeningDetail: `HEART score components pending troponin & ECG. If ST-elevation present → activate primary PCI pathway. Give aspirin 300 mg unless contraindicated; consider GTN if not hypotensive and no inferior/RV involvement suspected. Reassess after first troponin.`,
    insights: {
      diagnosis: {
        name: "Acute Coronary Syndrome",
        confidence: 76,
        urgency: "Critical",
        severity: "Severe",
        reasoning:
          "Typical ischaemic chest pain with radiation and diaphoresis in a patient with cardiovascular risk. Requires immediate ECG and troponin.",
      },
      differentials: [
        { name: "Acute Coronary Syndrome", confidence: 76, note: "ECG + troponin decisive" },
        { name: "Unstable Angina", confidence: 58, note: "If troponin negative, ongoing symptoms" },
        { name: "Pulmonary Embolism", confidence: 24, note: "Assess Wells score / pleuritic features" },
        { name: "GORD / Musculoskeletal", confidence: 12, note: "Diagnosis of exclusion" },
      ],
      investigations: [
        { name: "12-lead ECG", priority: "Immediate", reason: "Detect ST-segment change within 10 min", cost: "$40" },
        { name: "hs-Troponin (serial)", priority: "High", reason: "0h / 1h algorithm", cost: "$60" },
        { name: "Chest X-ray", priority: "Medium", reason: "Exclude alternative causes", cost: "$70" },
        { name: "U&E, glucose, lipids", priority: "Medium", reason: "Risk stratification", cost: "$30" },
      ],
      redFlags: [
        { text: "Central crushing chest pain radiating to left arm", level: "emergency" },
        { text: "Diaphoresis with pallor — sympathetic surge", level: "emergency" },
        { text: "Watch for ST-elevation → activate PCI pathway", level: "warning" },
      ],
      followUps: [
        "When did the pain start and how long has it lasted?",
        "Does it radiate to the jaw, back, or either arm?",
        "Is it related to exertion, and relieved by rest?",
        "Any prior cardiac history, stents, or MI?",
        "Smoking, diabetes, hypertension, or family history?",
      ],
      soap: {
        s: "54F with acute central chest tightness radiating to the left arm, associated diaphoresis and nausea. Symptoms began at rest ~40 min ago.",
        o: "Appears clammy. HR 96, BP 148/92, RR 22, SpO₂ 96%. Heart sounds normal, chest clear. ECG and troponin pending.",
        a: "High-risk chest pain — treat as ACS until excluded (confidence 76%). Differential: unstable angina, PE.",
        p: "12-lead ECG within 10 min, serial hs-troponin, aspirin 300 mg, continuous cardiac monitoring, IV access. Cardiology referral; activate PCI pathway if STEMI.",
      },
      references: [
        { source: "NICE", title: "Chest pain of recent onset: assessment & diagnosis (CG95)", meta: "NICE · 2016", relevance: 95 },
        { source: "ESC", title: "Guidelines for the management of ACS", meta: "Eur Heart J · 2023", relevance: 93 },
        { source: "PubMed", title: "0/1-hour hs-troponin rule-out algorithm", meta: "Circulation · 2021", relevance: 88 },
      ],
    },
  },
  {
    id: "pneumonia",
    triggers: ["fever", "cough", "sepsis", "infection", "pneumonia", "breath", "sputum", "chills"],
    patient: {
      name: "Rahul Anand",
      age: 41,
      gender: "Male",
      weight: "78 kg",
      height: "178 cm",
      bloodGroup: "B+",
      chiefComplaint: "Persistent productive cough with fever",
      visitType: "Urgent · OPD",
      mrn: "MRN-1902334",
      status: { label: "Urgent", tone: "urgent" },
    },
    aiOpening: `## Working assessment

Productive cough with fever and focal findings suggests **community-acquired pneumonia**. Stratify severity before deciding on admission.

**Consider a severity score**
- CURB-65 / CRB-65 for disposition
- SpO₂ and respiratory rate are key discriminators

I've suggested the workup and a follow-up set to complete the CURB-65. Confirm chest auscultation and oxygen saturation.`,
    aiOpeningDetail: `If CURB-65 ≥ 2, consider admission and IV antibiotics per local antimicrobial policy. Screen for sepsis using NEWS2. Check for atypical features and recent travel/exposures.`,
    insights: {
      diagnosis: {
        name: "Community-Acquired Pneumonia",
        confidence: 71,
        urgency: "Moderate",
        severity: "Moderate",
        reasoning:
          "Fever, productive cough and focal crackles with raised inflammatory markers. Severity scoring guides disposition.",
      },
      differentials: [
        { name: "Community-Acquired Pneumonia", confidence: 71, note: "Focal signs + fever" },
        { name: "Acute Bronchitis", confidence: 42, note: "If CXR clear" },
        { name: "COVID-19 / Viral LRTI", confidence: 30, note: "Test per local protocol" },
        { name: "Pulmonary TB", confidence: 14, note: "Consider if chronic / risk factors" },
      ],
      investigations: [
        { name: "Chest X-ray", priority: "High", reason: "Confirm consolidation", cost: "$70" },
        { name: "CBC, CRP, U&E", priority: "High", reason: "Severity & CURB-65", cost: "$40" },
        { name: "SpO₂ / ABG if hypoxic", priority: "Medium", reason: "Oxygenation", cost: "$25" },
        { name: "Sputum & blood cultures", priority: "Medium", reason: "Target antibiotics", cost: "$55" },
      ],
      redFlags: [
        { text: "RR > 30 or SpO₂ < 92% — respiratory compromise", level: "emergency" },
        { text: "Confusion or hypotension — sepsis, escalate", level: "warning" },
      ],
      followUps: [
        "How many days of fever and cough?",
        "Any breathlessness at rest or on exertion?",
        "Colour of the sputum — any blood?",
        "Any confusion, or new drowsiness?",
        "Recent travel, contacts, or vaccination status?",
      ],
      soap: {
        s: "41M with 4 days of productive cough, fever and pleuritic chest discomfort. Mild breathlessness on exertion.",
        o: "T 38.6°C, HR 98, BP 122/76, RR 22, SpO₂ 94%. Crackles right base. CRP raised.",
        a: "Likely community-acquired pneumonia (confidence 71%). Complete CURB-65 for disposition.",
        p: "Chest X-ray, bloods, cultures. Empirical antibiotics per policy pending severity. Antipyretics, oxygen if < 94%. Safety-net advice.",
      },
      references: [
        { source: "NICE", title: "Pneumonia in adults: diagnosis and management (CG191)", meta: "NICE · 2019", relevance: 92 },
        { source: "BTS", title: "Guidelines for the management of CAP in adults", meta: "Thorax · 2015", relevance: 87 },
        { source: "PubMed", title: "CURB-65 severity assessment validation", meta: "Thorax · 2003", relevance: 80 },
      ],
    },
  },
  {
    id: "diabetes",
    triggers: ["diabetes", "diabetic", "glucose", "hba1c", "sugar", "insulin", "polyuria"],
    patient: {
      name: "Priya Lal",
      age: 47,
      gender: "Female",
      weight: "81 kg",
      height: "160 cm",
      bloodGroup: "O-",
      chiefComplaint: "Type 2 diabetes follow-up — suboptimal control",
      visitType: "Routine · Follow-up",
      mrn: "MRN-5567201",
      status: { label: "Routine", tone: "routine" },
    },
    aiOpening: `## Follow-up review

HbA1c above target on current therapy suggests **intensification of type 2 diabetes management**. Balance glycaemic goals with cardiovascular and renal protection.

**Focus areas**
- Glycaemic trend and hypoglycaemia risk
- Cardio-renal risk (consider SGLT2i / GLP-1 RA)
- Complication screening

I've laid out the review workup and follow-up questions. Confirm adherence and lifestyle factors.`,
    aiOpeningDetail: `Consider SGLT2 inhibitor if eGFR permits and CV/renal risk present; GLP-1 RA where weight and CV benefit are priorities. Reinforce foot, retinal, and renal screening intervals.`,
    insights: {
      diagnosis: {
        name: "Type 2 Diabetes — suboptimal control",
        confidence: 82,
        urgency: "Routine",
        severity: "Mild",
        reasoning:
          "Established T2DM with HbA1c above individualised target on current regimen. Intensify with cardio-renal considerations.",
      },
      differentials: [
        { name: "T2DM — inadequate control", confidence: 82, note: "Adherence & dose optimisation" },
        { name: "Medication non-adherence", confidence: 44, note: "Clarify before escalating" },
        { name: "Secondary hyperglycaemia", confidence: 18, note: "Steroids, infection, stress" },
      ],
      investigations: [
        { name: "HbA1c", priority: "High", reason: "Glycaemic control over 3 months", cost: "$25" },
        { name: "U&E + eGFR, urine ACR", priority: "High", reason: "Renal function & nephropathy", cost: "$35" },
        { name: "Lipid profile", priority: "Medium", reason: "CV risk", cost: "$20" },
        { name: "Retinal & foot screening", priority: "Medium", reason: "Complication surveillance", cost: "—" },
      ],
      redFlags: [
        { text: "Recurrent hypoglycaemia — review sulfonylurea/insulin", level: "warning" },
        { text: "Rising ACR / falling eGFR — nephroprotection", level: "warning" },
      ],
      followUps: [
        "How consistent has medication and diet adherence been?",
        "Any hypoglycaemic episodes or symptoms?",
        "Any numbness, tingling, or foot changes?",
        "Blood pressure readings at home?",
        "Any changes in vision?",
      ],
      soap: {
        s: "47F with T2DM for review. Reports variable diet adherence, no clear hypoglycaemia. No new neuropathic symptoms.",
        o: "BMI 31.6. BP 138/84. HbA1c 8.4% (target < 7%). eGFR 78, ACR mildly raised.",
        a: "Type 2 diabetes with suboptimal control (confidence 82%). Cardio-renal risk present.",
        p: "Intensify therapy — consider SGLT2i/GLP-1 RA. Optimise BP and lipids. Reinforce lifestyle. Arrange retinal & foot screening; review in 3 months.",
      },
      references: [
        { source: "NICE", title: "Type 2 diabetes in adults: management (NG28)", meta: "NICE · 2022", relevance: 94 },
        { source: "ADA", title: "Standards of Care in Diabetes", meta: "Diabetes Care · 2024", relevance: 90 },
        { source: "PubMed", title: "SGLT2 inhibitors and cardio-renal outcomes", meta: "NEJM · 2020", relevance: 86 },
      ],
    },
  },
  {
    id: "hypertension",
    triggers: ["hypertension", "blood pressure", "bp", "headache", "hypertensive"],
    patient: {
      name: "Marcus Owusu",
      age: 63,
      gender: "Male",
      weight: "88 kg",
      height: "180 cm",
      bloodGroup: "AB+",
      chiefComplaint: "Follow-up — elevated blood pressure readings",
      visitType: "Routine · Follow-up",
      mrn: "MRN-3345098",
      status: { label: "Routine", tone: "routine" },
    },
    aiOpening: `## Follow-up review

Persistently elevated readings suggest **inadequately controlled hypertension**. Confirm with out-of-office measurement and assess end-organ risk.

**Priorities**
- Ambulatory / home BP confirmation
- End-organ assessment (renal, cardiac, retinal)
- Stepwise therapy per guideline

I've prepared the workup and review questions. Confirm technique and adherence before escalating therapy.`,
    aiOpeningDetail: `If confirmed stage 2 or with end-organ damage, step up therapy (ACEi/ARB ± CCB ± thiazide-like diuretic per guideline). Screen for secondary causes if young onset, resistant, or suggestive features.`,
    insights: {
      diagnosis: {
        name: "Uncontrolled Hypertension",
        confidence: 79,
        urgency: "Routine",
        severity: "Mild",
        reasoning:
          "Repeated elevated readings above target. Requires confirmation and end-organ assessment before/with therapy escalation.",
      },
      differentials: [
        { name: "Essential hypertension — uncontrolled", confidence: 79, note: "Most common" },
        { name: "White-coat effect", confidence: 38, note: "Confirm with ABPM/HBPM" },
        { name: "Secondary hypertension", confidence: 16, note: "Screen if resistant/young" },
      ],
      investigations: [
        { name: "Ambulatory / home BP monitoring", priority: "High", reason: "Confirm true BP", cost: "$45" },
        { name: "U&E + eGFR, urine ACR", priority: "High", reason: "Renal end-organ", cost: "$35" },
        { name: "ECG", priority: "Medium", reason: "LVH / ischaemia", cost: "$40" },
        { name: "HbA1c, lipids", priority: "Medium", reason: "Global CV risk", cost: "$40" },
      ],
      redFlags: [
        { text: "BP ≥ 180/120 with symptoms — hypertensive emergency", level: "emergency" },
        { text: "Signs of end-organ damage — escalate", level: "warning" },
      ],
      followUps: [
        "What are the recent home BP readings?",
        "Any headaches, visual changes, or chest pain?",
        "How is medication adherence?",
        "Salt intake, alcohol, and activity levels?",
        "Any snoring / daytime sleepiness? (OSA)",
      ],
      soap: {
        s: "63M for hypertension review. Home readings persistently ~150/95. No headaches or visual symptoms. Adherent to single agent.",
        o: "Clinic BP 152/96 (repeated). BMI 27.2. No focal neurology. Fundi not yet examined.",
        a: "Uncontrolled hypertension (confidence 79%). Confirm with out-of-office monitoring; assess end-organ status.",
        p: "Arrange ABPM. Bloods, ECG, ACR. Step up therapy per guideline if confirmed. Lifestyle advice; review in 4 weeks.",
      },
      references: [
        { source: "NICE", title: "Hypertension in adults: diagnosis and management (NG136)", meta: "NICE · 2023", relevance: 93 },
        { source: "ESC", title: "Guidelines for the management of arterial hypertension", meta: "Eur Heart J · 2024", relevance: 90 },
        { source: "PubMed", title: "SPRINT — intensive BP control outcomes", meta: "NEJM · 2015", relevance: 84 },
      ],
    },
  },
];

/** Generic fallback scenario for "General Consultation" / unmatched input. */
export const GENERIC_SCENARIO: Scenario = {
  id: "general",
  triggers: [],
  patient: {
    name: "New Patient",
    age: 0,
    gender: "—",
    weight: "—",
    height: "—",
    bloodGroup: "—",
    chiefComplaint: "Awaiting history",
    visitType: "OPD · Consultation",
    mrn: "MRN — pending",
    status: { label: "Stable", tone: "stable" },
  },
  aiOpening: `## Ready when you are

Share the presenting complaint, examination findings, or a clinical question and I'll start building a structured assessment.

As you add detail, I'll continuously update the **differential**, **recommended investigations**, **red flags**, and a live **SOAP summary** on the right — you stay in control of every decision.`,
  insights: {
    diagnosis: null,
    differentials: [],
    investigations: [],
    redFlags: [],
    followUps: [
      "What is the primary presenting complaint?",
      "When did the symptoms begin?",
      "Any relevant past medical history?",
      "Current medications and allergies?",
    ],
    soap: { s: "", o: "", a: "", p: "" },
    references: [],
  },
};

export function matchScenario(text: string): Scenario {
  const t = text.toLowerCase();
  for (const s of SCENARIOS) {
    if (s.triggers.some((k) => t.includes(k))) return s;
  }
  return GENERIC_SCENARIO;
}

/** Map the empty-state quick-start topics to a scenario id. */
export const STARTERS: { label: string; query: string }[] = [
  { label: "Abdominal Pain", query: "abdominal pain" },
  { label: "Chest Pain", query: "chest pain" },
  { label: "Fever", query: "fever and cough" },
  { label: "Diabetes Follow-up", query: "diabetes follow-up" },
  { label: "Hypertension", query: "hypertension review" },
  { label: "General Consultation", query: "general consultation" },
];
