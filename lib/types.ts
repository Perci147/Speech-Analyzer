// Scenario definitions and preloaded questions live in lib/scenarios.ts.

export interface ScenarioRecommendation {
  title: string;
  recommendation: string;
  /** A concrete phrasing, example line, or practice step. */
  example: string;
}

export interface ScenarioDelivery {
  /** How well the delivery suited this specific scenario. */
  fitSummary: string;
  recommendations: ScenarioRecommendation[];
}

export type ImprovementCategory =
  | "Tone"
  | "Cadence"
  | "Pauses"
  | "Fillers"
  | "Articulation"
  | "Content";

export interface Improvement {
  title: string;
  category: ImprovementCategory | string;
  context: string;
  exercise: string;
}

export interface AnalysisResult {
  overallScore: number;
  rating: string;
  transcript: string;
  scores: {
    tone: number;
    cadence: number;
    pauses: number;
    clarityAndArticulation: number;
    structureAndContent: number;
  };
  metrics: {
    durationSeconds: number;
    wpm: number;
    fillerWordCount: number;
    fillerWordsDetected: string[];
  };
  detailedAnalysis: {
    tone: string;
    cadence: string;
    pauses: string;
    fillers: string;
    speechImpedimentsAndArticulation: string;
    questionAlignment?: string;
  };
  improvements: Improvement[];
  strengths: string[];
  /** Scenario-specific delivery coaching. Missing on sessions saved before this feature. */
  scenarioDelivery?: ScenarioDelivery;
}

export interface SpeechSession {
  id: string;
  createdAt: string; // ISO timestamp
  scenario: string;
  customQuestion?: string;
  analysis: AnalysisResult;
}

export interface AnalyzeRequestBody {
  audio: string; // base64 (with or without a data: prefix)
  mimeType: string;
  scenario: string;
  customQuestion?: string;
}
