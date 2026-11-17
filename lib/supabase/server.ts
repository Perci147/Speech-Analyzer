import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Supabase client bound to the current request's cookies (acts as the signed-in user).
 * Use in route handlers and server components. Returns null when accounts are not configured.
 */
export function createSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a server component, where cookies are read-only. Middleware refreshes them.
        }
      },
    },
  });
}

const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let adminClient: SupabaseClient | null = null;

/**
 * Privileged client for server-only tasks (daily usage limits). Bypasses Row Level Security,
 * so it must never be imported into client code. Returns null when the secret key is missing.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured || !SECRET_KEY) return null;
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
