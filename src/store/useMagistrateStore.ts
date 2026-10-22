import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { loadApiKey, saveApiKey } from '../services/apiKeyStore';
import { pickFallbackMessage } from '../services/fallbackPack';
import {
  DEFAULT_GEMINI_MODEL,
  GeminiError,
  fetchMagistrateBatch,
  type GeminiErrorKind,
} from '../services/geminiService';
import { startLockdown, stopLockdown } from '../services/nativeLockdown';
import { zustandStorage } from '../services/storage';
import {
  isGkMessage,
  matchesFilter,
  type ActiveSession,
  type GKFilter,
  type PetMessage,
  type SavedFact,
  type SessionSummary,
} from '../types';
import { dayKey, makeId, normalizeTag, shuffle } from '../utils/format';

export type { GKFilter, PetMessage, PetMood, MessageCategory } from '../types';

const LOW_WATER_MARK = 10;
const MAX_QUEUE = 120;
const MAX_RECENT_TAGS = 40;
const MAX_SHOWN_PER_SESSION = 60;
const STUDY_LOG_DAYS = 30;

const RETRY_AFTER_MS: Record<GeminiErrorKind, number> = {
  auth: 10 * 60_000,
  model: 10 * 60_000,
  quota: 15 * 60_000,
  network: 2 * 60_000,
  server: 5 * 60_000,
  bad_response: 2 * 60_000,
};

export interface Preferences {
  cousinName: string;
  geminiModel: string;
  selectedDurationMins: number;
  gkFilter: GKFilter;
  /** 0 = Tap Only. */
  bubbleIntervalMins: number;
}

export interface MagistrateState extends Preferences {
  /** Held in memory only; persisted through SecureStore, never MMKV. */
  apiKey: string;

  // Active session runtime (persisted so a killed process can resume or clean up)
  session: ActiveSession | null;
  currentMessage: PetMessage | null;
  dndActive: boolean;

  // Persistent offline storage (MMKV)
  messageQueue: PetMessage[];
  savedFacts: SavedFact[];
  /** Prevents duplicate GK topics across Gemini calls. */
  recentTopicTags: string[];
  seenFallbackIds: string[];
  /** Minutes studied per local day, e.g. { "2026-10-22": 135 }. */
  studyLog: Record<string, number>;

  // Transient status
  isFetching: boolean;
  lastFetchError: string | null;
  nextFetchAllowedAt: number;
  lastSessionSummary: SessionSummary | null;

  // Actions
  bootstrap: () => Promise<void>;
  updatePreferences: (patch: Partial<Preferences>) => void;
  setApiKey: (apiKey: string) => Promise<void>;
  startSession: () => Promise<void>;
  reengageLockdown: () => Promise<void>;
  endSession: (completed: boolean) => Promise<void>;
  popNextMessage: () => void;
  showLocalMessage: (message: Pick<PetMessage, 'category' | 'text' | 'petMood'>) => void;
  bookmarkCurrentFact: () => void;
  removeSavedFact: (id: string) => void;
  replenishQueueIfLow: (force?: boolean) => Promise<void>;
  dismissSessionSummary: () => void;
}

let inflightFetch: Promise<void> | null = null;
let endingSession = false;

