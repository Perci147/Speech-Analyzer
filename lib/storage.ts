import type { SpeechSession } from "./types";

const STORAGE_KEY = "speech-analyzer:sessions";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getSessions(): SpeechSession[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s.id === "string" && s.analysis)
      .sort(
        (a: SpeechSession, b: SpeechSession) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch {
    return [];
  }
}

export function getSession(id: string): SpeechSession | undefined {
  return getSessions().find((s) => s.id === id);
}

export function saveSession(session: SpeechSession): void {
  if (!isBrowser()) return;
  try {
    const sessions = getSessions().filter((s) => s.id !== session.id);
    sessions.unshift(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error("Failed to save session", err);
  }
}

export function deleteSession(id: string): void {
  if (!isBrowser()) return;
  try {
    const sessions = getSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error("Failed to delete session", err);
  }
}

export function clearSessions(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear sessions", err);
  }
}
