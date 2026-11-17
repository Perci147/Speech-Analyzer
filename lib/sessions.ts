"use client";

/**
 * Where practice sessions live:
 *  - Signed in: the user's account in Supabase (practice_sessions table, protected by RLS).
 *  - Guest: this browser's localStorage (lib/storage.ts), same as before accounts existed.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisResult, SpeechSession } from "./types";
import * as local from "./storage";
import { getSupabaseBrowserClient } from "./supabase/client";

interface SessionRow {
  id: string;
  created_at: string;
  scenario: string;
  custom_question: string | null;
  analysis: AnalysisResult;
}

const COLUMNS = "id, created_at, scenario, custom_question, analysis";

function fromRow(row: SessionRow): SpeechSession {
  return {
    id: row.id,
    createdAt: row.created_at,
    scenario: row.scenario,
    customQuestion: row.custom_question ?? undefined,
    analysis: row.analysis,
  };
}

function toRow(s: SpeechSession) {
  return {
    id: s.id,
    created_at: s.createdAt,
    scenario: s.scenario,
    custom_question: s.customQuestion ?? null,
    analysis: s.analysis,
  };
}

/** Returns the client and user id when signed in, otherwise null. */
async function account(): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  return userId ? { supabase, userId } : null;
}

export async function listSessions(): Promise<SpeechSession[]> {
  const acct = await account();
  if (!acct) return local.getSessions();
  const { data, error } = await acct.supabase
    .from("practice_sessions")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Could not load your sessions: ${error.message}`);
  return (data as SessionRow[]).map(fromRow);
}

export async function getSession(id: string): Promise<SpeechSession | undefined> {
  const acct = await account();
  if (acct) {
    const { data, error } = await acct.supabase.from("practice_sessions").select(COLUMNS).eq("id", id).maybeSingle();
    if (error) throw new Error(`Could not load this session: ${error.message}`);
    if (data) return fromRow(data as SessionRow);
  }
  // Fall back to this device (guest sessions, or ones not yet saved to the account).
  return local.getSession(id);
}

/** Saves to the account when signed in. If that fails, keeps it on this device so nothing is lost. */
export async function saveSession(session: SpeechSession): Promise<"account" | "device"> {
  const acct = await account();
  if (acct) {
    const { error } = await acct.supabase.from("practice_sessions").insert(toRow(session));
    if (!error) return "account";
    console.error("Saving to account failed, keeping on this device:", error.message);
  }
  local.saveSession(session);
  return "device";
}

export async function deleteSession(id: string): Promise<void> {
  local.deleteSession(id);
  const acct = await account();
  if (!acct) return;
  const { error } = await acct.supabase.from("practice_sessions").delete().eq("id", id);
  if (error) throw new Error(`Could not delete this session: ${error.message}`);
}

/** Clears what the user is currently looking at: account sessions when signed in, else this device. */
export async function clearSessions(): Promise<void> {
  const acct = await account();
  if (!acct) {
    local.clearSessions();
    return;
  }
  const { error } = await acct.supabase.from("practice_sessions").delete().eq("user_id", acct.userId);
  if (error) throw new Error(`Could not clear your sessions: ${error.message}`);
}

/** Sessions saved on this device as a guest. */
export function deviceSessionCount(): number {
  return local.getSessions().length;
}

/** Copies this device's guest sessions into the signed-in account, then removes them from the device. */
export async function importDeviceSessions(): Promise<number> {
  const acct = await account();
  if (!acct) throw new Error("Sign in first to save sessions to your account.");
  const sessions = local.getSessions();
  if (sessions.length === 0) return 0;
  const { error } = await acct.supabase
    .from("practice_sessions")
    .upsert(sessions.map(toRow), { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(`Could not save sessions to your account: ${error.message}`);
  local.clearSessions();
  return sessions.length;
}
