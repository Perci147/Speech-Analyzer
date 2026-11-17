"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  ChevronRight,
  CloudUpload,
  Gauge,
  Mic,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import ScoreRing from "@/components/ScoreRing";
import { clearSessions, deleteSession, deviceSessionCount, importDeviceSessions, listSessions } from "@/lib/sessions";
import { useAuth } from "@/components/AuthProvider";
import type { SpeechSession } from "@/lib/types";
import { cn, formatDate, formatTime, scoreBg, scoreColor } from "@/lib/utils";

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export default function DashboardPage() {
  const { configured, user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SpeechSession[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deviceCount, setDeviceCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      setSessions(await listSessions());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load your sessions.");
      setSessions([]);
    }
    setDeviceCount(deviceSessionCount());
  }, []);

  // Reload whenever the user signs in or out: the list comes from the account or from this device.
  useEffect(() => {
    if (authLoading) return;
    setSessions(null);
    reload();
  }, [authLoading, user?.id, reload]);

  const handleImport = async () => {
    setImporting(true);
    setImportMessage(null);
    try {
      const n = await importDeviceSessions();
      setImportMessage(`Saved ${n} session${n === 1 ? "" : "s"} to your account.`);
      await reload();
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : "Could not save sessions to your account.");
    } finally {
      setImporting(false);
    }
  };

  const stats = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    const scores = sessions.map((s) => s.analysis.overallScore ?? 0);
    const recent = sessions.slice(0, 5).map((s) => s.analysis.overallScore ?? 0);
    const earlier = sessions.slice(5, 10).map((s) => s.analysis.overallScore ?? 0);
    const trend = earlier.length > 0 ? average(recent) - average(earlier) : null;
    return {
      count: sessions.length,
      avgScore: average(scores),
      best: Math.max(...scores),
      avgWpm: average(sessions.map((s) => s.analysis.metrics?.wpm ?? 0).filter((n) => n > 0)),
      avgFillers: average(sessions.map((s) => s.analysis.metrics?.fillerWordCount ?? 0)),
      totalPracticeSeconds: sessions.reduce((a, s) => a + (s.analysis.metrics?.durationSeconds ?? 0), 0),
      trend,
    };
  }, [sessions]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this session?")) return;
    try {
      await deleteSession(id);
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete this session.");
    }
  };

  const handleClearAll = async () => {
    const where = user ? "from your account" : "from this device";
    if (!window.confirm(`Delete all practice sessions ${where}? This cannot be undone.`)) return;
    try {
      await clearSessions();
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not clear your sessions.");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Track your progress across practice sessions.</p>
        </div>
        <Link
          href="/record"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Mic className="h-4 w-4" /> Practice Now
        </Link>
      </header>

      {user && deviceCount > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center">
          <CloudUpload className="h-6 w-6 shrink-0 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {deviceCount} practice session{deviceCount === 1 ? " is" : "s are"} saved only on this device
            </p>
            <p className="text-sm text-slate-600">Save them to your account to keep them on every device.</p>
          </div>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {importing ? "Saving…" : "Save to my account"}
          </button>
        </section>
      )}

      {importMessage && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{importMessage}</p>
      )}

      {loadError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>
      )}

      {configured && !authLoading && !user && sessions !== null && sessions.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Your history is only saved in this browser</p>
            <p className="text-sm text-slate-600">
              Create a free account to keep your sessions safe and see them on any device.
            </p>
          </div>
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Create free account
          </Link>
        </section>
      )}

      {sessions === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-slate-900">No sessions yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Record a 30 to 90 second practice run and get detailed coaching on your tone, pacing, pauses, filler
            words, and articulation.
          </p>
          <Link
            href="/record"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Start your first session <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <ScoreRing score={stats.avgScore} size={72} strokeWidth={7} />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Average score</p>
                  {stats.trend !== null && (
                    <p
                      className={cn(
                        "mt-1 flex items-center gap-1 text-xs font-medium",
                        stats.trend >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}
                    >
                      {stats.trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {stats.trend >= 0 ? "+" : ""}
                      {stats.trend} vs. earlier
                    </p>
                  )}
                  {stats.trend === null && <p className="mt-1 text-xs text-slate-400">across {stats.count} session{stats.count === 1 ? "" : "s"}</p>}
                </div>
              </div>

              <StatCard icon={Trophy} label="Best score" value={String(stats.best)} sub={`${stats.count} session${stats.count === 1 ? "" : "s"}`} />
              <StatCard icon={Gauge} label="Average pace" value={`${stats.avgWpm} wpm`} sub="Target: 130–160 wpm" />
              <StatCard
                icon={AudioLines}
                label="Avg. filler words"
                value={String(stats.avgFillers)}
                sub={`${formatTime(stats.totalPracticeSeconds)} total practice`}
              />
            </section>
          )}

          {/* History */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Session history</h2>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-medium text-slate-500 hover:text-rose-600"
              >
                Clear all
              </button>
            </div>
            <ul className="divide-y divide-slate-200">
              {sessions.map((s) => {
                const score = s.analysis.overallScore ?? 0;
                return (
                  <li key={s.id} className="group flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-semibold text-white",
                        scoreBg(score)
                      )}
                    >
                      {score}
                    </div>
                    <Link href={`/results/${s.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{s.scenario}</p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDate(s.createdAt)}
                        {s.customQuestion ? ` · “${s.customQuestion}”` : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className={cn("font-medium", scoreColor(score))}>{s.analysis.rating}</span>
                        <span>{formatTime(s.analysis.metrics?.durationSeconds ?? 0)}</span>
                        <span>{s.analysis.metrics?.wpm ?? 0} wpm</span>
                        <span>{s.analysis.metrics?.fillerWordCount ?? 0} fillers</span>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <Link href={`/results/${s.id}`} aria-label="View results" className="text-slate-300 group-hover:text-blue-600">
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="whitespace-nowrap text-xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
