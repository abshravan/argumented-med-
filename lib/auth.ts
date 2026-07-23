"use client";

/**
 * DEMO AUTHENTICATION — client-side only.
 *
 * This is a mock auth layer for local development and demos. There is no server,
 * no password hashing and no real session security: everything lives in this
 * browser's localStorage. Do NOT ship this as-is. Replace with a real identity
 * provider (hospital SSO / OIDC) before any clinical use.
 */

export type Role = "Physician" | "Specialist" | "Resident" | "Nurse";

export interface Session {
  email: string;
  name: string;
  role: Role;
  specialty: string;
  organization: string;
  onboarded: boolean;
  initials: string;
}

interface StoredUser {
  email: string;
  password: string;
  name: string;
  role: Role;
  specialty: string;
  organization: string;
}

const SESSION_KEY = "mediassist:session";
const USERS_KEY = "mediassist:users";
const CHANGED = "mediassist:auth-changed";

/** The built-in test account. Shown on the login screen. */
export const TEST_ACCOUNT = {
  email: "doctor@mediassist.health",
  password: "mediassist",
  name: "Dr. John Doe",
  role: "Physician" as Role,
  specialty: "Cardiology",
  organization: "City General Hospital",
};

export const ROLES: Role[] = ["Physician", "Specialist", "Resident", "Nurse"];

export const SPECIALTIES = [
  "Cardiology",
  "Emergency Medicine",
  "General Medicine",
  "Surgery",
  "Paediatrics",
  "Obstetrics & Gynaecology",
  "Neurology",
  "Respiratory",
  "Other",
];

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CHANGED));
}

export function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "MD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* storage unavailable */
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    emit();
  } catch {
    /* storage unavailable */
  }
}

export class AuthError extends Error {}

export function signIn(email: string, password: string): Session {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) throw new AuthError("Enter your email and password.");

  if (normalized === TEST_ACCOUNT.email && password === TEST_ACCOUNT.password) {
    const session: Session = {
      email: TEST_ACCOUNT.email,
      name: TEST_ACCOUNT.name,
      role: TEST_ACCOUNT.role,
      specialty: TEST_ACCOUNT.specialty,
      organization: TEST_ACCOUNT.organization,
      onboarded: true,
      initials: initials(TEST_ACCOUNT.name),
    };
    writeSession(session);
    return session;
  }

  const user = readUsers().find((u) => u.email === normalized);
  if (!user || user.password !== password) {
    throw new AuthError("Those credentials don't match an account on this device.");
  }

  const session: Session = {
    email: user.email,
    name: user.name,
    role: user.role,
    specialty: user.specialty,
    organization: user.organization,
    onboarded: true,
    initials: initials(user.name),
  };
  writeSession(session);
  return session;
}

export function signUp(input: {
  name: string;
  email: string;
  password: string;
  organization: string;
  role: Role;
}): Session {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) throw new AuthError("Enter your full name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AuthError("Enter a valid work email address.");
  if (input.password.length < 6) throw new AuthError("Password must be at least 6 characters.");

  const users = readUsers();
  if (email === TEST_ACCOUNT.email || users.some((u) => u.email === email)) {
    throw new AuthError("An account with that email already exists on this device.");
  }

  users.push({
    email,
    password: input.password,
    name: input.name.trim(),
    role: input.role,
    specialty: "",
    organization: input.organization.trim(),
  });
  writeUsers(users);

  // New accounts go through onboarding.
  const session: Session = {
    email,
    name: input.name.trim(),
    role: input.role,
    specialty: "",
    organization: input.organization.trim(),
    onboarded: false,
    initials: initials(input.name),
  };
  writeSession(session);
  return session;
}

/** Instant sign-in with the built-in test account. */
export function signInAsTestUser(): Session {
  return signIn(TEST_ACCOUNT.email, TEST_ACCOUNT.password);
}

export function completeOnboarding(patch: { specialty?: string; role?: Role }): Session | null {
  const session = getSession();
  if (!session) return null;

  const next: Session = { ...session, ...patch, onboarded: true };
  writeSession(next);

  // Mirror the choices onto the stored user record.
  const users = readUsers();
  const user = users.find((u) => u.email === session.email);
  if (user) {
    if (patch.specialty) user.specialty = patch.specialty;
    if (patch.role) user.role = patch.role;
    writeUsers(users);
  }
  return next;
}

export function signOut(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    emit();
  } catch {
    /* ignore */
  }
}

export function onAuthChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const storage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) handler();
  };
  window.addEventListener(CHANGED, handler);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CHANGED, handler);
    window.removeEventListener("storage", storage);
  };
}
