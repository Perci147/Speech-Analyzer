import { SpeechAnalysis } from './types';

export const saveSession = (analysis: SpeechAnalysis) => {
  if (typeof window === 'undefined') return;
  const existing = getSessions();
  localStorage.setItem('speech_sessions', JSON.stringify([analysis, ...existing]));
};

export const getSessions = (): SpeechAnalysis[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('speech_sessions');
  return data ? JSON.parse(data) : [];
};

export const getSessionById = (id: string): SpeechAnalysis | undefined => {
  return getSessions().find(s => s.id === id);
};
