/**
 * Classifies errors from @google/generative-ai so the analyze route can decide
 * whether to retry, try the next model, or tell the user to come back later.
 */

export type GeminiFailureKind =
  | "daily-quota" // requests-per-day quota used up: retrying cannot help until it resets
  | "rate-limit" // per-minute quota: a short wait helps
  | "overloaded" // 500/503 "high demand": a quick retry may help
  | "timeout" // hung request or dropped connection
  | "unavailable-model" // 404: model retired or not offered to this key
  | "other";

export interface GeminiFailure {
  kind: GeminiFailureKind;
  /** Seconds until Google says it is worth retrying, when it tells us. */
  retryAfterSeconds?: number;
}

interface ErrorDetail {
  "@type"?: string;
  retryDelay?: string;
  violations?: Array<{ quotaId?: string; quotaMetric?: string; description?: string }>;
}

/** Parses "20696s" or "1.5s" (protobuf Duration as JSON). */
function parseDurationString(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const m = value.trim().match(/^(\d+(?:\.\d+)?)s$/);
  return m ? Math.ceil(Number(m[1])) : undefined;
}

/** Parses "Please retry in 5h44m56.57s" / "retry in 38.2s" from the error message. */
function parseRetryFromMessage(message: string): number | undefined {
  const m = message.match(/retry in\s+((?:\d+(?:\.\d+)?[hms])+)/i);
  if (!m) return undefined;
  let seconds = 0;
  for (const [, num, unit] of Array.from(m[1].matchAll(/(\d+(?:\.\d+)?)([hms])/g))) {
    const n = Number(num);
    seconds += unit === "h" ? n * 3600 : unit === "m" ? n * 60 : n;
  }
  return seconds > 0 ? Math.ceil(seconds) : undefined;
}

export function classifyGeminiError(err: unknown): GeminiFailure {
  const e = (err ?? {}) as { status?: number; name?: string; message?: string; errorDetails?: unknown };
  const status = typeof e.status === "number" ? e.status : undefined;
  const name = typeof e.name === "string" ? e.name : "";
  const message = typeof e.message === "string" ? e.message : String(err ?? "");
  const details: ErrorDetail[] = Array.isArray(e.errorDetails) ? (e.errorDetails as ErrorDetail[]) : [];

  const retryInfo = details.find((d) => d?.["@type"]?.endsWith("RetryInfo"));
  const retryAfterSeconds = parseDurationString(retryInfo?.retryDelay) ?? parseRetryFromMessage(message);

  if (status === 429 || /\b429\b|too many requests|quota exceeded|exceeded your current quota/i.test(message)) {
    const quotaIds = details
      .flatMap((d) => d?.violations ?? [])
      .map((v) => `${v.quotaId ?? ""} ${v.description ?? ""}`)
      .join(" ");
    const daily = /per ?day|perday|daily/i.test(quotaIds) || /per day/i.test(message);
    return { kind: daily ? "daily-quota" : "rate-limit", retryAfterSeconds };
  }

  if (name === "AbortError" || /abort|timed? ?out|fetch failed|ECONNRESET|ETIMEDOUT/i.test(message)) {
    return { kind: "timeout" };
  }

  if (status === 404 || /\b404\b|no longer available|not found/i.test(message)) {
    return { kind: "unavailable-model" };
  }

  if (status === 500 || status === 503 || /\b(500|503)\b|high demand|overloaded|unavailable/i.test(message)) {
    return { kind: "overloaded", retryAfterSeconds };
  }

  return { kind: "other" };
}

/** "about 5 hours 45 minutes", "about 3 minutes", "less than a minute". */
export function describeWait(seconds: number | undefined): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  if (seconds < 60) return "less than a minute";
  const totalMinutes = Math.ceil(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = hours ? `${hours} hour${hours === 1 ? "" : "s"}` : "";
  const m = minutes ? `${minutes} minute${minutes === 1 ? "" : "s"}` : "";
  return `about ${[h, m].filter(Boolean).join(" ")}`;
}
