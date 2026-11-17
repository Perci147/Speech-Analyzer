import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * Landing point for links in Supabase emails (confirm sign-up, reset password).
 * Supports both Supabase link styles:
 *  - ?code=...                      (default email templates, same browser)
 *  - ?token_hash=...&type=...       (recommended templates, works on any device)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(url.searchParams.get("next"), "/");

  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL("/", url.origin));

  let errorMessage: string | null = null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    errorMessage = error?.message ?? null;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    errorMessage = error?.message ?? null;
  } else {
    errorMessage = "missing code";
  }

  if (errorMessage) {
    console.error("Auth link failed:", errorMessage);
    return NextResponse.redirect(new URL("/login?error=link", url.origin));
  }

  // Recovery links go to the reset form; sign-up confirmations land where the user started.
  const destination = type === "recovery" ? "/reset-password" : next;
  return NextResponse.redirect(new URL(destination, url.origin));
}
