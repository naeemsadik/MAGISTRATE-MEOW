import { Platform } from 'react-native';

import type { MessageCategory } from './types';

export const colors = {
  bg: '#0B0F17',
  surface: '#161F30',
  surfaceRaised: '#1E2A40',
  border: '#26324A',
  gold: '#F59E0B',
  goldDim: '#B45309',
  emerald: '#10B981',
  danger: '#F43F5E',
  text: '#F8FAFC',
  muted: '#94A3B8',
  faint: '#64748B',
} as const;

export const fonts = {
  mono: Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' }),
} as const;

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const categoryLabel: Record<MessageCategory, string> = {
  GK_BD: '🇧🇩 BD GK',
  GK_INTL: '🌍 INTL GK',
  MOTIVATION_FUNNY: '😼 ORDER IN THE COURT',
  MOTIVATION_WARM: '😼 ORDER IN THE COURT',
};

export const categoryAccent: Record<MessageCategory, string> = {
  GK_BD: colors.emerald,
  GK_INTL: '#38BDF8',
  MOTIVATION_FUNNY: colors.gold,
  MOTIVATION_WARM: colors.gold,
};
