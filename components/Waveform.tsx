"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  /** The live microphone stream. Pass null when not recording. */
  stream: MediaStream | null;
  active: boolean;
  className?: string;
}

/**
 * Real-time audio visualizer using the Web Audio API.
 * Draws a frequency-bar display plus a soft time-domain waveform overlay on a <canvas>.
 */
export default function Waveform({ stream, active, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Draw an idle flat line when not recording.
  useEffect(() => {
    if (active && stream) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#cbd5e1"; // slate-300
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [active, stream]);

  useEffect(() => {
    if (!active || !stream) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const AudioCtx: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const audioCtx = new AudioCtx();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    ctxRef.current = audioCtx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      // --- Frequency bars (mirrored around the vertical center) ---
      const usableBins = Math.floor(freqData.length * 0.7); // skip the mostly-empty top end
      const barCount = 56;
      const gap = 3;
      const barWidth = (width - gap * (barCount - 1)) / barCount;
      const binsPerBar = Math.max(1, Math.floor(usableBins / barCount));

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < binsPerBar; j++) sum += freqData[i * binsPerBar + j] ?? 0;
        const v = sum / binsPerBar / 255; // 0..1
        const barHeight = Math.max(4, v * (height * 0.9));
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "#3b82f6"); // blue-500
        gradient.addColorStop(1, "#2563eb"); // blue-600
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.35 + v * 0.65;

        const r = Math.min(barWidth / 2, 4);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barWidth - r, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
        ctx.lineTo(x + barWidth, y + barHeight - r);
        ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - r, y + barHeight);
        ctx.lineTo(x + r, y + barHeight);
        ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // --- Soft waveform overlay ---
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.35)"; // slate-900 @ 35%
      ctx.beginPath();
      const slice = width / timeData.length;
      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128 - 1; // -1..1
        const y = height / 2 + v * (height * 0.35);
        const x = i * slice;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      audioCtx.close().catch(() => undefined);
      ctxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [active, stream]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "h-40 w-full"}
      aria-label="Live audio waveform"
      role="img"
    />
  );
}
