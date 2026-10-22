import pack from '../assets/fallback_bcs_pack.json';
import { isGkMessage, matchesFilter, type GKFilter, type PetMessage } from '../types';

type FallbackItem = Omit<PetMessage, 'createdAt' | 'source'>;

const ITEMS = pack.items as unknown as FallbackItem[];
const MOTIVATION_SHARE = 0.3;

export const FALLBACK_PACK_SIZE = ITEMS.length;

/**
 * Picks an unseen bundled item for the filter. Once every item in a pool has been shown,
 * that pool's ids are dropped from `seenIds` so the cycle restarts.
 */
export function pickFallbackMessage(
  filter: GKFilter,
  seenIds: string[],
): { message: PetMessage; seenIds: string[] } {
  const wantMotivation = Math.random() < MOTIVATION_SHARE;
  const pool = ITEMS.filter((i) => matchesFilter(i, filter) && isGkMessage(i) !== wantMotivation);

  const seen = new Set(seenIds);
  let candidates = pool.filter((i) => !seen.has(i.id));
  let nextSeen = seenIds;
  if (candidates.length === 0) {
    const poolIds = new Set(pool.map((i) => i.id));
    nextSeen = seenIds.filter((id) => !poolIds.has(id));
    candidates = pool;
  }

  const item = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    message: { ...item, createdAt: Date.now(), source: 'fallback' },
    seenIds: [...nextSeen, item.id],
  };
}
