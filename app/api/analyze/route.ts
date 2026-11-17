import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalysisResult, AnalyzeRequestBody } from "@/lib/types";
import { getScenario } from "@/lib/scenarios";

export const runtime = "nodejs";
export const maxDuration = 120;

// Model choice (tested 2026-11-16 with a 45s spoken answer, webm and wav):
// - gemini-3.6-flash: full report in ~12-16s, reliable.
// - gemini-3.5-flash: full report in ~11-16s, reliable.
// - gemini-3.8-flash: often hangs for minutes or returns 503, so it is not a default.
// - gemini-2.0-flash / gemini-2.5-flash: retired or unavailable to new API keys.
// Override with GEMINI_MODEL and GEMINI_FALLBACK_MODELS (comma-separated) in .env.local.
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
// Quick "overloaded" replies get one retry on the same model. Timeouts move straight to the next model.
const ATTEMPTS_PER_MODEL = 2;
// Normal calls take ~15-30s (longer for long recordings). Anything past this is treated as hung.
const PER_CALL_TIMEOUT_MS = 60_000;
// Stay under maxDuration so the client always gets a JSON response.
const TOTAL_BUDGET_MS = 110_000;

/** Fast, explicit overload or rate-limit reply from Google. Worth a short retry. */
function isOverloaded(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429 || status === 500 || status === 503) return true;
  const msg = err instanceof Error ? err.message : "";
  return /\b(429|500|503)\b|high demand|overloaded|unavailable/i.test(msg);
}

/** Request hung or the connection dropped. Do not wait on this model again. */
function isTimeoutOrNetwork(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message : "";
  return name === "AbortError" || /abort|timed? ?out|fetch failed|ECONNRESET|ETIMEDOUT/i.test(msg);
}

