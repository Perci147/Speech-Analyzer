"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  AlertCircle,
  Loader2,
  Mic,
  Square,
  Upload,
  RotateCcw,
  Sparkles,
  FileAudio,
  Check,
  Clock,
  Gauge,
  ListOrdered,
  MessageSquareQuote,
  PenLine,
  Shuffle,
} from "lucide-react";
import Waveform from "@/components/Waveform";
import type { AnalysisResult, SpeechSession } from "@/lib/types";
import { DEFAULT_SCENARIO, SCENARIOS, formatSecondsRange, getScenario } from "@/lib/scenarios";
import { saveSession } from "@/lib/storage";
import { cn, formatTime } from "@/lib/utils";

type Status = "idle" | "recording" | "recorded" | "analyzing";
type QuestionMode = "none" | "preset" | "custom";

const MAX_RECORDING_SECONDS = 10 * 60;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // keep inline base64 well under Gemini's request limit

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("Failed to read audio."));
      // readAsDataURL returns "data:<mime>;base64,<payload>"; send only the payload.
      const idx = result.indexOf(",");
      resolve(idx === -1 ? result : result.slice(idx + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read audio."));
    reader.readAsDataURL(blob);
  });
}

export default function RecordPage() {
  const router = useRouter();

  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO.id);
  const [questionMode, setQuestionMode] = useState<QuestionMode>("none");
  const [presetQuestion, setPresetQuestion] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");

  const scenarioDef = getScenario(scenarioId) ?? DEFAULT_SCENARIO;
  const scenario = scenarioDef.name;
  const targetQuestion =
    questionMode === "preset" ? presetQuestion : questionMode === "custom" ? customQuestion.trim() : "";

  // Allow links like /record?scenario=job-interview&question=... (used by "Practice again").
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = getScenario(params.get("scenario"));
    const question = params.get("question")?.trim();
    if (fromUrl) setScenarioId(fromUrl.id);
    if (question) {
      if ((fromUrl ?? DEFAULT_SCENARIO).questions.includes(question)) {
        setPresetQuestion(question);
        setQuestionMode("preset");
      } else {
        setCustomQuestion(question);
        setQuestionMode("custom");
      }
    }
  }, []);

  const changeScenario = (id: string) => {
    setScenarioId(id);
    // Preloaded questions belong to a scenario, so clear them. Keep a custom question.
    if (questionMode === "preset") {
      setQuestionMode("none");
      setPresetQuestion("");
    }
  };

  const choosePreset = (q: string) => {
    if (questionMode === "preset" && presetQuestion === q) {
      setQuestionMode("none");
      setPresetQuestion("");
      return;
    }
    setPresetQuestion(q);
    setQuestionMode("preset");
  };

  const surpriseMe = () => {
    const pool = scenarioDef.questions.filter((q) => q !== presetQuestion);
    choosePreset(pool[Math.floor(Math.random() * pool.length)]);
  };
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopStream = useCallback((s: MediaStream | null) => {
    s?.getTracks().forEach((t) => t.stop());
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      clearTimer();
      stopStream(stream);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetRecording = useCallback(() => {
    clearTimer();
    setElapsed(0);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSourceLabel("");
    setError(null);
    setStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [audioUrl, clearTimer]);

  const startRecording = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support microphone recording. Try uploading an audio file instead.");
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setSourceLabel("Microphone recording");
        setStatus("recorded");
        stopStream(mediaStream);
        setStream(null);
      };
      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
        clearTimer();
        stopStream(mediaStream);
        setStream(null);
        setStatus("idle");
      };

      recorderRef.current = recorder;
      setStream(mediaStream);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setElapsed(0);
      setStatus("recording");
      recorder.start(250);

      startedAtRef.current = Date.now();
      clearTimer();
      timerRef.current = window.setInterval(() => {
        const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(secs);
        if (secs >= MAX_RECORDING_SECONDS && recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
          clearTimer();
        }
      }, 250);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone access was denied. Allow microphone permissions or upload an audio file.");
      } else if (name === "NotFoundError") {
        setError("No microphone was found. Connect one or upload an audio file.");
      } else {
        setError("Could not start recording. Please try again or upload an audio file.");
      }
      setStatus("idle");
    }
  }, [audioUrl, clearTimer, stopStream]);

  const stopRecording = useCallback(() => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [clearTimer]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      if (!file.type.startsWith("audio/")) {
        setError("Please choose an audio file (mp3, wav, m4a, webm, ogg, etc.).");
        e.target.value = "";
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("That file is too large. Please upload an audio file under 20 MB.");
        e.target.value = "";
        return;
      }
      clearTimer();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setSourceLabel(file.name);
      setElapsed(0);
      setStatus("recorded");
    },
    [audioUrl, clearTimer]
  );

  const analyze = useCallback(async () => {
    if (!audioBlob) return;
    setError(null);
    setStatus("analyzing");

    try {
      setAnalysisStep("Encoding audio…");
      const base64Audio = await blobToBase64(audioBlob);

      setAnalysisStep("Listening to your delivery…");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: audioBlob.type || "audio/webm",
          scenario,
          customQuestion: targetQuestion || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        throw new Error(data?.error || `Analysis failed (${res.status}).`);
      }

      setAnalysisStep("Building your coaching report…");
      const analysis = data as AnalysisResult;
      const session: SpeechSession = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        scenario,
        customQuestion: targetQuestion || undefined,
        analysis,
      };
      saveSession(session);
      router.push(`/results/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during analysis.");
      setStatus("recorded");
    }
  }, [audioBlob, scenario, targetQuestion, router]);

  const isRecording = status === "recording";
  const isAnalyzing = status === "analyzing";
  const setupLocked = isRecording || isAnalyzing;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Recording Studio</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a scenario, choose a practice question or write your own, then record or upload your practice run.
        </p>
      </header>

      {/* Setup */}
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="scenario" className="block text-sm font-medium text-slate-700">
              Speaking scenario
            </label>
            <select
              id="scenario"
              value={scenarioId}
              onChange={(e) => changeScenario(e.target.value)}
              disabled={setupLocked}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-600">{scenarioDef.description}</p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">What good delivery looks like</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <dt className="text-xs text-slate-500">Pace</dt>
                  <dd className="font-medium text-slate-900">
                    {scenarioDef.delivery.idealWpm[0]}–{scenarioDef.delivery.idealWpm[1]} wpm
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <dt className="text-xs text-slate-500">Length</dt>
                  <dd className="font-medium text-slate-900">{formatSecondsRange(scenarioDef.delivery.idealSeconds)}</dd>
                </div>
              </div>
              <div className="col-span-2 flex items-start gap-2">
                <ListOrdered className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <dt className="text-xs text-slate-500">Structure</dt>
                  <dd className="text-slate-800">{scenarioDef.delivery.structure}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Practice question <span className="font-normal text-slate-400">(Optional)</span>
              </p>
              <p className="text-xs text-slate-500">
                If you pick one, the coach also grades how well your answer addressed it. Click a selected question
                again to clear it.
              </p>
            </div>
            <button
              type="button"
              onClick={surpriseMe}
              disabled={setupLocked}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Surprise me
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Practice question">
            {scenarioDef.questions.map((q) => {
              const selected = questionMode === "preset" && presetQuestion === q;
              return (
                <button
                  key={q}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choosePreset(q)}
                  disabled={setupLocked}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "border-blue-600 bg-blue-50 text-slate-900 ring-1 ring-blue-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  {q}
                </button>
              );
            })}

            <button
              type="button"
              role="radio"
              aria-checked={questionMode === "custom"}
              onClick={() => setQuestionMode(questionMode === "custom" ? "none" : "custom")}
              disabled={setupLocked}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-dashed px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60",
                questionMode === "custom"
                  ? "border-blue-600 bg-blue-50 text-slate-900"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              Write my own question
            </button>
          </div>

          {questionMode === "custom" && (
            <textarea
              id="customQuestion"
              aria-label="Your own question or prompt"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              disabled={setupLocked}
              rows={3}
              maxLength={2000}
              autoFocus
              placeholder='e.g. "Tell me about a time you handled a difficult stakeholder."'
              className="mt-3 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
            />
          )}
        </div>
      </section>

      {/* Studio */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-2.5 w-2.5 rounded-full",
                isRecording ? "animate-pulse bg-rose-500" : "bg-slate-300"
              )}
            />
            <span className="text-sm font-medium text-slate-700">
              {isRecording ? "Recording" : status === "recorded" ? "Ready to analyze" : isAnalyzing ? "Analyzing" : "Idle"}
            </span>
          </div>
          <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900">{formatTime(elapsed)}</span>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p className="text-slate-700">
            <span className="font-medium text-slate-900">{scenario}: </span>
            {targetQuestion || <span className="text-slate-500">Free practice, no specific question.</span>}
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-4">
          <Waveform stream={stream} active={isRecording} className="h-44 w-full" />
        </div>

        {audioUrl && status !== "recording" && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <FileAudio className="h-4 w-4 text-blue-600" />
              <span className="truncate font-medium">{sourceLabel}</span>
            </div>
            <audio controls src={audioUrl} className="h-10 w-full sm:ml-auto sm:max-w-sm" />
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {isAnalyzing ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 py-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-900">{analysisStep || "Analyzing…"}</p>
            <p className="text-xs text-slate-500">This usually takes 10 to 30 seconds depending on length.</p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-4">
            {status !== "recorded" ? (
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-transform focus:outline-none focus:ring-4 active:scale-95",
                  isRecording
                    ? "bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/30"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-600/30"
                )}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? <Square className="h-7 w-7 fill-current" /> : <Mic className="h-8 w-8" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={analyze}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/30 active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                Analyze my speech
              </button>
            )}

            <p className="text-xs text-slate-500">
              {isRecording
                ? "Click the square to stop."
                : status === "recorded"
                  ? "Happy with the take? Send it to the coach."
                  : "Click the microphone to start recording."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {status === "recorded" && (
                <button
                  type="button"
                  onClick={resetRecording}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Start over
                </button>
              )}
              {!isRecording && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Audio
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
