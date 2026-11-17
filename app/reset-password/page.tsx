"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  AccountsNotConfigured,
  AuthCard,
  Notice,
  PasswordField,
  SubmitButton,
  friendlyAuthError,
} from "@/components/AuthCard";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!supabase) return <AccountsNotConfigured />;

  if (!authLoading && !user && !done) {
    return (
      <AuthCard title="This reset link has expired" subtitle="Reset links work once and expire after an hour.">
        <Link
          href="/forgot-password"
          className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Please choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1500);
  };

  return (
    <AuthCard title="Choose a new password" subtitle={user?.email ? `For ${user.email}` : undefined}>
      {done ? (
        <Notice kind="success">Your password has been updated. Taking you to your dashboard…</Notice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <PasswordField
            label="New password"
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="At least 8 characters."
          />
          <PasswordField
            label="Confirm new password"
            id="confirm"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <Notice kind="error">{error}</Notice>}
          <SubmitButton loading={loading || authLoading}>Update password</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
