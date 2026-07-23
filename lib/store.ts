"use client";

import type { Insights, Message, Patient } from "./types";

export interface ConsultationRecord {
  id: string;
  title: string;
  startedAt: number;
  updatedAt: number;
  patient: Patient | null;
  messages: Message[];
  insights: Insights;
  saved: boolean;
  mode: "backend" | "demo";
}

export interface FavoriteItem {
  consultationId: string;
  consultationTitle: string;
  message: Message;
}

const KEY = "mediassist:consultations";
const CHANGED = "mediassist:consultations-changed";

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CHANGED));
}

export function listConsultations(): ConsultationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConsultationRecord[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function writeAll(records: ConsultationRecord[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep the 50 most recent so localStorage can't grow unbounded.
    const trimmed = [...records].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
    emit();
  } catch {
    /* quota exceeded — skip persistence rather than breaking the session */
  }
}

export function upsertConsultation(record: ConsultationRecord): void {
  const all = listConsultations();
  const idx = all.findIndex((r) => r.id === record.id);
  if (idx >= 0) all[idx] = record;
  else all.push(record);
  writeAll(all);
}

export function getConsultation(id: string): ConsultationRecord | undefined {
  return listConsultations().find((r) => r.id === id);
}

export function deleteConsultation(id: string): void {
  writeAll(listConsultations().filter((r) => r.id !== id));
}

export function setSaved(id: string, saved: boolean): void {
  const all = listConsultations();
  const rec = all.find((r) => r.id === id);
  if (!rec) return;
  rec.saved = saved;
  writeAll(all);
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    emit();
  } catch {
    /* ignore */
  }
}

/** Every bookmarked message across every consultation. */
export function listFavorites(): FavoriteItem[] {
  const out: FavoriteItem[] = [];
  for (const record of listConsultations()) {
    for (const message of record.messages) {
      if (message.bookmarked) {
        out.push({ consultationId: record.id, consultationTitle: record.title, message });
      }
    }
  }
  return out.sort((a, b) => b.message.timestamp - a.message.timestamp);
}

/** Subscribe to store changes (same-tab custom event + cross-tab storage event). */
export function onStoreChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const storage = (e: StorageEvent) => {
    if (e.key === KEY) handler();
  };
  window.addEventListener(CHANGED, handler);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CHANGED, handler);
    window.removeEventListener("storage", storage);
  };
}

export function titleFromText(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean || "Untitled consultation";
}
