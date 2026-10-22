import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { isDndPermissionGranted } from '../services/nativeLockdown';

/** Re-checks when the app returns from the system DND access screen. */
export function useDndPermission(): boolean {
  const [granted, setGranted] = useState(isDndPermissionGranted);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setGranted(isDndPermissionGranted());
    });
    return () => sub.remove();
  }, []);

  return granted;
}
