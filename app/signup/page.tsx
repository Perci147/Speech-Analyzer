"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AccountsNotConfigured,
  AuthCard,
  Field,
  Notice,
  PasswordField,
  SubmitButton,
  friendlyAuthError,
} from "@/components/AuthCard";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (!supabase) return <AccountsNotConfigured />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Please choose a password with at least 8 characters.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/` },
    });
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    if (data.session) {
      // Email confirmation is turned off in Supabase: the user is signed in right away.
      router.push("/");
      router.refresh();
      return;
    }
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle="One more step to finish creating your account.">
        <Notice kind="success">
          We sent a confirmation link to <strong>{sentTo}</strong>. Click it to activate your account, then you&apos;ll be
          signed in automatically.
        </Notice>
        <p className="mt-4 text-sm text-slate-500">
          Don&apos;t see it? Check your spam folder. The link expires after 24 hours.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your free account"
      subtitle="Save your practice history and track your progress on any device."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters."
        />
        {error && <Notice kind="error">{error}</Notice>}
        <SubmitButton loading={loading}>Create account</SubmitButton>
        <p className="text-xs leading-relaxed text-slate-500">
          Privacy: your audio is never stored. We save each session&apos;s scenario, question, transcript, and coaching
          feedback to your account so you can review them later. You can delete any session at any time.
        </p>
      </form>
    </AuthCard>
  );
}
