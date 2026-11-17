/**
 * Audio size limits.
 *
 * Audio is sent to /api/analyze as base64 inside JSON, which is ~4/3 the raw size.
 * Vercel rejects function request bodies over 4.5 MB, so raw audio must stay under
 * ~3.3 MB. 3 MB leaves room for the JSON wrapper.
 */
export const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

/**
 * Recording bitrate. 32 kbps Opus is clear for speech and keeps 10 minutes at ~2.4 MB.
 * (Browsers default to ~128 kbps, which would hit the cap after about 3 minutes.)
 */
export const RECORDING_BITS_PER_SECOND = 32_000;

export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** Decoded size of a base64 string, without decoding it. */
export function base64DecodedBytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export const TOO_LARGE_TIP =
  "Try a shorter clip, or convert it to MP3 or M4A (WAV files are about 10 times larger for the same length).";
