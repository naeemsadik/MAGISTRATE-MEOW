import Lockdown, { type LockTaskState } from '../../modules/lockdown';

export type { LockTaskState };

export interface LockdownStatus {
  dndActive: boolean;
}

/** False on web / Expo Go, where the session still runs but nothing is pinned or silenced. */
export const isLockdownAvailable = Lockdown != null;

export function isDndPermissionGranted(): boolean {
  try {
    return Lockdown?.isDndPermissionGranted() ?? false;
  } catch {
    return false;
  }
}

export function openDndPermissionSettings(): void {
  Lockdown?.openDndPermissionSettings();
}

export function getLockTaskState(): LockTaskState {
  try {
    return Lockdown?.getLockTaskState() ?? 'none';
  } catch {
    return 'none';
  }
}

/** Pins the screen (system shows a confirm prompt) and applies Call-Only DND. Safe to call repeatedly. */
export async function startLockdown(): Promise<LockdownStatus> {
  if (!Lockdown) return { dndActive: false };
  try {
    const result = await Lockdown.startLockdown();
    return { dndActive: result.dndActive };
  } catch {
    return { dndActive: false };
  }
}

/** Unpins and restores the user's previous DND state. Safe to call when nothing is active. */
export async function stopLockdown(): Promise<void> {
  if (!Lockdown) return;
  try {
    await Lockdown.stopLockdown();
  } catch {
    // Teardown must never block ending a session.
  }
}
