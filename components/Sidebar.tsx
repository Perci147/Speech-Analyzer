"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogIn, LogOut, Mic, Sparkles, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/record", label: "Practice Now", icon: Sparkles },
];

function useSignOut() {
  const { signOut } = useAuth();
  const router = useRouter();
  return async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };
}

/** Compact account control for the mobile top bar. */
function MobileAccount() {
  const { configured, user, loading } = useAuth();
  const handleSignOut = useSignOut();
  if (!configured || loading) return null;
  if (user) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 md:hidden"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    );
  }
  return (
    <Link
      href="/login"
      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 md:hidden"
    >
      <LogIn className="h-3.5 w-3.5" /> Sign in
    </Link>
  );
}

/** Account panel at the bottom of the desktop sidebar. */
function DesktopAccount() {
  const { configured, user, loading } = useAuth();
  const handleSignOut = useSignOut();
  if (!configured) return null;

  if (loading) return <div className="h-[92px] animate-pulse rounded-lg bg-slate-100" />;

  if (user) {
    const email = user.email ?? "Your account";
    return (
      <div className="rounded-lg border border-slate-200 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold uppercase text-white">
            {email.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900" title={email}>
              {email}
            </p>
            <p className="text-xs text-slate-500">Signed in</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-900">Practicing as a guest</p>
      <p className="mt-0.5 text-xs text-slate-500">Create a free account to keep your history on any device.</p>
      <div className="mt-3 flex gap-2">
        <Link
          href="/signup"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <UserPlus className="h-3.5 w-3.5" /> Sign up
        </Link>
        <Link
          href="/login"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <LogIn className="h-3.5 w-3.5" /> Sign in
        </Link>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <Mic className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold leading-tight text-slate-900">Speech Analyzer</p>
          <p className="text-xs text-slate-500">Public Speaking Coach</p>
        </div>
        <MobileAccount />
      </div>

      <nav className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:flex-none",
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden space-y-3 px-5 py-5 md:block">
        <DesktopAccount />
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-700">Tip</p>
          <p className="mt-1">
            Record in a quiet room, 30 to 90 seconds, and speak as you would in the real moment.
          </p>
        </div>
      </div>
    </aside>
  );
}