export const useMagistrateStore = create<MagistrateState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      cousinName: '',
      geminiModel: DEFAULT_GEMINI_MODEL,
      selectedDurationMins: 45,
      gkFilter: 'BOTH',
      bubbleIntervalMins: 5,

      session: null,
      currentMessage: null,
      dndActive: false,

      messageQueue: [],
      savedFacts: [],
      recentTopicTags: [],
      seenFallbackIds: [],
      studyLog: {},

      isFetching: false,
      lastFetchError: null,
      nextFetchAllowedAt: 0,
      lastSessionSummary: null,

      bootstrap: async () => {
        set({ apiKey: await loadApiKey() });

        const { session } = get();
        if (session) {
          // The process died mid-session: finish it if time ran out, otherwise re-pin and re-silence.
          if (Date.now() >= session.endsAt) {
            await get().endSession(true);
          } else {
            await get().reengageLockdown();
          }
        }
        void get().replenishQueueIfLow();
      },

      updatePreferences: (patch) => {
        set(patch);
        if (patch.gkFilter || patch.geminiModel) {
          set({ nextFetchAllowedAt: 0 });
          void get().replenishQueueIfLow();
        }
      },

      setApiKey: async (apiKey) => {
        const trimmed = apiKey.trim();
        await saveApiKey(trimmed);
        set({ apiKey: trimmed, lastFetchError: null, nextFetchAllowedAt: 0 });
        if (trimmed) await get().replenishQueueIfLow(true);
      },

      startSession: async () => {
        if (get().session) return;
        const now = Date.now();
        const durationMins = get().selectedDurationMins;
        // Persist the session before touching native state, so a crash in between is recoverable.
        set({
          session: { startedAt: now, endsAt: now + durationMins * 60_000, durationMins, shownMessages: [] },
          currentMessage: null,
          lastSessionSummary: null,
        });
        get().popNextMessage();
        await get().reengageLockdown();
      },

      reengageLockdown: async () => {
        const status = await startLockdown();
        set({ dndActive: status.dndActive });
      },

      endSession: async (completed) => {
        const session = get().session;
        if (!session || endingSession) return;
        endingSession = true;
        try {
          // Restore the phone before clearing the session: if we die here, the next launch retries.
          await stopLockdown();

          const now = Date.now();
          const minutesStudied = completed
            ? session.durationMins
            : Math.floor((Math.min(now, session.endsAt) - session.startedAt) / 60_000);
          const today = dayKey();

          set((state) => ({
            session: null,
            currentMessage: null,
            dndActive: false,
            studyLog: pruneStudyLog({
              ...state.studyLog,
              [today]: (state.studyLog[today] ?? 0) + minutesStudied,
            }),
            lastSessionSummary: {
              completed,
              minutesStudied,
              durationMins: session.durationMins,
              factsShown: session.shownMessages.filter(isGkMessage).length,
              quizPool: session.shownMessages.filter((m) => isGkMessage(m) && m.quiz),
              endedAt: now,
            },
          }));
        } finally {
          endingSession = false;
        }
      },

      popNextMessage: () => {
        const { messageQueue, gkFilter, seenFallbackIds, recentTopicTags, session } = get();

        let next: PetMessage;
        let queue = messageQueue;
        let seen = seenFallbackIds;
        const idx = messageQueue.findIndex((m) => matchesFilter(m, gkFilter));
        if (idx >= 0) {
          next = messageQueue[idx];
          queue = [...messageQueue.slice(0, idx), ...messageQueue.slice(idx + 1)];
        } else {
          // Offline or no key: the bundled pack keeps the bubbles coming.
          const pick = pickFallbackMessage(gkFilter, seenFallbackIds);
          next = pick.message;
          seen = pick.seenIds;
        }

        set({
          currentMessage: next,
          messageQueue: queue,
          seenFallbackIds: seen,
          recentTopicTags: isGkMessage(next)
            ? [...recentTopicTags.filter((t) => t !== next.topicTag), next.topicTag].slice(-MAX_RECENT_TAGS)
            : recentTopicTags,
          session: session
            ? { ...session, shownMessages: [...session.shownMessages, next].slice(-MAX_SHOWN_PER_SESSION) }
            : session,
        });
        void get().replenishQueueIfLow();
      },

      showLocalMessage: ({ category, text, petMood }) => {
        set({
          currentMessage: {
            id: makeId('local'),
            category,
            topicTag: 'local',
            text,
            petMood,
            createdAt: Date.now(),
            source: 'local',
          },
        });
      },

      bookmarkCurrentFact: () => {
        const { currentMessage, savedFacts } = get();
        if (!currentMessage || !isGkMessage(currentMessage)) return;
        if (savedFacts.some((f) => f.id === currentMessage.id)) return;
        set({ savedFacts: [{ ...currentMessage, savedAt: Date.now() }, ...savedFacts] });
      },

      removeSavedFact: (id) => {
        set((state) => ({ savedFacts: state.savedFacts.filter((f) => f.id !== id) }));
      },

      replenishQueueIfLow: (force = false) => {
        if (inflightFetch) return inflightFetch;

        const { apiKey, messageQueue, gkFilter, nextFetchAllowedAt } = get();
        if (!apiKey) return Promise.resolve();
        if (!force) {
          if (Date.now() < nextFetchAllowedAt) return Promise.resolve();
          const ready = messageQueue.filter((m) => matchesFilter(m, gkFilter)).length;
          if (ready >= LOW_WATER_MARK) return Promise.resolve();
        }

        inflightFetch = (async () => {
          set({ isFetching: true });
          try {
            const { cousinName, geminiModel, recentTopicTags } = get();
            const batch = await fetchMagistrateBatch({
              apiKey,
              model: geminiModel,
              cousinName,
              gkFilter,
              recentTopics: recentTopicTags,
            });
            set((state) => {
              const known = new Set(
                [...state.recentTopicTags, ...state.messageQueue.map((m) => m.topicTag)].map(normalizeTag),
              );
              const fresh = batch.filter((m) => !isGkMessage(m) || !known.has(normalizeTag(m.topicTag)));
              return {
                messageQueue: [...state.messageQueue, ...shuffle(fresh)].slice(-MAX_QUEUE),
                lastFetchError: null,
                nextFetchAllowedAt: 0,
              };
            });
          } catch (e) {
            const kind: GeminiErrorKind = e instanceof GeminiError ? e.kind : 'bad_response';
            set({
              lastFetchError: e instanceof Error ? e.message : 'Gemini request failed.',
              nextFetchAllowedAt: Date.now() + RETRY_AFTER_MS[kind],
            });
          } finally {
            set({ isFetching: false });
            inflightFetch = null;
          }
        })();
        return inflightFetch;
      },

      dismissSessionSummary: () => set({ lastSessionSummary: null }),
    }),
    {
      name: 'magistrate-store',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        cousinName: s.cousinName,
        geminiModel: s.geminiModel,
        selectedDurationMins: s.selectedDurationMins,
        gkFilter: s.gkFilter,
        bubbleIntervalMins: s.bubbleIntervalMins,
        session: s.session,
        currentMessage: s.currentMessage,
        messageQueue: s.messageQueue,
        savedFacts: s.savedFacts,
        recentTopicTags: s.recentTopicTags,
        seenFallbackIds: s.seenFallbackIds,
        studyLog: s.studyLog,
      }),
    },
  ),
);

function pruneStudyLog(log: Record<string, number>): Record<string, number> {
  const keys = Object.keys(log).sort().slice(-STUDY_LOG_DAYS);
  return Object.fromEntries(keys.map((k) => [k, log[k]]));
}

export const selectStudyMinutesToday = (s: MagistrateState) => s.studyLog[dayKey()] ?? 0;

export const selectReadyCount = (s: MagistrateState) =>
  s.messageQueue.filter((m) => matchesFilter(m, s.gkFilter)).length;
