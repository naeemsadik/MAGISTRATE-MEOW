export type GKFilter = 'BD' | 'INTL' | 'BOTH';
export type PetMood = 'excited' | 'sassy' | 'sleepy' | 'proud' | 'nerd';
export type MessageCategory = 'GK_BD' | 'GK_INTL' | 'MOTIVATION_FUNNY' | 'MOTIVATION_WARM';

export const MESSAGE_CATEGORIES: readonly MessageCategory[] = [
  'GK_BD',
  'GK_INTL',
  'MOTIVATION_FUNNY',
  'MOTIVATION_WARM',
];
export const PET_MOODS: readonly PetMood[] = ['excited', 'sassy', 'sleepy', 'proud', 'nerd'];

export interface QuizItem {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface PetMessage {
  id: string;
  category: MessageCategory;
  topicTag: string;
  text: string;
  petMood: PetMood;
  createdAt: number;
  source: 'gemini' | 'fallback' | 'local';
  quiz?: QuizItem;
}

export interface SavedFact extends PetMessage {
  savedAt: number;
}

export interface ActiveSession {
  startedAt: number;
  endsAt: number;
  durationMins: number;
  /** Messages shown during this block; GK ones with a quiz feed the Cha Break quiz. */
  shownMessages: PetMessage[];
}

export interface SessionSummary {
  completed: boolean;
  minutesStudied: number;
  durationMins: number;
  factsShown: number;
  quizPool: PetMessage[];
  endedAt: number;
}

export function isGkMessage(m: Pick<PetMessage, 'category'>): boolean {
  return m.category === 'GK_BD' || m.category === 'GK_INTL';
}

/** Motivation lines pass every filter; GK facts must match the chosen side. */
export function matchesFilter(m: Pick<PetMessage, 'category'>, filter: GKFilter): boolean {
  if (m.category === 'GK_BD') return filter !== 'INTL';
  if (m.category === 'GK_INTL') return filter !== 'BD';
  return true;
}
