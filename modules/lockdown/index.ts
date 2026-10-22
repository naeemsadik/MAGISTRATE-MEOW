import { requireOptionalNativeModule } from 'expo';

export type LockTaskState = 'none' | 'pinned' | 'locked';

export interface StartLockdownResult {
  pinRequested: boolean;
  dndActive: boolean;
}

interface LockdownNativeModule {
  isDndPermissionGranted(): boolean;
  openDndPermissionSettings(): void;
  getLockTaskState(): LockTaskState;
  startLockdown(): Promise<StartLockdownResult>;
  stopLockdown(): Promise<void>;
}

// Null on web, Expo Go, or iOS: callers degrade to an unpinned, notification-normal session.
export default requireOptionalNativeModule<LockdownNativeModule>('Lockdown');
