"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AccountsNotConfigured,
  AuthCard,
  Field,
  Notice,
  SubmitButton,
  friendlyAuthError,
} from "@/components/AuthCard";

export default function ForgotPasswordPage() {
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!supabase) return <AccountsNotConfigured />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    setSent(true);
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a reset link."
      footer={
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Notice kind="success">
          If an account exists for <strong>{email.trim()}</strong>, a password reset link is on its way. Check your
          inbox and spam folder.
        </Notice>
      ) : (
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
          {error && <Notice kind="error">{error}</Notice>}
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
