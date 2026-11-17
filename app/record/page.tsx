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
} from "lucide-react";
import Waveform from "@/components/Waveform";
import { SCENARIOS, type AnalysisResult, type SpeechSession } from "@/lib/types";
import { saveSession } from "@/lib/storage";
import { cn, formatTime } from "@/lib/utils";

type Status = "idle" | "recording" | "recorded" | "analyzing";

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

  const [scenario, setScenario] = useState<string>(SCENARIOS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
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
          customQuestion: customQuestion.trim() || undefined,
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
        customQuestion: customQuestion.trim() || undefined,
        analysis,
      };
      saveSession(session);
      router.push(`/results/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during analysis.");
      setStatus("recorded");
    }
  }, [audioBlob, scenario, customQuestion, router]);

  const isRecording = status === "recording";
  const isAnalyzing = status === "analyzing";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Recording Studio</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a scenario, optionally add the exact question you are preparing for, then record or upload your
          practice run.
        </p>
      </header>

      {/* Setup */}
      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="scenario" className="block text-sm font-medium text-slate-700">
            Speaking scenario
          </label>
          <select
            id="scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            disabled={isRecording || isAnalyzing}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
          >
            {SCENARIOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">The coach tailors its feedback to this context.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="customQuestion" className="block text-sm font-medium text-slate-700">
            Target Question or Prompt <span className="font-normal text-slate-400">(Optional)</span>
          </label>
          <textarea
            id="customQuestion"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            disabled={isRecording || isAnalyzing}
            rows={3}
            maxLength={2000}
            placeholder='e.g. "Tell me about a time you handled a difficult stakeholder."'
            className="block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
          />
          <p className="text-xs text-slate-500">
            If provided, the AI also grades how well your answer addressed this prompt.
          </p>
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
