"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  AudioLines,
  CheckCircle2,
  Clock,
  Ear,
  FileText,
  Gauge,
  HeartHandshake,
  Lightbulb,
  Loader2,
  MessageSquareQuote,
  Mic,
  Music2,
  PauseCircle,
  Target,
  Trash2,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import ScoreRing from "@/components/ScoreRing";
import { deleteSession, getSession } from "@/lib/storage";
import type { SpeechSession } from "@/lib/types";
import { cn, formatDate, formatTime, scoreBg, scoreColor } from "@/lib/utils";

const SCORE_LABELS: Array<{ key: keyof SpeechSession["analysis"]["scores"]; label: string; icon: LucideIcon }> = [
  { key: "tone", label: "Tone", icon: Music2 },
  { key: "cadence", label: "Cadence", icon: Activity },
  { key: "pauses", label: "Pauses", icon: PauseCircle },
  { key: "clarityAndArticulation", label: "Clarity & Articulation", icon: Ear },
  { key: "structureAndContent", label: "Structure & Content", icon: FileText },
];

const CATEGORY_STYLES: Record<string, string> = {
  Tone: "bg-violet-100 text-violet-700",
  Cadence: "bg-sky-100 text-sky-700",
  Pauses: "bg-amber-100 text-amber-700",
  Fillers: "bg-rose-100 text-rose-700",
  Articulation: "bg-emerald-100 text-emerald-700",
  Content: "bg-blue-100 text-blue-700",
};

function Card({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-blue-600" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="whitespace-nowrap text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SpeechSession | null | undefined>(undefined);

  useEffect(() => {
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
    setSession(id ? getSession(id) ?? null : null);
  }, [params]);

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading results…
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Session not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This result may have been deleted, or it was saved in a different browser.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </Link>
          <Link
            href="/record"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Practice Now
          </Link>
        </div>
      </div>
    );
  }

  const { analysis } = session;
  const scores = analysis.scores ?? {};
  const metrics = analysis.metrics ?? {};
  const detailed = analysis.detailedAnalysis ?? {};
  const improvements = Array.isArray(analysis.improvements) ? analysis.improvements : [];
  const strengths = Array.isArray(analysis.strengths) ? analysis.strengths : [];
  const fillers = Array.isArray(metrics.fillerWordsDetected) ? metrics.fillerWordsDetected : [];

  const handleDelete = () => {
    if (!window.confirm("Delete this session? This cannot be undone.")) return;
    deleteSession(session.id);
    router.push("/");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/record"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Mic className="h-4 w-4" /> Practice again
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-rose-600"
            aria-label="Delete session"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[auto,1fr]">
        <div className="flex flex-col items-center justify-center gap-2">
          <ScoreRing score={analysis.overallScore ?? 0} size={168} label="Overall" />
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold text-white",
              scoreBg(analysis.overallScore ?? 0)
            )}
          >
            {analysis.rating || "—"}
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{formatDate(session.createdAt)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{session.scenario}</h1>
          {session.customQuestion && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700">
              <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p>
                <span className="font-medium text-slate-900">Prompt: </span>
                {session.customQuestion}
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Duration" value={formatTime(metrics.durationSeconds ?? 0)} icon={Clock} />
            <Metric label="Pace" value={`${metrics.wpm ?? 0} wpm`} icon={Gauge} />
            <Metric label="Filler words" value={String(metrics.fillerWordCount ?? 0)} icon={AudioLines} />
          </div>
        </div>
      </section>

      {/* Score breakdown */}
      <Card title="Score breakdown" icon={Target}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SCORE_LABELS.map(({ key, label, icon: Icon }) => {
            const value = Math.max(0, Math.min(20, Number(scores[key] ?? 0)));
            const pct = (value / 20) * 100;
            return (
              <li key={key} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Icon className="h-4 w-4 text-slate-400" />
                    {label}
                  </span>
                  <span className={cn("text-sm font-semibold", scoreColor(pct))}>{value}/20</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full transition-all", scoreBg(pct))} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Strengths */}
        <Card title="What worked well" icon={Trophy}>
          {strengths.length === 0 ? (
            <p className="text-sm text-slate-500">No strengths were listed for this session.</p>
          ) : (
            <ul className="space-y-2.5">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Fillers */}
        <Card title="Filler words" icon={AudioLines}>
          <p className="text-sm leading-relaxed text-slate-700">{detailed.fillers || "No filler analysis available."}</p>
          {fillers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {fillers.map((w) => (
                <span key={w} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                  “{w}”
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Priority improvements */}
      <Card title="Priority improvements" icon={Lightbulb}>
        {improvements.length === 0 ? (
          <p className="text-sm text-slate-500">No specific improvements were listed.</p>
        ) : (
          <ol className="space-y-4">
            {improvements.map((imp, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">{imp.title}</h3>
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium",
                      CATEGORY_STYLES[imp.category] ?? "bg-slate-100 text-slate-700"
                    )}
                  >
                    {imp.category}
                  </span>
                </div>
                {imp.context && (
                  <p className="mt-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Observation: </span>
                    {imp.context}
                  </p>
                )}
                {imp.exercise && (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-slate-700">
                    <span className="font-medium text-blue-700">Exercise: </span>
                    <span className="whitespace-pre-line">{imp.exercise}</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Detailed analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Tone" icon={Music2}>
          <p className="text-sm leading-relaxed text-slate-700">{detailed.tone || "—"}</p>
        </Card>
        <Card title="Cadence & rhythm" icon={Activity}>
          <p className="text-sm leading-relaxed text-slate-700">{detailed.cadence || "—"}</p>
        </Card>
        <Card title="Pauses & breath control" icon={PauseCircle}>
          <p className="text-sm leading-relaxed text-slate-700">{detailed.pauses || "—"}</p>
        </Card>
        <Card title="Articulation & fluency" icon={HeartHandshake}>
          <p className="text-sm leading-relaxed text-slate-700">
            {detailed.speechImpedimentsAndArticulation || "No significant impediments detected."}
          </p>
        </Card>
        {session.customQuestion && (
          <Card title="Answer alignment" icon={Target} className="md:col-span-2">
            <p className="text-sm leading-relaxed text-slate-700">
              {detailed.questionAlignment || "No alignment feedback was returned for this prompt."}
            </p>
          </Card>
        )}
      </div>

      {/* Transcript */}
      <Card title="Transcript" icon={FileText}>
        {analysis.transcript ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{analysis.transcript}</p>
        ) : (
          <p className="text-sm text-slate-500">No transcript was generated. The recording may have been silent.</p>
        )}
      </Card>
    </div>
  );
}
