export type SpeechCategory = 'pace' | 'confidence' | 'fluency' | 'clarity' | 'structure';

export interface CoachingPriority {
  title: string;
  context: string;
  exercise: string;
}

export interface SpeechAnalysis {
  id: string;
  date: string;
  scenario: string;
  overallScore: number;
  rating: string;
  scores: Record<SpeechCategory, number>;
  metrics: {
    durationSeconds: number;
    wordCount: number;
    wordsPerMinute: number;
    fillerWordCount: number;
    fillerRate: number;
    longestPause: number;
  };
  strengths: string[];
  improvements: CoachingPriority[];
  transcript: string;
}
