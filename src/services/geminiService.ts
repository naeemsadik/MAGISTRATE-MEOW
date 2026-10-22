import {
  MESSAGE_CATEGORIES,
  PET_MOODS,
  isGkMessage,
  type GKFilter,
  type MessageCategory,
  type PetMessage,
  type PetMood,
  type QuizItem,
} from '../types';
import { makeId } from '../utils/format';

// gemini-2.5-flash is only served to keys that used it before; new keys need a 3.x model.
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_TEXT_LENGTH = 260;

export type GeminiErrorKind = 'network' | 'auth' | 'quota' | 'model' | 'server' | 'bad_response';

export class GeminiError extends Error {
  constructor(
    public readonly kind: GeminiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export interface BatchRequest {
  apiKey: string;
  model: string;
  cousinName: string;
  gkFilter: GKFilter;
  recentTopics: string[];
}

const BATCH_MIX: Record<GKFilter, Record<MessageCategory, number>> = {
  BOTH: { GK_BD: 7, GK_INTL: 7, MOTIVATION_FUNNY: 3, MOTIVATION_WARM: 3 },
  BD: { GK_BD: 14, GK_INTL: 0, MOTIVATION_FUNNY: 3, MOTIVATION_WARM: 3 },
  INTL: { GK_BD: 0, GK_INTL: 14, MOTIVATION_FUNNY: 3, MOTIVATION_WARM: 3 },
};

const CATEGORY_BRIEF: Record<MessageCategory, string> = {
  GK_BD:
    'High-yield Bangladesh Affairs (1971 Liberation War sectors/titles, Constitution articles, rivers, ancient Bengal, language movement, GI products, mega projects, national symbols).',
  GK_INTL:
    'High-yield International Affairs (UN agencies & HQs, straits/canals, treaties, geopolitics, central banks, environmental summits, regional blocs).',
  MOTIVATION_FUNNY:
    "Funny Banglish (Bengali in English letters) roasts about BCS prep life: MP3/Professor's guides, dawat biryani, relatives asking about the exam date, phone addiction. Playful, never cruel.",
  MOTIVATION_WARM:
    'Short, grounding encouragement in Banglish or simple English for a tired student who has studied all day.',
};

function buildPrompt({ cousinName, gkFilter, recentTopics }: BatchRequest): string {
  const mix = BATCH_MIX[gkFilter];
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  const lines = MESSAGE_CATEGORIES.filter((c) => mix[c] > 0)
    .map((c) => `- ${mix[c]} "${c}": ${CATEGORY_BRIEF[c]}`)
    .join('\n');
  const recent = recentTopics.length ? recentTopics.slice(-30).join(', ') : '(none yet)';
  const name = cousinName.trim() || 'a future BCS cadre';

  return `You are "Magistrate Meow", a witty, slightly dramatic, yet deeply supportive cat in black-rimmed glasses and a judge's collar, helping ${name} prepare for the Bangladesh Civil Service (BCS) Preliminary exam.

Generate a JSON array of exactly ${total} unique speech-bubble items:
${lines}

Rules:
- GK items: one crisp, exam-style fact each, in English. Only state facts that are well established in standard BCS references. Never guess a number, date, or ranking; if you are not certain, choose a different fact. Avoid volatile figures (GDP, population estimates, current office-holders).
- Every GK item must include "quiz": one multiple-choice question on that exact fact, with exactly 4 distinct "options" and the 0-based "answerIndex" of the correct option. Distractors must be plausible but clearly wrong.
- MOTIVATION items must not include "quiz".
- "topicTag": a short label for the fact's topic, e.g. "Constitution Art. 7" or "Strait of Malacca".
- Do NOT repeat these recent topics: ${recent}.
- Keep every "text" under 200 characters so it fits cleanly inside a mobile speech bubble.
- "petMood": "nerd" for GK facts, "sassy" for funny roasts, "excited" or "proud" for warm encouragement.`;
}

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      category: { type: 'STRING', enum: [...MESSAGE_CATEGORIES] },
      topicTag: { type: 'STRING' },
      text: { type: 'STRING' },
      petMood: { type: 'STRING', enum: [...PET_MOODS] },
      quiz: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          answerIndex: { type: 'INTEGER' },
        },
        required: ['question', 'options', 'answerIndex'],
      },
    },
    required: ['category', 'topicTag', 'text', 'petMood'],
  },
} as const;

