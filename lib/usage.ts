import "server-only";
import { createHash } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { DAILY_LIMIT_GUEST, DAILY_LIMIT_USER } from "./supabase/config";
import { createSupabaseServerClient, getSupabaseAdminClient } from "./supabase/server";

export interface Caller {
  user: User | null;
  /** Counter key: "user:<id>" or "guest:<hashed ip>". */
  key: string;
  limit: number;
  isGuest: boolean;
}

export interface UsageStatus {
  enabled: boolean;
  isGuest: boolean;
  used: number;
  limit: number;
}

/** Hash the IP so raw addresses are never stored. */
function hashIp(ip: string): string {
  const salt = process.env.USAGE_SALT || process.env.SUPABASE_SECRET_KEY || "speech-analyzer";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function identifyCaller(req: Request): Promise<Caller> {
  let user: User | null = null;
  const supabase = createSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  }
  return user
    ? { user, key: `user:${user.id}`, limit: DAILY_LIMIT_USER, isGuest: false }
    : { user: null, key: `guest:${hashIp(clientIp(req))}`, limit: DAILY_LIMIT_GUEST, isGuest: true };
}

/** Limits are only enforced when the Supabase secret key is configured. */
export function usageLimitsEnabled(): boolean {
  return getSupabaseAdminClient() !== null;
}

export async function getUsage(caller: Caller): Promise<UsageStatus> {
  const admin = getSupabaseAdminClient();
  if (!admin) return { enabled: false, isGuest: caller.isGuest, used: 0, limit: caller.limit };
  const { data, error } = await admin.rpc("get_analysis_usage", { p_key: caller.key });
  if (error) {
    console.error("get_analysis_usage failed (did you run supabase/schema.sql?):", error.message);
    return { enabled: false, isGuest: caller.isGuest, used: 0, limit: caller.limit };
  }
  return { enabled: true, isGuest: caller.isGuest, used: Number(data) || 0, limit: caller.limit };
}

/**
 * Uses one analysis. Returns allowed=true when under the limit (or when limits are off).
 * Fails open if the database call errors, so a setup mistake never blocks practice; it is logged.
 */
export async function consumeAnalysis(
  caller: Caller
): Promise<{ allowed: boolean; used: number; limit: number; counted: boolean }> {
  const admin = getSupabaseAdminClient();
  if (!admin) return { allowed: true, used: 0, limit: caller.limit, counted: false };
  const { data, error } = await admin.rpc("consume_analysis_quota", { p_key: caller.key, p_limit: caller.limit });
  if (error) {
    console.error("consume_analysis_quota failed (did you run supabase/schema.sql?):", error.message);
    return { allowed: true, used: 0, limit: caller.limit, counted: false };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { allowed: Boolean(row?.allowed), used: Number(row?.used) || 0, limit: caller.limit, counted: Boolean(row?.allowed) };
}

export async function refundAnalysis(caller: Caller): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  const { error } = await admin.rpc("refund_analysis_quota", { p_key: caller.key });
  if (error) console.error("refund_analysis_quota failed:", error.message);
}
