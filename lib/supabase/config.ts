/**
 * Supabase settings. Accounts are optional: when these env vars are missing,
 * the app runs in guest-only mode and keeps sessions in the browser.
 *
 * NEXT_PUBLIC_* values are safe to expose to the browser. Row Level Security
 * in supabase/schema.sql is what keeps each user's data private.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** Daily analysis limits. Override in .env.local. */
export const DAILY_LIMIT_GUEST = positiveInt(process.env.DAILY_LIMIT_GUEST, 3);
export const DAILY_LIMIT_USER = positiveInt(process.env.DAILY_LIMIT_USER, 20);

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/** Only allow same-site relative redirects like "/record", never "//evil.com". */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
