export const SCENARIOS = [
  "Job Interview",
  "Sales Pitch",
  "Keynote Presentation",
  "General Public Speaking",
] as const;

export type Scenario = (typeof SCENARIOS)[number];

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
