/** Local-time calendar key, e.g. "2026-10-22". */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 2712 → "45:12"; minutes are not wrapped into hours so a 90m block reads "90:00". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** 45 → "45 min", 210 → "3.5 hrs". */
export function formatStudyTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.round((minutes / 60) * 10) / 10;
  return `${hrs} hr${hrs === 1 ? '' : 's'}`;
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function normalizeTag(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
