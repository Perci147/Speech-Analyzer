"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Mic className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>}
    </div>
  );
}

const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50";

export function Field({
  label,
  id,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input id={id} className={inputClass} {...props} />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function PasswordField({
  label,
  id,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className={cn(inputClass, "pr-10")} {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/30 disabled:opacity-60"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-blue-200 bg-blue-50 text-slate-700",
  }[kind];
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", styles)} role={kind === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function AccountsNotConfigured() {
  return (
    <AuthCard title="Accounts aren't set up yet" subtitle="You can still practice as a guest.">
      <Notice kind="info">
        Add your Supabase keys to <code>.env.local</code> and restart the app to turn on accounts. See the README for
        the steps.
      </Notice>
    </AuthCard>
  );
}

/** Supabase error messages, rephrased for people. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Check them and try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link we sent.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("password should be") || m.includes("weak password"))
    return "Please choose a stronger password: at least 8 characters.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "Your new password must be different from your old one.";
  return message;
}
