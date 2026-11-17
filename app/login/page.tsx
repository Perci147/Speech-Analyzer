"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/supabase/config";
import {
  AccountsNotConfigured,
  AuthCard,
  Field,
  Notice,
  PasswordField,
  SubmitButton,
  friendlyAuthError,
} from "@/components/AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [next, setNext] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(safeNextPath(params.get("next"), "/"));
    if (params.get("error") === "link") {
      setError("That link is invalid or has expired. Sign in below, or request a new link.");
    }
  }, []);

  if (!supabase) return <AccountsNotConfigured />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setNeedsConfirm(false);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error.message));
      setNeedsConfirm(error.message.toLowerCase().includes("email not confirmed"));
      return;
    }
    router.push(next);
    router.refresh();
  };

  const resend = async () => {
    setError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/` },
    });
    if (error) setError(friendlyAuthError(error.message));
    else {
      setNeedsConfirm(false);
      setInfo(`We sent a new confirmation link to ${email.trim()}.`);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to see your practice history on any device."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
            Create a free account
          </Link>
          <span className="mx-2 text-slate-300">·</span>
          <Link href="/record" className="font-medium text-slate-600 hover:text-slate-900">
            Practice as a guest
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <PasswordField
          label="Password"
          id="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            Forgot your password?
          </Link>
        </div>
        {error && (
          <Notice kind="error">
            {error}
            {needsConfirm && (
              <button type="button" onClick={resend} className="ml-1 font-medium underline">
                Resend the link
              </button>
            )}
          </Notice>
        )}
        {info && <Notice kind="success">{info}</Notice>}
        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>
    </AuthCard>
  );
}