export async function fetchMagistrateBatch(req: BatchRequest): Promise<PetMessage[]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    req.model.trim() || DEFAULT_GEMINI_MODEL,
  )}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Header instead of ?key= so the key never lands in URL logs.
        'x-goog-api-key': req.apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(req) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.9,
        },
      }),
      signal: controller.signal,
    });
  } catch {
    throw new GeminiError('network', 'Could not reach Gemini. Using the offline pack for now.');
  } finally {
    clearTimeout(timeout);
  }

  const data: any = await response.json().catch(() => null);

  if (!response.ok) {
    throw classifyHttpError(response.status, data?.error?.message);
  }

  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const rawJson = parts
    .filter((p) => typeof p?.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('');
  if (!rawJson) {
    const reason = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason;
    throw new GeminiError('bad_response', `Gemini returned no content${reason ? ` (${reason})` : ''}.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new GeminiError('bad_response', 'Gemini returned malformed JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new GeminiError('bad_response', 'Gemini returned an unexpected shape.');
  }

  const now = Date.now();
  const items = parsed
    .map((raw, i) => toPetMessage(raw, now + i))
    .filter((m): m is PetMessage => m !== null);
  if (items.length === 0) {
    throw new GeminiError('bad_response', 'Gemini returned no usable items.');
  }
  return items;
}

function classifyHttpError(status: number, message?: string): GeminiError {
  const detail = message ? ` ${message}` : '';
  if (status === 400 && /api key/i.test(message ?? '')) {
    return new GeminiError('auth', 'Gemini rejected the API key. Check it in Settings.');
  }
  if (status === 401 || status === 403) {
    return new GeminiError('auth', `Gemini denied access (${status}).${detail}`);
  }
  if (status === 404) {
    return new GeminiError('model', `Model not found. Try "${DEFAULT_GEMINI_MODEL}" in Settings.${detail}`);
  }
  if (status === 429) {
    return new GeminiError('quota', 'Gemini quota reached. The offline pack takes over until it resets.');
  }
  if (status >= 500) {
    return new GeminiError('server', `Gemini is having trouble (${status}). Will retry later.`);
  }
  return new GeminiError('bad_response', `Gemini request failed (${status}).${detail}`);
}

const DEFAULT_MOOD: Record<MessageCategory, PetMood> = {
  GK_BD: 'nerd',
  GK_INTL: 'nerd',
  MOTIVATION_FUNNY: 'sassy',
  MOTIVATION_WARM: 'excited',
};

function toPetMessage(raw: any, createdAt: number): PetMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const category = raw.category as MessageCategory;
  if (!MESSAGE_CATEGORIES.includes(category)) return null;

  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text || text.length > MAX_TEXT_LENGTH) return null;

  const topicTag = typeof raw.topicTag === 'string' && raw.topicTag.trim() ? raw.topicTag.trim() : category;
  const petMood: PetMood = PET_MOODS.includes(raw.petMood) ? raw.petMood : DEFAULT_MOOD[category];

  const message: PetMessage = {
    id: makeId('gm'),
    category,
    topicTag,
    text,
    petMood,
    createdAt,
    source: 'gemini',
  };
  if (isGkMessage(message)) {
    const quiz = toQuiz(raw.quiz);
    if (quiz) message.quiz = quiz;
  }
  return message;
}

function toQuiz(raw: any): QuizItem | undefined {
  if (!raw || typeof raw.question !== 'string' || !raw.question.trim()) return undefined;
  if (!Array.isArray(raw.options) || raw.options.length !== 4) return undefined;
  const options = raw.options.map((o: unknown) => (typeof o === 'string' ? o.trim() : ''));
  if (options.some((o: string) => !o) || new Set(options).size !== 4) return undefined;
  const answerIndex = raw.answerIndex;
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) return undefined;
  return { question: raw.question.trim(), options, answerIndex };
}