function buildPrompt(scenario: string, customQuestion?: string): string {
  const questionBlock = customQuestion?.trim()
    ? `
### TARGET QUESTION / PROMPT
The speaker was preparing to answer this specific question or prompt:
"""
${customQuestion.trim()}
"""
In addition to vocal delivery, evaluate HOW EFFECTIVELY they answered this prompt: relevance, structure (e.g. clear opening, supporting points, conclusion; STAR method for interview questions), persuasiveness, and completeness. Put this evaluation in "detailedAnalysis.questionAlignment" and reflect it in "scores.structureAndContent". If the answer drifted off-topic, say so kindly and specifically.
`
    : `
### TARGET QUESTION / PROMPT
No specific prompt was provided. Evaluate "structureAndContent" on general organization, clarity of message, and whether the speech had a discernible beginning, middle, and end. Set "detailedAnalysis.questionAlignment" to a short note that no target prompt was supplied.
`;

  const profile = getScenario(scenario);
  const deliveryBlock = profile
    ? `
### DELIVERY BENCHMARKS FOR THIS SCENARIO (${profile.name})
- Ideal pace: ${profile.delivery.idealWpm[0]}-${profile.delivery.idealWpm[1]} words per minute
- Typical length: ${profile.delivery.idealSeconds[0]}-${profile.delivery.idealSeconds[1]} seconds
- Tone: ${profile.delivery.tone}
- Pacing: ${profile.delivery.pacing}
- Pauses: ${profile.delivery.pauses}
- Structure: ${profile.delivery.structure}
Judge tone, cadence, pauses, and structure against what works for THIS scenario, not a generic standard. For example, a slower, calmer delivery is a strength in a difficult conversation but may be a weakness in a sales pitch.
`
    : `
### DELIVERY BENCHMARKS
No predefined benchmarks exist for this scenario. Infer what effective delivery looks like for "${scenario}" and judge against that.
`;

  return `
You are an expert, empathetic Speech Coach and Speech-Language Pathology (SLP) specialist. You are listening to an audio recording of a person practicing public speaking. Your job is to give a thorough, honest, supportive, and highly actionable evaluation.

### CONTEXT
Speaking scenario: ${scenario}
${questionBlock}
${deliveryBlock}

### FAIRNESS RULE (MANDATORY)
Do NOT penalize regional accents, non-native dialects, or non-standard pronunciations that are simply features of the speaker's accent or dialect. Accents are not errors. Judge clarity by whether the speaker is intelligible and whether the message lands, not by whether they sound like a "standard" speaker. Only comment on articulation when it is a genuine, discrete pattern (see below), and do so with warmth.

### WHAT TO ANALYZE (be thorough and specific, cite moments from the recording)
1. TONE: Emotional resonance, warmth, authority and confidence, energy, and pitch variation versus monotone delivery. Note where the voice came alive and where it went flat.
2. CADENCE & RHYTHM: Overall speaking flow, changes in sentence velocity, natural versus choppy phrasing, rushing, and whether pace matched the content.
3. PAUSES: Distinguish strategic pauses used for emphasis from awkward or hesitant dead air, mid-thought stalls, or rushed, audible breathing. Comment on breath control.
4. FILLER WORDS: Give an exact count and identify each filler used ("um", "uh", "er", "like", "you know", "so", "basically", "actually", "right", "kind of", "sort of", "I mean", etc.). Note any triggers (e.g. fillers cluster at transitions).
5. SPEECH IMPEDIMENTS & ARTICULATION PATTERNS: Constructively and empathetically identify any noticeable disfluencies such as stuttering, blocks, or repetitions; lisps; mumbling; slurring; cluttering (overly fast, collapsed speech); dropped word endings; or consonant-cluster difficulties. For each pattern found, give a targeted, supportive vocal exercise or recommendation (e.g. easy onset, light contact, pacing boards, over-articulation drills, tongue-twister progressions, diaphragmatic breathing). If none are detected, say "No significant impediments detected" and give general articulation tips.
6. QUESTION ALIGNMENT: As described above.
7. SCENARIO DELIVERY: Compare the speaker's actual pace, length, tone, pauses, and structure to the benchmarks above. In "scenarioDelivery.fitSummary", say in 2 to 4 sentences how well their delivery suits this scenario (${scenario}), citing their measured pace and length. Then give 3 to 5 "scenarioDelivery.recommendations" that are specific to this scenario (not generic speaking tips, and not repeats of "improvements"). Each one needs a short "title", a "recommendation" explaining what to change and why it matters in this setting, and an "example" with a concrete line they could say, a rewrite of something they actually said, or a precise practice step.

### TRANSCRIPT
Produce a full, verbatim transcript. Keep every filler word exactly as spoken. Mark noticeable pauses inline as [pause] and long ones as [long pause]. Mark audible disfluencies such as repetitions or blocks faithfully (e.g. "I-I-I think", "[block] the"). Do not clean it up.

### SCORING
- "scores" has five categories, each 0-20. "overallScore" is the sum (0-100).
- "rating" must be one of: "Needs Work" (0-49), "Developing" (50-69), "Strong" (70-84), "Excellent" (85-100).
- "metrics.durationSeconds": your best estimate of the spoken duration in seconds (integer).
- "metrics.wpm": words per minute computed from the transcript word count and duration (integer).
- "metrics.fillerWordCount": exact integer count of fillers. "metrics.fillerWordsDetected": the distinct filler words found (lowercase, no duplicates; empty array if none).
- "improvements": 3 to 5 priority areas, ordered by impact. "category" must be one of: "Tone", "Cadence", "Pauses", "Fillers", "Articulation", "Content". "context" must cite a specific observation from this recording. "exercise" must be a concrete, step-by-step drill.
- "strengths": 2 to 5 specific, genuine strengths.

### OUTPUT FORMAT (STRICT)
Return ONLY a single JSON object matching EXACTLY this schema. No markdown, no code fences, no commentary. Every key must be present. Strings must never be null; use "" or a short note instead. Arrays must never be null; use [] instead.

{
  "overallScore": 85,
  "rating": "Strong",
  "transcript": "Full verbatim transcript including [pause] and filler words...",
  "scores": {
    "tone": 20,
    "cadence": 20,
    "pauses": 20,
    "clarityAndArticulation": 20,
    "structureAndContent": 20
  },
  "metrics": {
    "durationSeconds": 45,
    "wpm": 135,
    "fillerWordCount": 3,
    "fillerWordsDetected": ["um", "like"]
  },
  "detailedAnalysis": {
    "tone": "Detailed analysis of vocal tone...",
    "cadence": "Detailed analysis of rhythm and pacing...",
    "pauses": "Evaluation of pause placement and breath control...",
    "fillers": "Breakdown of filler usage and triggers...",
    "speechImpedimentsAndArticulation": "Empathetic observations on articulation, disfluencies, or impediments (or 'No significant impediments detected' with general articulation tips)...",
    "questionAlignment": "How well the answer addressed the target prompt (or a note that none was provided)..."
  },
  "improvements": [
    {
      "title": "Priority Area Title",
      "category": "Tone | Cadence | Pauses | Fillers | Articulation | Content",
      "context": "Specific observation from the recording...",
      "exercise": "Step-by-step actionable drill or vocal recommendation to fix it..."
    }
  ],
  "strengths": ["Strength 1", "Strength 2"],
  "scenarioDelivery": {
    "fitSummary": "How well this delivery suits the scenario, citing measured pace and length...",
    "recommendations": [
      {
        "title": "Scenario-specific recommendation title",
        "recommendation": "What to change and why it matters in this scenario...",
        "example": "A concrete line to say, a rewrite of their own words, or a precise practice step..."
      }
    ]
  }
}

If the audio is silent, inaudible, or contains no speech, still return the full schema with low scores, an empty transcript, and an explanation in the detailedAnalysis fields.
`.trim();
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function ratingFor(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Developing";
  return "Needs Work";
}

/** Coerce whatever the model returned into the exact AnalysisResult shape so the UI never crashes. */
type Loose = Record<string, any>;

function normalize(raw: Loose): AnalysisResult {
  const scores = {
    tone: clampInt(raw?.scores?.tone, 0, 20, 0),
    cadence: clampInt(raw?.scores?.cadence, 0, 20, 0),
    pauses: clampInt(raw?.scores?.pauses, 0, 20, 0),
    clarityAndArticulation: clampInt(raw?.scores?.clarityAndArticulation, 0, 20, 0),
    structureAndContent: clampInt(raw?.scores?.structureAndContent, 0, 20, 0),
  };
  const summed =
    scores.tone +
    scores.cadence +
    scores.pauses +
    scores.clarityAndArticulation +
    scores.structureAndContent;
  const overallScore = clampInt(raw?.overallScore, 0, 100, summed) || summed;

  const improvements = Array.isArray(raw?.improvements)
    ? raw.improvements
        .filter((i: any) => i && typeof i === "object")
        .map((i: any) => ({
          title: str(i.title, "Improvement"),
          category: str(i.category, "Content"),
          context: str(i.context),
          exercise: str(i.exercise),
        }))
    : [];

  const fillerWordsDetected = Array.from(
    new Set(strArray(raw?.metrics?.fillerWordsDetected).map((w) => w.toLowerCase().trim()))
  );

  return {
    overallScore,
    rating: str(raw?.rating, "") || ratingFor(overallScore),
    transcript: str(raw?.transcript),
    scores,
    metrics: {
      durationSeconds: clampInt(raw?.metrics?.durationSeconds, 0, 60 * 60 * 3, 0),
      wpm: clampInt(raw?.metrics?.wpm, 0, 400, 0),
      fillerWordCount: clampInt(raw?.metrics?.fillerWordCount, 0, 10000, fillerWordsDetected.length),
      fillerWordsDetected,
    },
    detailedAnalysis: {
      tone: str(raw?.detailedAnalysis?.tone),
      cadence: str(raw?.detailedAnalysis?.cadence),
      pauses: str(raw?.detailedAnalysis?.pauses),
      fillers: str(raw?.detailedAnalysis?.fillers),
      speechImpedimentsAndArticulation: str(
        raw?.detailedAnalysis?.speechImpedimentsAndArticulation,
        "No significant impediments detected."
      ),
      questionAlignment: str(raw?.detailedAnalysis?.questionAlignment),
    },
    improvements,
    strengths: strArray(raw?.strengths),
    scenarioDelivery: {
      fitSummary: str(raw?.scenarioDelivery?.fitSummary),
      recommendations: Array.isArray(raw?.scenarioDelivery?.recommendations)
        ? raw.scenarioDelivery.recommendations
            .filter((r: any) => r && typeof r === "object")
            .map((r: any) => ({
              title: str(r.title, "Recommendation"),
              recommendation: str(r.recommendation),
              example: str(r.example),
            }))
            .filter((r: { recommendation: string }) => r.recommendation.trim().length > 0)
        : [],
    },
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip code fences or surrounding prose if the model ignored responseMimeType.
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        /* fall through */
      }
    }
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first !== -1 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server. Add it to .env.local and restart." },
      { status: 500 }
    );
  }

  let body: AnalyzeRequestBody;
  try {
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { audio, mimeType, scenario, customQuestion } = body ?? {};

  if (!audio || typeof audio !== "string") {
    return NextResponse.json({ error: "Missing 'audio' (base64 string)." }, { status: 400 });
  }

  // Accept both raw base64 and data URLs ("data:audio/webm;base64,....").
  const commaIdx = audio.indexOf(",");
  const base64Data =
    audio.startsWith("data:") && commaIdx !== -1 ? audio.slice(commaIdx + 1) : audio;

  // MediaRecorder often reports "audio/webm;codecs=opus"; strip the codec parameter for Gemini.
  const cleanMime = (typeof mimeType === "string" && mimeType.trim() ? mimeType : "audio/webm")
    .split(";")[0]
    .trim();

  const safeScenario =
    typeof scenario === "string" && scenario.trim() ? scenario.trim() : "General Public Speaking";
  const safeQuestion =
    typeof customQuestion === "string" ? customQuestion.trim().slice(0, 2000) : undefined;

  const genAI = new GoogleGenerativeAI(apiKey);
  const parts = [
    { text: buildPrompt(safeScenario, safeQuestion) },
    { inlineData: { data: base64Data, mimeType: cleanMime } },
  ];
  const models = Array.from(new Set([MODEL_NAME, ...FALLBACK_MODELS]));
  let lastError: unknown = null;
  let sawTransient = false;

  const deadline = Date.now() + TOTAL_BUDGET_MS;

  // Try the primary model, then each fallback.
  outer: for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const modelName = models[modelIndex];
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 5000) break outer; // not enough time left for a useful attempt
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        },
        { timeout: Math.min(PER_CALL_TIMEOUT_MS, remaining) }
      );
      const startedAt = Date.now();
      try {
        const result = await model.generateContent(parts);
        const parsed = extractJson(result.response.text());
        const analysis = normalize(parsed as Loose);
        console.log(`Gemini analysis OK (model=${modelName}) in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
        return NextResponse.json(analysis);
      } catch (err: unknown) {
        lastError = err;
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        const brief = err instanceof Error ? `${err.name}: ${err.message.slice(0, 200)}` : String(err);
        console.error(`Gemini analysis failed (model=${modelName}, attempt=${attempt + 1}, ${seconds}s): ${brief}`);
        if (isTimeoutOrNetwork(err)) {
          sawTransient = true;
          break; // hung model: move on to the next one instead of waiting again
        }
        if (!isOverloaded(err)) break; // e.g. 404 model retired, bad JSON: try the next model
        sawTransient = true;
        if (attempt < ATTEMPTS_PER_MODEL - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }
  }

  const transient = sawTransient;
  const message = transient
    ? "The AI coach is busy right now. Please wait a moment and try again."
    : lastError instanceof Error && lastError.message
      ? lastError.message
      : "Analysis failed. Please try again.";
  return NextResponse.json({ error: message }, { status: transient ? 503 : 502 });
}
